const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { db } = require("./db");
const { fail, now } = require("./util");

const COOKIE = "tl_session";
const TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

const hashPassword = pw => bcrypt.hash(pw, 11);
const checkPassword = (pw, hash) => bcrypt.compare(pw, hash);

function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions(token,userId,expiresAt) VALUES(?,?,?)").run(token, userId, now() + TTL);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TTL,
    path: "/"
  });
}

function destroySession(req, res) {
  const token = req.cookies?.[COOKIE];
  if (token) db.prepare("DELETE FROM sessions WHERE token=?").run(token);
  res.clearCookie(COOKIE, { path: "/" });
}

const findSession = db.prepare(`
  SELECT u.id, u.email, u.handle, u.bio, u.gender, u.createdAt FROM sessions s
  JOIN users u ON u.id = s.userId WHERE s.token=? AND s.expiresAt>?`);

// Attaches req.user when a valid session cookie is present. Never blocks.
function loadUser(req, _res, next) {
  const token = req.cookies?.[COOKIE];
  req.user = token ? findSession.get(token, now()) || null : null;
  next();
}

// Blocks the route unless signed in.
function requireUser(req, _res, next) {
  if (!req.user) return next(Object.assign(new Error("Please sign in first"), { status: 401 }));
  next();
}

// Clears expired sessions occasionally.
setInterval(() => db.prepare("DELETE FROM sessions WHERE expiresAt<?").run(now()), 60 * 60 * 1000).unref();

module.exports = { hashPassword, checkPassword, createSession, destroySession, loadUser, requireUser, fail };
