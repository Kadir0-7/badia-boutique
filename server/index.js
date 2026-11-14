require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { seedIfEmpty } = require("./seed");
const { loadUser } = require("./auth");
const { DIR: UPLOAD_DIR } = require("./uploads");
const orders = require("./routes/orders");
const payments = require("./payments");

seedIfEmpty();

const PROD = process.env.NODE_ENV === "production";
const app = express();
app.set("trust proxy", 1); // the host's HTTPS proxy tells us the original protocol
app.disable("x-powered-by");

// Production: only ever serve over HTTPS. Set FORCE_HTTPS=false only if your
// host already redirects HTTP to HTTPS itself and this causes a loop.
if (PROD && process.env.FORCE_HTTPS !== "false") {
  app.use((req, res, next) => req.secure ? next() : res.redirect(301, "https://" + req.get("host") + req.originalUrl));
}

// Security headers. The Content Security Policy means the browser will only run
// scripts from this site, so injected code can't run even if some got in.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],   // blob: = photo previews on the Sell form
      connectSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],             // nobody can embed the site in a frame
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      ...(PROD ? { upgradeInsecureRequests: [] } : {})
    }
  },
  strictTransportSecurity: PROD ? { maxAge: 31536000, includeSubDomains: true } : false,
  referrerPolicy: { policy: "same-origin" }
}));

// Stripe needs the raw body to verify signatures, so this goes before express.json.
app.post("/api/stripe/webhook", ...orders.webhook);

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use("/api", rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false,
  message: { error: "Slow down a little and try again." } }));
app.use("/api", loadUser);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/listings", require("./routes/listings"));
app.use("/api/me", require("./routes/me"));
app.use("/api/users", require("./routes/users"));
app.use("/api/conversations", require("./routes/messages"));
app.use("/api/orders", orders);
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "30d", immutable: true }), (_req, res) => res.status(404).end());

// Production: serve the built React app and let React Router handle page URLs.
const dist = path.join(__dirname, "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false }));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

// One place that turns every error into JSON. No stack traces leave the server.
app.use((err, _req, res, _next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message;
  if (err.code === "LIMIT_FILE_SIZE") { status = 400; message = "Each photo must be under 5 MB"; }
  else if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") { status = 400; message = "Up to 6 photos per listing"; }
  else if (err.type === "entity.parse.failed") { status = 400; message = "Request body isn't valid JSON"; }
  if (status >= 500) { console.error(err); message = "Something went wrong on our side"; }
  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Badia Boutique API on http://localhost:${PORT}`);
  console.log(payments.enabled ? "Payments: Stripe Checkout" : "Payments: TEST MODE (set STRIPE_SECRET_KEY for real payments)");
  const demos = require("./db").db.prepare("SELECT COUNT(*) n FROM users WHERE id LIKE 'demo-%' AND passwordHash<>'!'").get().n;
  if (PROD && demos) console.warn(`WARNING: ${demos} demo accounts exist. They can't sign in, but run "npm run remove-demo" to delete them.`);
  if (PROD && !payments.enabled) console.warn("WARNING: production is running in payment TEST MODE. Orders are marked paid without charging anyone.");
});
