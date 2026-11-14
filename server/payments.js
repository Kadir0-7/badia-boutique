// Stripe Checkout when STRIPE_SECRET_KEY is set; otherwise a test mode that
// marks orders as paid straight away so the full flow can be tried locally.
const key = process.env.STRIPE_SECRET_KEY;
const stripe = key ? require("stripe")(key) : null;
const enabled = !!stripe;

async function createCheckout({ order, baseUrl, buyerEmail }) {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: buyerEmail,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: (process.env.CURRENCY || "usd").toLowerCase(),
        unit_amount: Math.round(order.price * 100),
        product_data: { name: order.title }
      }
    }],
    metadata: { orderId: order.id },
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    success_url: `${baseUrl}/orders/${order.id}?paid=1`,
    cancel_url: `${baseUrl}/orders/${order.id}?cancelled=1`
  });
  return session;
}

const retrieve = sessionId => stripe.checkout.sessions.retrieve(sessionId);

function verifyWebhook(rawBody, signature) {
  return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}

module.exports = { enabled, createCheckout, retrieve, verifyWebhook };
