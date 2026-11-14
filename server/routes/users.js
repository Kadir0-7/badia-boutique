const router = require("express").Router();
const { db } = require("../db");
const { SELECT, shape, likedSet } = require("../listings");
const { fail } = require("../util");

// Public seller page: profile, active listings, rating and reviews.
router.get("/:handle", (req, res) => {
  const u = db.prepare("SELECT id, handle, bio, createdAt FROM users WHERE handle=?").get(req.params.handle);
  if (!u) fail(404, "No user with that name");
  const liked = likedSet(req.user?.id);
  const listings = db.prepare(`${SELECT} WHERE l.sellerId=? AND l.status IN ('active','reserved') ORDER BY l.createdAt DESC`).all(u.id);
  const reviews = db.prepare(`SELECT r.rating, r.text, r.createdAt, u.handle AS reviewer, o.title
    FROM reviews r JOIN users u ON u.id=r.reviewerId JOIN orders o ON o.id=r.orderId
    WHERE r.sellerId=? ORDER BY r.createdAt DESC LIMIT 50`).all(u.id);
  const stats = db.prepare("SELECT ROUND(AVG(rating),1) avg, COUNT(*) n FROM reviews WHERE sellerId=?").get(u.id);
  const sold = db.prepare("SELECT COUNT(*) n FROM orders WHERE sellerId=? AND status IN ('paid','shipped','delivered')").get(u.id).n;
  res.json({ user: u, listings: listings.map(r => shape(r, liked)), reviews, rating: stats.avg, reviewCount: stats.n, sold });
});

module.exports = router;
