# Badia Boutique

A marketplace for new and used modest clothing for men, women and kids, with a feed ranked by each shopper's saved taste.
React (Vite) frontend, Express + SQLite backend.

© Badia Boutique. Owned by Abdikadir.

## Features
- **Accounts:** sign up / sign in with email and password (bcrypt hashes, httpOnly session cookie, rate-limited). Sign-up asks for gender and requires accepting the modest-clothing disclaimer.
- **Listings:** up to 6 photos each, edit and delete your own, search, sort by price.
- **Sections and categories:** every listing is for Men, Women or Kids. Categories include thobes, abayas, jilbabs, hijabs & scarves, dresses and more. Quick filters: Men · Women · Kids · Thobes · Abayas · New · Used.
- **Sizes:** thobes and abayas use length (20–64 inches). Other clothing uses XS–XL or a size the seller types, such as 30/30 or UK 10.
- **For you feed:** ranked on the server by who you shop for, your categories, sizes, brands, condition and budget, showing why each item matched.
- **Saved items:** heart anything and find it later.
- **Messaging:** buyer and seller threads per listing, with unread counts.
- **Checkout:** shipping address plus Stripe Checkout. The item is held for 30 minutes while the buyer pays.
- **Orders:** paid, then shipped (with tracking), then delivered. Separate Buying and Selling views.
- **Reviews:** buyers rate the seller once the item arrives. Ratings show on listings and seller pages.

## Run it locally
    npm install
    npm run dev        # open http://localhost:5173

`npm run dev` starts the API on :3000 and the React dev server on :5173 (which forwards `/api` and `/uploads` to the API).
Needs Node 18+.

On first run the database is created at `data/thriftline.db` and seeded with 9 demo sellers and 14 listings.
Sign in as any demo seller with `<name>@demo.thriftline.local` and password `thriftline-demo`, for example `marlowe@demo.thriftline.local`.

## Payments
With no Stripe key the app runs in **test mode**: "Place order" marks the order paid straight away, so you can try the whole flow.

For real Stripe Checkout:
1. Copy `.env.example` to `.env`.
2. Set `STRIPE_SECRET_KEY` (use a `sk_test_...` key first; card `4242 4242 4242 4242` works in test mode).
3. Optional but recommended: add a webhook in the Stripe dashboard pointing to `https://<your-site>/api/stripe/webhook`
   for `checkout.session.completed` and `checkout.session.expired`, and set `STRIPE_WEBHOOK_SECRET`.
   Without a webhook, payment is still confirmed when the buyer returns to the order page.

Payment goes to your platform Stripe account. Paying sellers out automatically needs Stripe Connect (see below).

## Production
    npm run build      # builds the React app into dist/
    NODE_ENV=production npm start

The Express server then serves the built app and the API from one port. Put it behind HTTPS
(the session cookie is HTTPS-only in production) and set `PUBLIC_URL`.
Keep `data/` and `uploads/` on persistent storage and back them up.

### Security checklist for going live
- [ ] Start with an empty database, or run `npm run remove-demo` to delete the demo sellers. In production demo accounts are never created and can't sign in, and the server warns at startup if any remain.
- [ ] Set `NODE_ENV=production`. This turns on the HTTPS redirect, HSTS and HTTPS-only cookies.
- [ ] Set `STRIPE_SECRET_KEY` (and `STRIPE_WEBHOOK_SECRET`). The server warns if production is running in payment test mode.
- [ ] Keep `.env` on the server only. Never commit it.
- [ ] Turn on two-factor sign-in for GitHub, Stripe and your hosting account.
- [ ] Turn on Dependabot alerts in the GitHub repository settings.
- [ ] Schedule daily backups of `data/` and `uploads/` to private, encrypted storage.

### Security already built in
- Passwords hashed with bcrypt. Sessions in httpOnly, SameSite=Lax cookies.
- Rate limits on sign-in, sign-up and the whole API.
- Strict security headers via helmet: Content Security Policy, HSTS, no framing, nosniff.
- Uploaded photos are re-encoded, which strips EXIF metadata including GPS location, and fakes are rejected.
- Ownership checks on every edit, delete, message and order action. Addresses are shown to sellers only after payment. Gender is never public.
- Login `?next=` redirects only go to pages on this site.

## Structure
    server/
      index.js          app setup, security headers, error handler, serves dist/ in production
      db.js             SQLite schema
      seed.js           demo sellers and listings
      auth.js           password hashing, sessions, requireUser
      uploads.js        photo uploads (local disk; swap for S3 here)
      payments.js       Stripe Checkout wrapper
      listings.js       shared listing queries
      util.js           validation helpers
      routes/           auth, listings, me, users, messages, orders
    client/
      index.html
      src/
        App.jsx         routes
        api.js          fetch wrapper
        auth.jsx        signed-in user context
        components/     Layout, ListingCard, Photo, Heart, Stars…
        pages/          Feed, Browse, Listing, ListingForm, Checkout, Orders, Order, Inbox, Conversation, Seller, Account…

## Still to do before a public launch
- **Seller payouts:** Stripe Connect onboarding for sellers, plus a platform fee.
- **Email:** password reset, email verification, and alerts for new messages and orders.
- **Accounts:** change password, delete account, and download my data (needed for UK/EU GDPR).
- **Privacy:** a privacy policy, and deleting old shipping addresses some months after delivery.
- **Photo storage:** move uploads to S3, Cloudinary or similar.
- **Shipping:** postage costs and labels (Shippo or EasyPost, for example).
- **Trust and safety:** report listings or users, an admin dashboard, and refunds or disputes.
- **Legal:** terms of service, privacy policy, prohibited-items policy.
- **Scale:** move from SQLite to Postgres once you have multiple servers, and add full-text search.
