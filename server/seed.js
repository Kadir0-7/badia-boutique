// Demo sellers and listings. Every demo account uses the password below so you
// can sign in as a seller.
const bcrypt = require("bcryptjs");
const { db } = require("./db");

const DEMO_PASSWORD = "thriftline-demo";
const SELLERS = ["marlowe", "dena.thrifts", "kickshelf", "trailtrade", "oakandhide", "junebug", "cablecloset", "retro.rae", "potterygirl"];
const L = (n, title, price, section, cat, size, cond, seller, days, brand = "") => ({ n, title, price, section, cat, size, cond, seller, days, brand });
const LISTINGS = [
  L(1, "White Saudi-style thobe, cotton", 35, "Men", "Thobes", "56", "New with tags", "marlowe", 1),
  L(2, "Cream Emirati thobe with tassel", 45, "Men", "Thobes", "58", "Like new", "trailtrade", 2),
  L(3, "Grey wool djellaba, hooded", 60, "Men", "Outerwear", "L", "Good", "marlowe", 3),
  L(4, "Olive linen kurta set", 30, "Men", "Tops", "M", "Like new", "kickshelf", 2),
  L(5, "Brown leather sandals", 25, "Men", "Shoes", "One size", "Good", "kickshelf", 4),
  L(6, "Black open abaya with lace trim", 55, "Women", "Abayas", "54", "New with tags", "junebug", 1),
  L(7, "Navy nida abaya, butterfly cut", 40, "Women", "Abayas", "56", "Like new", "dena.thrifts", 2),
  L(8, "Two-piece khaki jilbab", 32, "Women", "Jilbabs", "One size", "Good", "dena.thrifts", 3),
  L(9, "Chiffon hijab bundle (5 colours)", 18, "Women", "Hijabs & scarves", "One size", "New with tags", "potterygirl", 1),
  L(10, "Sage long-sleeve maxi dress", 28, "Women", "Dresses", "S", "Like new", "junebug", 2),
  L(11, "Camel longline wool coat", 70, "Women", "Outerwear", "L", "Good", "oakandhide", 5),
  L(12, "Black wide-leg trousers", 20, "Women", "Trousers", "UK 10", "Good", "retro.rae", 6),
  L(13, "Kids white thobe, age 6", 15, "Kids", "Thobes", "38", "Like new", "cablecloset", 2),
  L(14, "Girls’ pink abaya, age 8", 18, "Kids", "Abayas", "40", "New with tags", "cablecloset", 1)
];
// Each one-time data update has its own key in the meta table, so a server
// restart halfway through can never mark one step done without running it.
const STEPS = [
  ["catalog", "modest-v1", () => {
    // Switch from the original general-resale categories to modest clothing.
    const map = { Denim: "Trousers", Bags: "Accessories", Tech: "Other", Home: "Other", Vintage: "Other" };
    for (const [from, to] of Object.entries(map)) db.prepare("UPDATE listings SET cat=? WHERE cat=?").run(to, from);
    db.prepare("DELETE FROM listings WHERE id LIKE 'demo-%' AND status='active'").run();
    if (db.prepare("SELECT COUNT(*) n FROM users WHERE id LIKE 'demo-%'").get().n === SELLERS.length) insertDemoListings();
  }],
  ["demo_sizes", "lengths-v1", () => {
    // Give the demo thobes/abayas length sizes. Real users' listings are left alone.
    const upd = db.prepare("UPDATE listings SET size=? WHERE id=?");
    for (const l of LISTINGS) upd.run(l.size, "modest-" + l.n);
  }]
];
const CATEGORY_DONE = ["modest-v1", "modest-v2"]; // modest-v2 was written by an earlier build

const addListing = () => db.prepare(`INSERT OR IGNORE INTO listings(id,sellerId,title,description,price,section,cat,brand,size,cond,photos,status,createdAt,updatedAt)
  VALUES(?,?,?,?,?,?,?,?,?,?,'[]','active',?,?)`);

function insertDemoListings() {
  const add = addListing(), t = Date.now();
  for (const l of LISTINGS) {
    const at = t - l.days * 864e5;
    add.run("modest-" + l.n, "demo-" + l.seller, l.title, "Pre-loved and ready to ship. Message me with any questions.",
      l.price, l.section, l.cat, l.brand, l.size, l.cond, at, at);
  }
}

const markDone = db.prepare("INSERT OR REPLACE INTO meta(key,value) VALUES(?,?)");

// Demo data is for local development only. It's off in production unless
// SEED_DEMO=true is set on purpose, and SEED_DEMO=false turns it off locally.
const demoWanted = () => process.env.SEED_DEMO ? process.env.SEED_DEMO === "true" : process.env.NODE_ENV !== "production";

function seedIfEmpty() {
  if (db.prepare("SELECT COUNT(*) n FROM users").get().n === 0) {
    if (!demoWanted()) {
      for (const [key, value] of STEPS) markDone.run(key, value);
      console.log("Empty database, no demo data (production).");
      return;
    }
    const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
    const addUser = db.prepare("INSERT INTO users(id,email,handle,passwordHash,bio,createdAt) VALUES(?,?,?,?,?,?)");
    db.transaction(() => {
      for (const h of SELLERS) addUser.run("demo-" + h, `${h}@demo.thriftline.local`, h, hash, "Demo seller account.", Date.now() - 30 * 864e5);
      insertDemoListings();
      for (const [key, value] of STEPS) markDone.run(key, value); // fresh data is already up to date
    })();
    console.log(`Seeded ${SELLERS.length} demo sellers (password: ${DEMO_PASSWORD}) and ${LISTINGS.length} listings.`);
    return;
  }
  for (const [key, value, run] of STEPS) {
    const cur = db.prepare("SELECT value FROM meta WHERE key=?").get(key)?.value;
    if (cur === value || (key === "catalog" && CATEGORY_DONE.includes(cur))) continue;
    db.transaction(() => { run(); markDone.run(key, value); })();
    console.log(`Data update applied: ${key} → ${value}`);
  }
}

module.exports = { seedIfEmpty };
