// Shared listing queries used by several routes.
const { db } = require("./db");

const SELECT = `SELECT l.*, u.handle AS sellerHandle,
  (SELECT ROUND(AVG(rating),1) FROM reviews r WHERE r.sellerId=l.sellerId) AS sellerRating,
  (SELECT COUNT(*) FROM reviews r WHERE r.sellerId=l.sellerId) AS sellerReviews
  FROM listings l JOIN users u ON u.id=l.sellerId`;

const shape = (r, likedIds) => r && ({
  id: r.id, sellerId: r.sellerId, sellerHandle: r.sellerHandle,
  sellerRating: r.sellerRating, sellerReviews: r.sellerReviews,
  title: r.title, description: r.description, price: r.price, section: r.section, cat: r.cat, brand: r.brand,
  size: r.size, cond: r.cond, photos: JSON.parse(r.photos), status: r.status,
  createdAt: r.createdAt, updatedAt: r.updatedAt,
  liked: likedIds ? likedIds.has(r.id) : false
});

const getListing = idv => db.prepare(SELECT + " WHERE l.id=?").get(idv);

const likedSet = userId => new Set(
  userId ? db.prepare("SELECT listingId FROM likes WHERE userId=?").all(userId).map(r => r.listingId) : []
);

module.exports = { SELECT, shape, getListing, likedSet };
