import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useToast } from "../toast.jsx";
import { useLoad } from "../useLoad.js";
import { ago, money, sizeLabel } from "../constants.js";
import { Photo, Stars, Heart } from "../components/ui.jsx";

export default function Listing() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const { data: l, error } = useLoad("/listings/" + id);
  const [shown, setShown] = useState(0);
  const [msg, setMsg] = useState("");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  if (error) return <><h1>Listing not found</h1><p className="sub">It may have been removed. <Link to="/browse">Browse other items</Link></p></>;
  if (!l) return <p className="empty">Loading…</p>;

  const own = user && l.sellerId === user.id;
  const signIn = () => nav("/login?next=" + encodeURIComponent("/listing/" + id));

  async function send(e) {
    e.preventDefault();
    if (!msg.trim()) return;
    setBusy(true);
    try {
      const c = await api("/conversations", { method: "POST", body: { listingId: l.id, body: msg } });
      nav("/inbox/" + c.id);
    } catch (err) { toast(err.message); setBusy(false); }
  }

  async function remove() {
    if (!confirm("Delete this listing? This can’t be undone.")) return;
    try { await api("/listings/" + l.id, { method: "DELETE" }); toast("Listing deleted"); nav("/account"); }
    catch (err) { toast(err.message); }
  }

  return (
    <div className="detail">
      <div className="gallery">
        <Photo listing={l} src={l.photos[shown] ?? null} className="ph big">
          <Heart listing={l} />
          {l.status !== "active" && <div className="sold">{l.status === "sold" ? "SOLD" : "ON HOLD"}</div>}
        </Photo>
        {l.photos.length > 1 && (
          <div className="thumbs">
            {l.photos.map((p, i) => (
              <button key={p} onClick={() => setShown(i)} aria-pressed={i === shown} aria-label={`Photo ${i + 1}`}><img src={p} alt="" /></button>
            ))}
          </div>
        )}
      </div>

      <div className="body">
        <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)" }}>{l.title}</h1>
        <div className="bigprice">{money(l.price)}</div>
        <div className="meta">{l.section ? "For " + l.section.toLowerCase() + " · " : ""}{l.cat} · {sizeLabel(l.size)} · {l.cond}{l.brand ? " · " + l.brand : ""}</div>
        <p style={{ whiteSpace: "pre-wrap" }}>{l.description || "No description."}</p>
        <div className="seller">
          <Link to={"/u/" + l.sellerHandle}><b>@{l.sellerHandle}</b></Link> <Stars value={l.sellerRating} count={l.sellerReviews} />
          <div className="meta">Listed {ago(l.createdAt)}</div>
        </div>

        {own ? (
          <div className="actions">
            {l.status === "active"
              ? <><Link className="btn p" to={`/listing/${l.id}/edit`}>Edit listing</Link><button className="btn" onClick={remove}>Delete</button></>
              : <p className="note">This item has a buyer. Find it under <Link to="/orders?role=selling">Orders → Selling</Link>.</p>}
          </div>
        ) : (
          <>
            <div className="actions">
              <button className="btn p" disabled={l.status !== "active"}
                onClick={() => user ? nav("/checkout/" + l.id) : signIn()}>
                {l.status === "sold" ? "Sold" : l.status === "reserved" ? "On hold" : "Buy now"}
              </button>
              <button className="btn" onClick={() => user ? setAsking(a => !a) : signIn()}>Message seller</button>
            </div>
            {asking && (
              <form className="f" onSubmit={send}>
                <label>Your message
                  <textarea rows="3" maxLength="2000" autoFocus value={msg} onChange={e => setMsg(e.target.value)} placeholder="Hi! Is this still available? Could you share measurements?" />
                </label>
                <div><button className="btn p" disabled={busy || !msg.trim()}>Send</button></div>
              </form>
            )}
            {l.status === "reserved" && <p className="note">Someone is checking out with this item. If they don’t finish within 30 minutes it becomes available again.</p>}
          </>
        )}
      </div>
    </div>
  );
}
