const router = require("express").Router();
const { db } = require("../db");
const { requireUser } = require("../auth");
const { upload, publicPath, removePhotos, MAX_PHOTOS } = require("../uploads");
const { SELECT, shape, getListing, likedSet } = require("../listings");
const { CATS, SECTIONS, CONDS, NEW_CONDS, readSize, id, now, str, oneOf, money, fail } = require("../util");
const { readProfile } = require("./me");

const likeEsc = s => s.replace(/[\\%_]/g, c => "\\" + c);

// Runs the photo upload, then the handler. If the handler throws, the files
// that were just uploaded are deleted so nothing is left orphaned on disk.
const withPhotos = handler => [
  upload.array("photos", MAX_PHOTOS),
  (req, res, next) => new Promise(ok => ok(handler(req, res))).catch(err => {
    removePhotos((req.files || []).map(publicPath));
    next(err);
  })
];

function readFields(b) {
  return {
    title: str(b.title, 70, { required: true, name: "Title" }),
    description: str(b.description, 1000, { name: "Description" }),
    price: money(b.price),
    section: oneOf(b.section, SECTIONS, "Who it’s for"),
    cat: oneOf(b.cat, CATS, "Category"),
    brand: str(b.brand, 30, { name: "Brand" }),
    size: readSize(b.cat, b.size),
    cond: oneOf(b.cond, CONDS, "Condition")
  };
}

