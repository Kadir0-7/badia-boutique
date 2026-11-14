import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useLoad } from "../useLoad.js";
import { money, sizeLabel } from "../constants.js";
import { Photo, ErrorText } from "../components/ui.jsx";

export default function Checkout() {
  const { listingId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { data: l, error: loadError } = useLoad("/listings/" + listingId);
  const { data: cfg } = useLoad("/orders/config");
  const [s, setS] = useState({ name: "", line1: "", line2: "", city: "", postcode: "", country: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = k => e => setS({ ...s, [k]: e.target.value });

  if (loadError) return <ErrorText error={loadError.message} />;
  if (!l || !cfg) return <p className="empty">Loading…</p>;
  if (l.sellerId === user.id) return <Navigate to={"/listing/" + l.id} replace />;

  async function pay(e) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const r = await api("/orders", { method: "POST", body: { listingId: l.id, shipping: s } });
      if (r.checkoutUrl) window.location.href = r.checkoutUrl; // Stripe-hosted payment page
      else nav("/orders/" + r.orderId, { replace: true });
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <div className="narrow">
      <h1>Checkout</h1>
      <div className="row-link card">
        <Photo listing={l} className="mini" />
        <div className="grow"><b>{l.title}</b><div className="meta">from @{l.sellerHandle} · {sizeLabel(l.size)} · {l.cond}</div></div>
        <b>{money(l.price)}</b>
      </div>
      {l.status !== "active" ? (
        <p className="err">This item isn’t available right now. <Link to="/browse">Keep browsing</Link></p>
      ) : (
        <form className="f" onSubmit={pay}>
          <b>Shipping address</b>
          <label>Full name<input required maxLength="80" autoComplete="name" value={s.name} onChange={set("name")} /></label>
          <label>Address<input required maxLength="120" autoComplete="address-line1" value={s.line1} onChange={set("line1")} /></label>
          <label>Apartment, suite (optional)<input maxLength="120" autoComplete="address-line2" value={s.line2} onChange={set("line2")} /></label>
          <div className="row">
            <label>City<input required maxLength="60" autoComplete="address-level2" value={s.city} onChange={set("city")} /></label>
            <label>Postcode<input required maxLength="20" autoComplete="postal-code" value={s.postcode} onChange={set("postcode")} /></label>
          </div>
          <label>Country<input required maxLength="60" autoComplete="country-name" value={s.country} onChange={set("country")} /></label>
          <ErrorText error={error} />
          <div><button className="btn p" disabled={busy}>{busy ? "Working…" : cfg.stripe ? `Pay ${money(l.price)}` : `Place order (${money(l.price)})`}</button></div>
          <p className="note">
            {cfg.stripe
              ? "You’ll be taken to Stripe’s secure page to pay. The item is held for you for 30 minutes."
              : "Test mode: no payment is taken and the order is marked paid straight away. Add a Stripe key to take real payments."}
          </p>
        </form>
      )}
    </div>
  );
}
