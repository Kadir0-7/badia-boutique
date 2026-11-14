import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useToast } from "../toast.jsx";
import { ORDER_STATUS, money } from "../constants.js";
import { ErrorText } from "../components/ui.jsx";

const STEPS = ["paid", "shipped", "delivered"];

export default function Order() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const toast = useToast();
  const [o, setO] = useState(null);
  const [error, setError] = useState(null);
  const [tracking, setTracking] = useState("");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");

  useEffect(() => {
    // Coming back from Stripe: ask the server to check the payment.
    const req = params.get("paid") ? api(`/orders/${id}/confirm`, { method: "POST" }) : api("/orders/" + id);
    req.then(setO).catch(e => setError(e.message));
  }, [id]);

  const act = (path, body, msg) => async e => {
    e?.preventDefault();
    try { setO(await api(`/orders/${id}/${path}`, { method: "POST", body })); toast(msg); setError(null); }
    catch (err) { setError(err.message); }
  };

  if (!o) return error ? <><ErrorText error={error} /><Link to="/orders">Back to orders</Link></> : <p className="empty">Loading…</p>;
  const step = STEPS.indexOf(o.status);
  const s = o.shipping;

  return (
    <div className="narrow">
      <p><Link to={"/orders" + (o.role === "seller" ? "?role=selling" : "")}>← Orders</Link></p>
      <h1>{o.title}</h1>
      <p className="sub">{money(o.price)} · {o.role === "buyer" ? <>sold by <Link to={"/u/" + o.sellerHandle}>@{o.sellerHandle}</Link></> : <>bought by @{o.buyerHandle}</>}</p>

      {params.get("cancelled") && o.status === "pending_payment" && <p className="note">Payment was cancelled. You can try again or cancel the order below.</p>}

      {o.status === "cancelled" || o.status === "pending_payment"
        ? <p className={"status s-" + o.status}>{ORDER_STATUS[o.status]}</p>
        : <ol className="steps">{STEPS.map((st, i) => <li key={st} className={i <= step ? "done" : ""}>{ORDER_STATUS[st]}</li>)}</ol>}

      {o.tracking && <p><b>Tracking:</b> {o.tracking}</p>}

      {s && (
        <div className="card">
          <b>Ship to</b>
          <div>{s.name}<br />{s.line1}{s.line2 && <><br />{s.line2}</>}<br />{s.city} {s.postcode}<br />{s.country}</div>
        </div>
      )}

      <ErrorText error={error} />

      {o.role === "seller" && o.status === "paid" && (
        <form className="f" onSubmit={act("ship", { tracking }, "Marked as shipped")}>
          <label>Tracking number (optional)<input maxLength="80" value={tracking} onChange={e => setTracking(e.target.value)} /></label>
          <div><button className="btn p">Mark as shipped</button></div>
        </form>
      )}

      {o.role === "buyer" && o.status === "pending_payment" && (
        <div className="actions"><button className="btn" onClick={act("cancel", undefined, "Order cancelled")}>Cancel order</button></div>
      )}

      {o.role === "buyer" && o.status === "shipped" && (
        <div className="actions"><button className="btn p" onClick={act("received", undefined, "Thanks! Order complete")}>I’ve received it</button></div>
      )}

      {o.role === "buyer" && o.status === "delivered" && !o.review && (
        <form className="f" onSubmit={act("review", { rating, text: review }, "Review posted")}>
          <b>Rate @{o.sellerHandle}</b>
          <div className="rate" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map(n => (
              <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={n + " stars"} onClick={() => setRating(n)}>{n <= rating ? "★" : "☆"}</button>
            ))}
          </div>
          <label>Review (optional)<textarea rows="3" maxLength="500" value={review} onChange={e => setReview(e.target.value)} /></label>
          <div><button className="btn p">Post review</button></div>
        </form>
      )}

      {o.review && <div className="card"><b>Your review</b><div className="stars">{"★".repeat(o.review.rating)}{"☆".repeat(5 - o.review.rating)}</div>{o.review.text}</div>}
    </div>
  );
}
