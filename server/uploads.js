const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

// Photos are stored on local disk in /uploads. To move to S3/Cloudinary later,
// swap this storage engine and the removePhotos() helper; nothing else changes.
const DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");
fs.mkdirSync(DIR, { recursive: true });

const TYPES = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
const MAX_PHOTOS = 6;

const upload = multer({
  storage: multer.diskStorage({
    destination: DIR,
    filename: (_req, file, cb) => cb(null, crypto.randomBytes(16).toString("hex") + TYPES[file.mimetype])
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: MAX_PHOTOS },
  fileFilter: (_req, file, cb) => {
    if (TYPES[file.mimetype]) return cb(null, true);
    cb(Object.assign(new Error("Photos must be JPEG, PNG, WebP or GIF"), { status: 400 }));
  }
});

const publicPath = file => "/uploads/" + file.filename;

// Only deletes files that live in our uploads folder.
function removePhotos(paths) {
  for (const p of paths || []) {
    const name = path.basename(String(p));
    if (!/^[a-f0-9]{32}\.(jpg|png|webp|gif)$/.test(name)) continue;
    fs.unlink(path.join(DIR, name), () => {});
  }
}

module.exports = { upload, publicPath, removePhotos, DIR, MAX_PHOTOS };
