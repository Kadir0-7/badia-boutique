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

// Re-encode every uploaded photo. This strips EXIF metadata (phone photos often
// contain the GPS location where they were taken, i.e. the seller's home),
// applies the camera's rotation, caps the size at 2000px, and rejects files that
// claim to be images but aren't.
const sharp = require("sharp");
sharp.cache(false); // don't hold files open (Windows can't delete open files)

async function cleanOne(file) {
  const gif = file.mimetype === "image/gif";
  let img = sharp(file.path, { animated: gif, failOn: "error" }).rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true });
  img = { "image/jpeg": i => i.jpeg({ quality: 85, mozjpeg: true }), "image/png": i => i.png(),
    "image/webp": i => i.webp({ quality: 85 }), "image/gif": i => i.gif() }[file.mimetype](img);
  const buf = await img.toBuffer(); // no .withMetadata(), so all metadata is dropped
  await fs.promises.writeFile(file.path, buf);
  file.size = buf.length;
}

async function cleanPhotos(req, _res, next) {
  try {
    for (const f of req.files || []) await cleanOne(f);
    next();
  } catch {
    removePhotos((req.files || []).map(publicPath));
    next(Object.assign(new Error("One of those files isn’t a valid image. Try a different photo."), { status: 400 }));
  }
}

// Only deletes files that live in our uploads folder.
function removePhotos(paths) {
  for (const p of paths || []) {
    const name = path.basename(String(p));
    if (!/^[a-f0-9]{32}\.(jpg|png|webp|gif)$/.test(name)) continue;
    fs.unlink(path.join(DIR, name), () => {});
  }
}

module.exports = { upload, cleanPhotos, publicPath, removePhotos, DIR, MAX_PHOTOS };
