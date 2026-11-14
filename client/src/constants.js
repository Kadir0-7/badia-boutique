export const CATS = [["Thobes", "🥼"], ["Abayas", "🧕"], ["Jilbabs", "🧕"], ["Hijabs & scarves", "🧣"], ["Dresses", "👗"], ["Tops", "👕"],
  ["Trousers", "👖"], ["Outerwear", "🧥"], ["Shoes", "👞"], ["Accessories", "👜"], ["Other", "🏷️"]];
export const CAT_NAMES = CATS.map(c => c[0]);
export const ICON = Object.fromEntries(CATS);
export const HUES = { Thobes: 45, Abayas: 280, Jilbabs: 30, "Hijabs & scarves": 330, Dresses: 300, Tops: 48, Trousers: 215,
  Outerwear: 20, Shoes: 350, Accessories: 140, Other: 90 };
export const SECTIONS = ["Men", "Women", "Kids"];

// Quick filters shown as chips on the feed and browse pages.
export const QUICK = [
  ["Men", { section: "Men" }], ["Women", { section: "Women" }], ["Kids", { section: "Kids" }],
  ["Thobes", { cat: "Thobes" }], ["Abayas", { cat: "Abayas" }],
  ["New", { cond: "new" }], ["Used", { cond: "used" }]
];

export const DISCLAIMER = "This platform is for selling new or used modest clothing for men, women and kids. Please keep this in mind when posting your listing.";
export const CONDS = ["New with tags", "Like new", "Good", "Worn"];
export const SIZES = ["XS", "S", "M", "L", "XL", "One size"];
// Thobes and abayas are sized by length instead of S/M/L.
export const LENGTH_CATS = ["Thobes", "Abayas"];
export const LENGTHS = [...Array.from({ length: 23 }, (_, i) => String(20 + i * 2)), "One size"]; // 20, 22 … 64
export const usesLength = cat => LENGTH_CATS.includes(cat);
export const sizeLabel = s => (!s ? "" : s === "One size" ? "One size" : "Size " + s);

export const money = n => "$" + (Number.isInteger(n) ? n : n.toFixed(2));
export const ago = t => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.round(m / 60); if (h < 24) return h + "h ago";
  const d = Math.round(h / 24); if (d < 30) return d + "d ago";
  return new Date(t).toLocaleDateString();
};

export const ORDER_STATUS = {
  pending_payment: "Awaiting payment",
  paid: "Paid, waiting to ship",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled"
};
