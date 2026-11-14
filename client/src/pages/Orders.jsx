import { Link, useSearchParams } from "react-router-dom";
import { useLoad } from "../useLoad.js";
import { ORDER_STATUS, ago, money } from "../constants.js";
import { ErrorText } from "../components/ui.jsx";

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const role = params.get("role") === "selling" ? "selling" : "buying";
  const { data, error } = useLoad("/orders?role=" + role);

  return (
    <>
      <h1>Orders</h1>
      <div className="tabs">
        <button aria-current={role === "buying"} onClick={() => setParams({})}>Buying</button>
        <button aria-current={role === "selling"} onClick={() => setParams({ role: "selling" })}>Selling</button>
      </div>
      <ErrorText error={error?.message} />
      {!data ? <p className="empty">Loading…</p> : !data.items.length
        ? <div className="empty">{role === "buying" ? "You haven’t bought anything yet." : "No sales yet. Items you sell show up here so you can ship them."}</div>
        : (
          <ul className="list">
            {data.items.map(o => (
              <li key={o.id}>
                <Link to={"/orders/" + o.id} className="row-link">
                  <div className="mini">{o.photo ? <img src={o.photo} alt="" /> : "📦"}</div>
                  <div className="grow">
                    <b>{o.title}</b>
                    <div className="meta">{money(o.price)} · {role === "buying" ? "from @" + o.sellerHandle : "to @" + o.buyerHandle} · {ago(o.createdAt)}</div>
                  </div>
                  <span className={"status s-" + o.status}>{role === "selling" && o.status === "paid" ? "Ready to ship" : ORDER_STATUS[o.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </>
  );
}
