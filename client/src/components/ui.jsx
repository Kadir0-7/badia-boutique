import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HUES, ICON, QUICK, money, sizeLabel } from "../constants.js";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useToast } from "../toast.jsx";

// A listing photo, or a coloured placeholder for listings without photos.
export function Photo({ listing, src, className = "ph", children }) {
  const url = src ?? listing?.photos?.[0];
  return (
    <div className={className} style={url ? undefined : { background: `hsl(${HUES[listing?.cat] ?? 60} 55% 78%)` }}>
      {url ? <img src={url} alt="" loading="lazy" /> : <span aria-hidden="true">{ICON[listing?.cat] || "🏷️"}</span>}
      {children}
    </div>
  );
}

export function Stars({ value, count }) {
  if (!count) return <span className="meta">No reviews yet</span>;
  return <span className="stars" title={`${value} out of 5`}>{"★".repeat(Math.round(value))}{"☆".repeat(5 - Math.round(value))} <span className="meta">{value} ({count})</span></span>;
}

export function Heart({ listing, onChange }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [liked, setLiked] = useState(listing.liked);
  useEffect(() => { setLiked(listing.liked); }, [listing.liked]);
  async function toggle(e) {
    e.preventDefault(); e.stopPropagation();
    if (!user) return nav("/login?next=" + encodeURIComponent(location.pathname));
    const next = !liked; setLiked(next);
    try { await api("/me/likes/" + listing.id, { method: next ? "PUT" : "DELETE" }); onChange?.(next); }
    catch (err) { setLiked(!next); toast(err.message); }
  }
  return <button className="heart" onClick={toggle} aria-label={liked ? "Remove from saved" : "Save item"} aria-pressed={liked}>{liked ? "♥" : "♡"}</button>;
}

export function ListingCard({ listing, why, onUnlike }) {
  const l = listing;
  return (
    <Link className="item" to={"/listing/" + l.id}>
      <Heart listing={l} onChange={v => !v && onUnlike?.(l.id)} />
      <Photo listing={l}>
        <span className="price">{money(l.price)}</span>
        {l.status !== "active" && <div className="sold">{l.status === "sold" ? "SOLD" : "ON HOLD"}</div>}
      </Photo>
      <div className="info">
        <b>{l.title}</b>
        <div className="meta">{l.section ? l.section + " · " : ""}{l.cat} · {sizeLabel(l.size)} · {l.cond}</div>
        {why?.length > 0 && <div className="why">{why.map(w => <span key={w}>{w}</span>)}</div>}
      </div>
    </Link>
  );
}

export function Grid({ items, empty, whyFor, onUnlike }) {
  if (!items) return <p className="empty">Loading…</p>;
  if (!items.length) return <div className="empty">{empty}</div>;
  return <div className="grid">{items.map(l => <ListingCard key={l.id} listing={l} why={whyFor?.(l)} onUnlike={onUnlike} />)}</div>;
}

export function Chips({ options, value, onChange }) {
  return (
    <div className="chips">
      {options.map(o => (
        <button type="button" key={o} className="chip" aria-pressed={value.includes(o)}
          onClick={() => onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o])}>{o}</button>
      ))}
    </div>
  );
}

// Men · Women · Kids · Thobes · Abayas · New · Used. Each chip toggles one filter.
// With `params` it edits the current URL (Browse); without, it links to Browse.
export function QuickFilters({ params, setParams }) {
  return (
    <div className="quick" role="group" aria-label="Quick filters">
      {QUICK.map(([label, f]) => {
        const [k, v] = Object.entries(f)[0];
        if (!params) return <Link key={label} className="chip" to={`/browse?${k}=${encodeURIComponent(v)}`}>{label}</Link>;
        const on = params.get(k) === v;
        return (
          <button key={label} type="button" className="chip" aria-pressed={on}
            onClick={() => { const p = new URLSearchParams(params); on ? p.delete(k) : p.set(k, v); setParams(p, { replace: true }); }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

export const ErrorText = ({ error }) => error ? <p className="err" role="alert">{error}</p> : null;
