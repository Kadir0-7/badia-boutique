const Database = require("better-sqlite3");
const path = require("path");

const file = process.env.DB_FILE || path.join(__dirname, "..", "data", "thriftline.db");
require("fs").mkdirSync(path.dirname(file), { recursive: true });

const db = new Database(file);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
  passwordHash TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  createdAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expiresAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  sellerId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price REAL NOT NULL,
  cat TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL DEFAULT '',
  cond TEXT NOT NULL DEFAULT '',
  photos TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',      -- active | reserved | sold
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(sellerId);

CREATE TABLE IF NOT EXISTS profiles (
  userId TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS likes (
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listingId TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  createdAt INTEGER NOT NULL,
  PRIMARY KEY (userId, listingId)
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  listingId TEXT REFERENCES listings(id) ON DELETE SET NULL,
  buyerId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sellerId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listingTitle TEXT NOT NULL DEFAULT '',
  createdAt INTEGER NOT NULL,
  lastAt INTEGER NOT NULL,
  buyerReadAt INTEGER NOT NULL DEFAULT 0,
  sellerReadAt INTEGER NOT NULL DEFAULT 0,
  UNIQUE (listingId, buyerId)
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  senderId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversationId, createdAt);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  listingId TEXT REFERENCES listings(id) ON DELETE SET NULL,
  buyerId TEXT NOT NULL REFERENCES users(id),
  sellerId TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  price REAL NOT NULL,
  shipping TEXT NOT NULL,                       -- JSON: name, line1, line2, city, postcode, country
  status TEXT NOT NULL,                         -- pending_payment | paid | shipped | delivered | cancelled
  tracking TEXT NOT NULL DEFAULT '',
  stripeSessionId TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyerId);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(sellerId);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  reviewerId TEXT NOT NULL REFERENCES users(id),
  sellerId TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL DEFAULT '',
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_seller ON reviews(sellerId);
`);

// Columns added after the first release. Existing databases get them on startup.
const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
if (!userCols.includes("gender")) db.exec("ALTER TABLE users ADD COLUMN gender TEXT");
if (!userCols.includes("acceptedTermsAt")) db.exec("ALTER TABLE users ADD COLUMN acceptedTermsAt INTEGER");
const listingCols = db.prepare("PRAGMA table_info(listings)").all().map(c => c.name);
if (!listingCols.includes("section")) db.exec("ALTER TABLE listings ADD COLUMN section TEXT"); // Men | Women | Kids
db.exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)");

module.exports = { db };
