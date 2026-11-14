const router = require("express").Router();
const { db } = require("../db");
const { requireUser } = require("../auth");
const { getListing } = require("../listings");
const { id, now, str, fail } = require("../util");

router.use(requireUser);

const CONV = `SELECT c.*, b.handle AS buyerHandle, s.handle AS sellerHandle, l.photos, l.price, l.status AS listingStatus,
  (SELECT body FROM messages m WHERE m.conversationId=c.id ORDER BY createdAt DESC LIMIT 1) AS lastBody,
  (SELECT senderId FROM messages m WHERE m.conversationId=c.id ORDER BY createdAt DESC LIMIT 1) AS lastSender
  FROM conversations c JOIN users b ON b.id=c.buyerId JOIN users s ON s.id=c.sellerId
  LEFT JOIN listings l ON l.id=c.listingId`;

function shapeConv(c, uid) {
  const iAmBuyer = c.buyerId === uid;
  return {
    id: c.id, listingId: c.listingId, listingTitle: c.listingTitle, listingStatus: c.listingStatus,
    price: c.price, photo: c.photos ? JSON.parse(c.photos)[0] || null : null,
    otherHandle: iAmBuyer ? c.sellerHandle : c.buyerHandle, role: iAmBuyer ? "buyer" : "seller",
    lastBody: c.lastBody, lastAt: c.lastAt, lastFromMe: c.lastSender === uid,
    unread: c.lastAt > (iAmBuyer ? c.buyerReadAt : c.sellerReadAt) && c.lastSender !== uid
  };
}

function myConversation(req) {
  const c = db.prepare(CONV + " WHERE c.id=?").get(req.params.id);
  if (!c || (c.buyerId !== req.user.id && c.sellerId !== req.user.id)) fail(404, "Conversation not found");
  return c;
}

function addMessage(convId, senderId, body) {
  const t = now();
  db.prepare("INSERT INTO messages(id,conversationId,senderId,body,createdAt) VALUES(?,?,?,?,?)").run(id(), convId, senderId, body, t);
  db.prepare("UPDATE conversations SET lastAt=? WHERE id=?").run(t, convId);
}

router.get("/", (req, res) => {
  const rows = db.prepare(CONV + " WHERE c.buyerId=? OR c.sellerId=? ORDER BY c.lastAt DESC").all(req.user.id, req.user.id);
  res.json({ items: rows.map(c => shapeConv(c, req.user.id)) });
});

router.get("/unread", (req, res) => {
  const rows = db.prepare(CONV + " WHERE c.buyerId=? OR c.sellerId=?").all(req.user.id, req.user.id);
  res.json({ count: rows.filter(c => shapeConv(c, req.user.id).unread).length });
});

// Start (or continue) a conversation about a listing.
router.post("/", (req, res) => {
  const b = req.body || {};
  const body = str(b.body, 2000, { required: true, name: "Message" });
  const l = getListing(b.listingId);
  if (!l) fail(404, "Listing not found");
  if (l.sellerId === req.user.id) fail(400, "That's your own listing");
  let c = db.prepare("SELECT id FROM conversations WHERE listingId=? AND buyerId=?").get(l.id, req.user.id);
  if (!c) {
    c = { id: id() };
    db.prepare("INSERT INTO conversations(id,listingId,buyerId,sellerId,listingTitle,createdAt,lastAt) VALUES(?,?,?,?,?,?,?)")
      .run(c.id, l.id, req.user.id, l.sellerId, l.title, now(), now());
  }
  addMessage(c.id, req.user.id, body);
  res.status(201).json({ id: c.id });
});

router.get("/:id/messages", (req, res) => {
  const c = myConversation(req);
  const after = Number(req.query.after) || 0;
  const msgs = db.prepare(`SELECT m.id, m.body, m.createdAt, m.senderId, u.handle AS senderHandle FROM messages m
    JOIN users u ON u.id=m.senderId WHERE m.conversationId=? AND m.createdAt>? ORDER BY m.createdAt`).all(c.id, after);
  db.prepare(`UPDATE conversations SET ${c.buyerId === req.user.id ? "buyerReadAt" : "sellerReadAt"}=? WHERE id=?`).run(now(), c.id);
  res.json({ conversation: shapeConv(c, req.user.id), messages: msgs.map(m => ({ ...m, mine: m.senderId === req.user.id })) });
});

router.post("/:id/messages", (req, res) => {
  const c = myConversation(req);
  addMessage(c.id, req.user.id, str((req.body || {}).body, 2000, { required: true, name: "Message" }));
  res.status(201).json({ ok: true });
});

module.exports = router;
module.exports.addMessage = addMessage;
