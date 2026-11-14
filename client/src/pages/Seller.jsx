import { useParams } from "react-router-dom";
import { useLoad } from "../useLoad.js";
import { ago } from "../constants.js";
import { Grid, Stars } from "../components/ui.jsx";

export default function Seller() {
  const { handle } = useParams();
  const { data, error } = useLoad("/users/" + encodeURIComponent(handle));
  if (error) return <><h1>Seller not found</h1><p className="sub">{error.message}</p></>;
  if (!data) return <p className="empty">Loading…</p>;
  const { user, listings, reviews, rating, reviewCount, sold } = data;

  return (
    <>
      <h1>@{user.handle}</h1>
      <p className="sub">
        <Stars value={rating} count={reviewCount} /> · {sold} sold · joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
        {user.bio && <><br />{user.bio}</>}
      </p>
      <h2>Listings</h2>
      <Grid items={listings} empty="Nothing for sale right now." />
      <h2>Reviews</h2>
      {!reviews.length ? <p className="empty">No reviews yet.</p> : (
        <ul className="list">
          {reviews.map((r, i) => (
            <li key={i} className="card">
              <span className="stars">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span> <span className="meta">@{r.reviewer} · {r.title} · {ago(r.createdAt)}</span>
              {r.text && <div>{r.text}</div>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
