const router = require("express").Router();
const { db } = require("../db");
const { requireUser } = require("../auth");
const { SELECT, shape, getListing } = require("../listings");
const { CATS, SECTIONS, CONDS, SIZES, LENGTHS, now, str, arr, fail } = require("../util");

const DEFAULTS = { sections: [], cats: [], sizes: [], brands: "", conds: [], max: 150 };

function readProfile(userId) {
  const r = db.prepare("SELECT data FROM profiles WHERE userId=?").get(userId);
  return { ...DEFAULTS, ...(r ? JSON.parse(r.data) : {}) };
}

router.use(requireUser);

router.get("/profile", (req, res) => res.json(readProfile(req.user.id)));

router.put("/profile", (req, res) => {
  const p = req.body || {};
  const clean = {
    sections: arr(p.sections, SECTIONS.length).filter(s => SECTIONS.includes(s)),
    cats: arr(p.cats, CATS.length).filter(c => CATS.includes(c)),
    sizes: [...new Set(arr(p.sizes, 40).filter(s => SIZES.includes(s) || LENGTHS.includes(s)))],
    brands: str(p.brands, 200, { name: "Brands" }),
    conds: arr(p.conds, CONDS.length).filter(c => CONDS.includes(c)),
    max: Math.min(Math.max(Number(p.max) || 150, 10), 10000)
  };
  db.prepare("INSERT INTO profiles(userId,data) VALUES(?,?) ON CONFLICT(userId) DO UPDATE SET data=excluded.data")
    .run(req.user.id, JSON.stringify(clean));
  res.json(clean);
});

router.get("/likes", (req, res) => {
  const rows = db.prepare(`${SELECT} JOIN likes k ON k.listingId=l.id AND k.userId=? ORDER BY k.createdAt DESC`).all(req.user.id);
  res.json({ items: rows.map(r => ({ ...shape(r), liked: true })) });
});

router.put("/likes/:listingId", (req, res) => {
  if (!getListing(req.params.listingId)) fail(404, "Listing not found");
  db.prepare("INSERT OR IGNORE INTO likes(userId,listingId,createdAt) VALUES(?,?,?)").run(req.user.id, req.params.listingId, now());
  res.json({ liked: true });
});

router.delete("/likes/:listingId", (req, res) => {
  db.prepare("DELETE FROM likes WHERE userId=? AND listingId=?").run(req.user.id, req.params.listingId);
  res.json({ liked: false });
});

router.get("/listings", (req, res) => {
  const rows = db.prepare(`${SELECT} WHERE l.sellerId=? ORDER BY l.createdAt DESC`).all(req.user.id);
  res.json({ items: rows.map(r => shape(r)) });
});

module.exports = router;
module.exports.readProfile = readProfile;
