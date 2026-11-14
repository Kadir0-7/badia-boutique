// Removes the demo sellers and their listings. Run before going live:
//   npm run remove-demo
// Demo sellers that appear in a real order can't be deleted without losing that
// order's history, so they are locked instead (no password, no listings).
require("dotenv").config();
const { db } = require("./db");

const demos = db.prepare("SELECT id, handle FROM users WHERE id LIKE 'demo-%'").all();
if (!demos.length) { console.log("No demo accounts found. Nothing to do."); process.exit(0); }

let deleted = 0, locked = 0, listings = 0;
db.transaction(() => {
  for (const u of demos) {
    const used = db.prepare("SELECT COUNT(*) n FROM orders WHERE buyerId=? OR sellerId=?").get(u.id, u.id).n
      + db.prepare("SELECT COUNT(*) n FROM reviews WHERE reviewerId=? OR sellerId=?").get(u.id, u.id).n;
    listings += db.prepare("DELETE FROM listings WHERE sellerId=? AND status<>'sold'").run(u.id).changes;
    if (used) {
      // "!" is never a valid bcrypt hash, so no password can ever match.
      db.prepare("UPDATE users SET passwordHash='!', email=? WHERE id=?").run(u.id + "@removed.invalid", u.id);
      db.prepare("DELETE FROM sessions WHERE userId=?").run(u.id);
      locked++;
    } else {
      db.prepare("DELETE FROM listings WHERE sellerId=?").run(u.id);
      db.prepare("DELETE FROM users WHERE id=?").run(u.id); // sessions, likes, profiles and chats cascade
      deleted++;
    }
  }
})();
console.log(`Removed ${deleted} demo accounts, locked ${locked} that have order history, and deleted ${listings} demo listings.`);
console.log("Demo photos (if any) were never uploaded, so there are no files to clean up.");