// ----- browse & search -----
router.get("/", (req, res) => {
  const q = str(req.query.q, 80);
  const where = ["l.status IN ('active','reserved')"], args = [];
  if (q) { where.push("(l.title LIKE ? ESCAPE '\\' OR l.brand LIKE ? ESCAPE '\\' OR l.description LIKE ? ESCAPE '\\')"); const p = `%${likeEsc(q)}%`; args.push(p, p, p); }
  if (CATS.includes(req.query.cat)) { where.push("l.cat=?"); args.push(req.query.cat); }
  if (SECTIONS.includes(req.query.section)) { where.push("l.section=?"); args.push(req.query.section); }
  const size = str(req.query.size, 12);
  if (size) { where.push("l.size=? COLLATE NOCASE"); args.push(size); }
  const newPh = NEW_CONDS.map(() => "?").join(",");
  if (req.query.cond === "new") { where.push(`l.cond IN (${newPh})`); args.push(...NEW_CONDS); }
  if (req.query.cond === "used") { where.push(`l.cond NOT IN (${newPh})`); args.push(...NEW_CONDS); }
  const max = Number(req.query.max); if (max > 0) { where.push("l.price<=?"); args.push(max); }
  const order = { low: "l.price ASC", high: "l.price DESC" }[req.query.sort] || "l.createdAt DESC";
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 48, 1), 100);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const rows = db.prepare(`${SELECT} WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...args, limit + 1, offset);
  const liked = likedSet(req.user?.id);
  res.json({ items: rows.slice(0, limit).map(r => shape(r, liked)), hasMore: rows.length > limit });
});

// ----- personalised feed (ranked on the server from saved preferences) -----
function score(l, p) {
  const why = []; let s = 0;
  if (p.sections.includes(l.section)) { s += 35; why.push("For " + l.section.toLowerCase()); }
  if (p.cats.includes(l.cat)) { s += 40; why.push("Likes " + l.cat.toLowerCase()); }
  if (p.sizes.includes(l.size) && l.size !== "One size") { s += 20; why.push("Your size"); }
  const brands = p.brands.toLowerCase().split(",").map(x => x.trim()).filter(Boolean);
  if (l.brand && brands.some(b => l.brand.toLowerCase().includes(b))) { s += 30; why.push(l.brand); }
  if (p.conds.includes(l.cond)) { s += 8; why.push(l.cond.toLowerCase()); }
  if (l.price <= p.max) { s += 12; if (s > 12 && l.price <= p.max * 0.6) why.push("Under budget"); } else s -= 35;
  s += Math.max(0, 6 - (Date.now() - l.createdAt) / 864e5);
  return { s, why: why.slice(0, 3) };
}

router.get("/feed", (req, res) => {
  const p = req.user ? readProfile(req.user.id) : null;
  // No "shopping for" preference saved yet: use the gender given at sign-up.
  if (p && !p.sections.length && req.user.gender) p.sections = [req.user.gender === "male" ? "Men" : "Women"];
  const hasPrefs = !!p && (p.sections.length || p.cats.length || p.sizes.length || p.brands || p.conds.length);
  const rows = db.prepare(`${SELECT} WHERE l.status='active' ${req.user ? "AND l.sellerId<>?" : ""} ORDER BY l.createdAt DESC LIMIT 1000`)
    .all(...(req.user ? [req.user.id] : []));
  const liked = likedSet(req.user?.id);
  let items = rows.map(r => ({ ...shape(r, liked), ...(hasPrefs ? (({ s, why }) => ({ score: s, why }))(score(r, p)) : { why: [] }) }));
  if (hasPrefs) items.sort((a, b) => b.score - a.score);
  res.json({ items: items.slice(0, 96), personalised: hasPrefs });
});

router.get("/:id", (req, res) => {
  const r = getListing(req.params.id);
  if (!r) fail(404, "Listing not found");
  res.json(shape(r, likedSet(req.user?.id)));
});

// ----- create / edit / delete (owner only) -----
router.post("/", requireUser, ...withPhotos((req, res) => {
  const f = readFields(req.body || {});
  const photos = (req.files || []).map(publicPath);
  if (!photos.length) fail(400, "Add at least one photo");
  const row = { id: id(), sellerId: req.user.id, ...f, photos: JSON.stringify(photos), status: "active", createdAt: now(), updatedAt: now() };
  db.prepare(`INSERT INTO listings(id,sellerId,title,description,price,section,cat,brand,size,cond,photos,status,createdAt,updatedAt)
    VALUES(@id,@sellerId,@title,@description,@price,@section,@cat,@brand,@size,@cond,@photos,@status,@createdAt,@updatedAt)`).run(row);
  res.status(201).json(shape(getListing(row.id)));
}));

function ownListing(req) {
  const r = getListing(req.params.id);
  if (!r) fail(404, "Listing not found");
  if (r.sellerId !== req.user.id) fail(403, "You can only change your own listings");
  if (r.status !== "active") fail(409, "This listing has a buyer and can't be changed");
  return r;
}

router.patch("/:id", requireUser, ...withPhotos((req, res) => {
  const r = ownListing(req);
  const f = readFields(req.body || {});
  const current = JSON.parse(r.photos);
  let keep;
  try { keep = JSON.parse(req.body.keepPhotos || "[]"); } catch { keep = []; }
  keep = Array.isArray(keep) ? current.filter(p => keep.includes(p)) : [];
  const photos = [...keep, ...(req.files || []).map(publicPath)];
  if (!photos.length) fail(400, "Add at least one photo");
  if (photos.length > MAX_PHOTOS) fail(400, `Up to ${MAX_PHOTOS} photos`);
  db.prepare(`UPDATE listings SET title=@title,description=@description,price=@price,section=@section,cat=@cat,brand=@brand,size=@size,cond=@cond,
    photos=@photos,updatedAt=@updatedAt WHERE id=@id`).run({ ...f, photos: JSON.stringify(photos), updatedAt: now(), id: r.id });
  removePhotos(current.filter(p => !keep.includes(p)));
  res.json(shape(getListing(r.id)));
}));

router.delete("/:id", requireUser, (req, res) => {
  const r = ownListing(req);
  db.prepare("DELETE FROM listings WHERE id=?").run(r.id);
  removePhotos(JSON.parse(r.photos));
  res.json({ ok: true });
});

module.exports = router;
