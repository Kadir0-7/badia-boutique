const express = require("express");
const router = express.Router();
const { db } = require("../db");
const { requireUser } = require("../auth");
const { getListing } = require("../listings");
const payments = require("../payments");
const { id, now, str, fail, wrap } = require("../util");

const HOLD_MS = 30 * 60 * 1000; // an unpaid checkout holds the item for 30 minutes

// ----- state changes (each one is a single transaction) -----
const markPaid = db.transaction(orderId => {
  const o = db.prepare("SELECT * FROM orders WHERE id=?").get(orderId);
  if (!o || o.status !== "pending_payment") return false;
  db.prepare("UPDATE orders SET status='paid', updatedAt=? WHERE id=?").run(now(), o.id);
  db.prepare("UPDATE listings SET status='sold', updatedAt=? WHERE id=?").run(now(), o.listingId);
  return true;
});

const cancelOrder = db.transaction(orderId => {
  const o = db.prepare("SELECT * FROM orders WHERE id=?").get(orderId);
  if (!o || o.status !== "pending_payment") return false;
  db.prepare("UPDATE orders SET status='cancelled', updatedAt=? WHERE id=?").run(now(), o.id);
  db.prepare("UPDATE listings SET status='active', updatedAt=? WHERE id=? AND status='reserved'").run(now(), o.listingId);
  return true;
});

function releaseExpired() {
  const stale = db.prepare("SELECT id FROM orders WHERE status='pending_payment' AND createdAt<?").all(now() - HOLD_MS);
  stale.forEach(o => cancelOrder(o.id));
}
setInterval(releaseExpired, 60 * 1000).unref();

const reserve = db.transaction((listingId, buyer, shipping) => {
  const l = getListing(listingId);
  if (!l) fail(404, "Listing not found");
  if (l.sellerId === buyer.id) fail(400, "You can't buy your own listing");
  if (l.status !== "active") fail(409, l.status === "sold" ? "Sorry, this item has sold" : "Someone is checking out with this item right now");
  const order = { id: id(), listingId: l.id, buyerId: buyer.id, sellerId: l.sellerId, title: l.title, price: l.price,
    shipping: JSON.stringify(shipping), status: "pending_payment", createdAt: now(), updatedAt: now() };
  db.prepare(`INSERT INTO orders(id,listingId,buyerId,sellerId,title,price,shipping,status,createdAt,updatedAt)
    VALUES(@id,@listingId,@buyerId,@sellerId,@title,@price,@shipping,@status,@createdAt,@updatedAt)`).run(order);
  db.prepare("UPDATE listings SET status='reserved', updatedAt=? WHERE id=?").run(now(), l.id);
  return order;
});

