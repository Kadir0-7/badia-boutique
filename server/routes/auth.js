const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { db } = require("../db");
const { hashPassword, checkPassword, createSession, destroySession, requireUser } = require("../auth");
const { id, now, str, fail, wrap } = require("../util");

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many attempts. Try again in a few minutes." } });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE = /^[a-z0-9._]{3,24}$/i;
// Returned only to the signed-in user themselves; gender is never shown publicly.
const publicUser = u => ({ id: u.id, email: u.email, handle: u.handle, bio: u.bio, gender: u.gender || null, createdAt: u.createdAt });

router.post("/signup", limiter, wrap(async (req, res) => {
  const b = req.body || {};
  const email = str(b.email, 200, { required: true, name: "Email" }).toLowerCase();
  const handle = str(b.handle, 24, { required: true, name: "Username" }).replace(/^@/, "");
  const password = typeof b.password === "string" ? b.password : "";
  if (!EMAIL.test(email)) fail(400, "Enter a valid email address");
  if (!HANDLE.test(handle)) fail(400, "Username must be 3-24 letters, numbers, dots or underscores");
  if (password.length < 8 || password.length > 200) fail(400, "Password must be at least 8 characters");
  const gender = b.gender;
  if (!["male", "female"].includes(gender)) fail(400, "Please choose male or female");
  if (b.acceptedTerms !== true) fail(400, "Please tick the box to confirm you’ll only list modest clothing");
  if (db.prepare("SELECT 1 FROM users WHERE email=?").get(email)) fail(409, "An account with that email already exists");
  if (db.prepare("SELECT 1 FROM users WHERE handle=?").get(handle)) fail(409, "That username is taken");

  const user = { id: id(), email, handle, passwordHash: await hashPassword(password), bio: "", gender, acceptedTermsAt: now(), createdAt: now() };
  db.prepare(`INSERT INTO users(id,email,handle,passwordHash,bio,gender,acceptedTermsAt,createdAt)
    VALUES(@id,@email,@handle,@passwordHash,@bio,@gender,@acceptedTermsAt,@createdAt)`).run(user);
  createSession(res, user.id);
  res.status(201).json({ user: publicUser(user) });
}));

router.post("/login", limiter, wrap(async (req, res) => {
  const b = req.body || {};
  const email = str(b.email, 200).toLowerCase();
  const password = typeof b.password === "string" ? b.password : "";
  const user = db.prepare("SELECT * FROM users WHERE email=?").get(email);
  if (!user || !(await checkPassword(password, user.passwordHash))) fail(401, "Wrong email or password");
  // Demo sellers share a password that's published in the README, so they can
  // never sign in on the live site.
  if (process.env.NODE_ENV === "production" && user.id.startsWith("demo-")) fail(401, "Wrong email or password");
  createSession(res, user.id);
  res.json({ user: publicUser(user) });
}));

router.post("/logout", (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});

router.get("/me", (req, res) => res.json({ user: req.user ? publicUser(req.user) : null }));

router.patch("/me", requireUser, (req, res) => {
  const bio = str((req.body || {}).bio, 300, { name: "Bio" });
  db.prepare("UPDATE users SET bio=? WHERE id=?").run(bio, req.user.id);
  res.json({ user: publicUser({ ...req.user, bio }) });
});

module.exports = router;
