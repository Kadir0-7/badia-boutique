import { Link } from "react-router-dom";
import { useLoad } from "../useLoad.js";
import { ago } from "../constants.js";
import { ErrorText } from "../components/ui.jsx";

export default function Inbox() {
  const { data, error } = useLoad("/conversations");
  return (
    <>
      <h1>Inbox</h1>
      <p className="sub">Conversations with buyers and sellers.</p>
      <ErrorText error={error?.message} />
      {!data ? <p className="empty">Loading…</p> : !data.items.length
        ? <div className="empty">No messages yet. Open a listing and tap “Message seller” to ask a question.</div>
        : (
          <ul className="list">
            {data.items.map(c => (
              <li key={c.id}>
                <Link to={"/inbox/" + c.id} className={"row-link" + (c.unread ? " unread" : "")}>
                  <div className="mini">{c.photo ? <img src={c.photo} alt="" /> : "💬"}</div>
                  <div className="grow">
                    <b>@{c.otherHandle}</b> <span className="meta">· {c.role === "buyer" ? "you’re buying" : "you’re selling"} · {c.listingTitle}</span>
                    <div className="meta clip">{c.lastFromMe ? "You: " : ""}{c.lastBody}</div>
                  </div>
                  <span className="meta">{ago(c.lastAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </>
  );
}