// ----- Stripe webhook (mounted before express.json in index.js) -----
const webhook = [express.raw({ type: "application/json" }), (req, res) => {
  if (!payments.enabled || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(404).end();
  let event;
  try { event = payments.verifyWebhook(req.body, req.get("stripe-signature")); }
  catch { return res.status(400).send("Bad signature"); }
  const orderId = event.data?.object?.metadata?.orderId;
  if (orderId && event.type === "checkout.session.completed" && event.data.object.payment_status === "paid") markPaid(orderId);
  if (orderId && event.type === "checkout.session.expired") cancelOrder(orderId);
  res.json({ received: true });
}];

// ----- buyer & seller routes -----
router.use(requireUser);

function shapeOrder(o, uid) {
  const isSeller = o.sellerId === uid;
  const shipping = JSON.parse(o.shipping);
  return {
    id: o.id, listingId: o.listingId, title: o.title, price: o.price, status: o.status, tracking: o.tracking,
    createdAt: o.createdAt, updatedAt: o.updatedAt, role: isSeller ? "seller" : "buyer",
    buyerHandle: o.buyerHandle, sellerHandle: o.sellerHandle, photo: o.photos ? JSON.parse(o.photos)[0] || null : null,
    // The seller only sees the address once the buyer has paid.
    shipping: !isSeller || o.status !== "pending_payment" ? shipping : null,
    review: o.rating ? { rating: o.rating, text: o.reviewText } : null
  };
}

const ORDER = `SELECT o.*, b.handle AS buyerHandle, s.handle AS sellerHandle, l.photos, r.rating, r.text AS reviewText
  FROM orders o JOIN users b ON b.id=o.buyerId JOIN users s ON s.id=o.sellerId
  LEFT JOIN listings l ON l.id=o.listingId LEFT JOIN reviews r ON r.orderId=o.id`;

function myOrder(req) {
  const o = db.prepare(ORDER + " WHERE o.id=?").get(req.params.id);
  if (!o || (o.buyerId !== req.user.id && o.sellerId !== req.user.id)) fail(404, "Order not found");
  return o;
}

router.get("/config", (_req, res) => res.json({ stripe: payments.enabled }));

router.get("/", (req, res) => {
  const col = req.query.role === "selling" ? "o.sellerId" : "o.buyerId";
  const rows = db.prepare(`${ORDER} WHERE ${col}=? ORDER BY o.createdAt DESC`).all(req.user.id);
  res.json({ items: rows.map(o => shapeOrder(o, req.user.id)) });
});

router.get("/:id", (req, res) => res.json(shapeOrder(myOrder(req), req.user.id)));

router.post("/", wrap(async (req, res) => {
  releaseExpired();
  const b = req.body || {}, s = b.shipping || {};
  const shipping = {
    name: str(s.name, 80, { required: true, name: "Name" }),
    line1: str(s.line1, 120, { required: true, name: "Address" }),
    line2: str(s.line2, 120),
    city: str(s.city, 60, { required: true, name: "City" }),
    postcode: str(s.postcode, 20, { required: true, name: "Postcode" }),
    country: str(s.country, 60, { required: true, name: "Country" })
  };
  const order = reserve(String(b.listingId || ""), req.user, shipping);

  if (!payments.enabled) {
    markPaid(order.id);
    return res.status(201).json({ orderId: order.id, testMode: true });
  }
  try {
    const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
    const session = await payments.createCheckout({ order, baseUrl, buyerEmail: req.user.email });
    db.prepare("UPDATE orders SET stripeSessionId=? WHERE id=?").run(session.id, order.id);
    res.status(201).json({ orderId: order.id, checkoutUrl: session.url });
  } catch (e) {
    cancelOrder(order.id);
    throw e;
  }
}));

// Called by the order page after Stripe redirects back, so payment shows up
// even if the webhook hasn't arrived yet (or isn't configured locally).
router.post("/:id/confirm", wrap(async (req, res) => {
  const o = myOrder(req);
  if (o.status === "pending_payment" && payments.enabled && o.stripeSessionId) {
    const session = await payments.retrieve(o.stripeSessionId);
    if (session.payment_status === "paid") markPaid(o.id);
  }
  res.json(shapeOrder(myOrder(req), req.user.id));
}));

router.post("/:id/cancel", (req, res) => {
  const o = myOrder(req);
  if (o.buyerId !== req.user.id) fail(403, "Only the buyer can cancel a checkout");
  if (!cancelOrder(o.id)) fail(409, "Only unpaid orders can be cancelled here. Message the seller about paid orders.");
  res.json(shapeOrder(myOrder(req), req.user.id));
});

router.post("/:id/ship", (req, res) => {
  const o = myOrder(req);
  if (o.sellerId !== req.user.id) fail(403, "Only the seller can mark this shipped");
  if (o.status !== "paid") fail(409, "This order isn't waiting to be shipped");
  const tracking = str((req.body || {}).tracking, 80, { name: "Tracking number" });
  db.prepare("UPDATE orders SET status='shipped', tracking=?, updatedAt=? WHERE id=?").run(tracking, now(), o.id);
  res.json(shapeOrder(myOrder(req), req.user.id));
});

router.post("/:id/received", (req, res) => {
  const o = myOrder(req);
  if (o.buyerId !== req.user.id) fail(403, "Only the buyer can confirm delivery");
  if (o.status !== "shipped") fail(409, "This order hasn't been shipped yet");
  db.prepare("UPDATE orders SET status='delivered', updatedAt=? WHERE id=?").run(now(), o.id);
  res.json(shapeOrder(myOrder(req), req.user.id));
});

router.post("/:id/review", (req, res) => {
  const o = myOrder(req);
  if (o.buyerId !== req.user.id) fail(403, "Only the buyer can leave a review");
  if (o.status !== "delivered") fail(409, "You can review once the item has arrived");
  if (o.rating) fail(409, "You've already reviewed this order");
  const b = req.body || {};
  const rating = parseInt(b.rating);
  if (!(rating >= 1 && rating <= 5)) fail(400, "Rating must be 1 to 5 stars");
  db.prepare("INSERT INTO reviews(id,orderId,reviewerId,sellerId,rating,text,createdAt) VALUES(?,?,?,?,?,?,?)")
    .run(id(), o.id, req.user.id, o.sellerId, rating, str(b.text, 500, { name: "Review" }), now());
  res.json(shapeOrder(myOrder(req), req.user.id));
});

module.exports = router;
module.exports.webhook = webhook;
