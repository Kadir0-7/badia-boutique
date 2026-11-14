const crypto = require("crypto");

const CATS = ["Thobes", "Abayas", "Jilbabs", "Hijabs & scarves", "Dresses", "Tops", "Trousers", "Outerwear", "Shoes", "Accessories", "Other"];
const SECTIONS = ["Men", "Women", "Kids"];
const CONDS = ["New with tags", "Like new", "Good", "Worn"];
const NEW_CONDS = ["New with tags"]; // everything else counts as "Used"
const SIZES = ["XS", "S", "M", "L", "XL", "One size"];
// Thobes and abayas are sized by length (in inches) instead of S/M/L.
const LENGTH_CATS = ["Thobes", "Abayas"];
const LENGTHS = [...Array.from({ length: 23 }, (_, i) => String(20 + i * 2)), "One size"]; // 20, 22 … 64
const CUSTOM_SIZE = /^[A-Za-z0-9][A-Za-z0-9 ./\-()]{0,11}$/; // e.g. 30/30, UK 10, EU 42

const id = () => crypto.randomUUID();
const now = () => Date.now();

// Error that the central error handler turns into { error } JSON with a status code.
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };

// Input helpers: never trust the shape of req.body.
const str = (v, max, { required = false, name = "field" } = {}) => {
  const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
  if (required && !s) fail(400, `${name} is required`);
  if (s.length > max) fail(400, `${name} must be ${max} characters or fewer`);
  return s;
};
const oneOf = (v, list, name) => {
  if (!list.includes(v)) fail(400, `${name} must be one of: ${list.join(", ")}`);
  return v;
};
const arr = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
const money = (v, name = "price") => {
  const n = Math.round(Number(v) * 100) / 100;
  if (!Number.isFinite(n) || n < 1 || n > 10000) fail(400, `${name} must be between 1 and 10000`);
  return n;
};

// Thobes/abayas must use a length; other clothing can use S/M/L or type its own size.
function readSize(cat, v) {
  const s = str(v, 12, { required: true, name: "Size" });
  if (LENGTH_CATS.includes(cat)) {
    if (!LENGTHS.includes(s)) fail(400, `Pick a length for ${cat.toLowerCase()} (20 to 64, or One size)`);
    return s;
  }
  if (!SIZES.includes(s) && !CUSTOM_SIZE.test(s)) fail(400, "Size can use letters, numbers, spaces and / . - ( ), up to 12 characters");
  return s;
}

// Wraps an async route so thrown errors reach the error handler.
const wrap = fn => (req, res, next) => new Promise(ok => ok(fn(req, res, next))).catch(next);

module.exports = { CATS, SECTIONS, CONDS, NEW_CONDS, SIZES, LENGTH_CATS, LENGTHS, readSize, id, now, HttpError, fail, str, oneOf, arr, money, wrap };
