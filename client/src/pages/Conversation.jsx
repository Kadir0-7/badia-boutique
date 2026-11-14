import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { ago, money } from "../constants.js";
import { ErrorText } from "../components/ui.jsx";

// Polls for new messages every 4 seconds while the page is open.
export default function Conversation() {
  const { id } = useParams();
  const [conv, setConv] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const last = useRef(0);
  const end = useRef(null);

  async function poll() {
    try {
      const d = await api(`/conversations/${id}/messages?after=${last.current}`);
      setConv(d.conversation);
      if (d.messages.length) {
        last.current = d.messages[d.messages.length - 1].createdAt;
        setMsgs(m => [...m, ...d.messages.filter(x => !m.some(y => y.id === x.id))]);
      }
      setError(null);
    } catch (e) { setError(e.message); }
  }

  useEffect(() => {
    last.current = 0; setMsgs([]); setConv(null);
    poll();
    const t = setInterval(() => !document.hidden && poll(), 4000);
    return () => clearInterval(t);
  }, [id]);

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try { await api(`/conversations/${id}/messages`, { method: "POST", body: { body: text } }); setText(""); await poll(); }
    catch (err) { setError(err.message); }
    setSending(false);
  }

  if (!conv) return error ? <><ErrorText error={error} /><Link to="/inbox">Back to inbox</Link></> : <p className="empty">Loading…</p>;

  return (
    <div className="chat">
      <p><Link to="/inbox">← Inbox</Link></p>
      <div className="chat-head">
        <div className="mini">{conv.photo ? <img src={conv.photo} alt="" /> : "💬"}</div>
        <div>
          <b>@{conv.otherHandle}</b>
          <div className="meta">
            {conv.listingId ? <Link to={"/listing/" + conv.listingId}>{conv.listingTitle}</Link> : conv.listingTitle}
            {conv.price != null && <> · {money(conv.price)}</>}
            {conv.listingStatus && conv.listingStatus !== "active" && <> · {conv.listingStatus === "sold" ? "sold" : "on hold"}</>}
          </div>
        </div>
      </div>
      <div className="msgs">
        {msgs.map(m => (
          <div key={m.id} className={"msg" + (m.mine ? " mine" : "")}>
            <div className="bubble">{m.body}</div>
            <div className="meta">{ago(m.createdAt)}</div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <ErrorText error={error} />
      <form className="composer" onSubmit={send}>
        <textarea rows="2" maxLength="2000" value={text} onChange={e => setText(e.target.value)} placeholder="Write a message"
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) send(e); }} aria-label="Message" />
        <button className="btn p" disabled={sending || !text.trim()}>Send</button>
      </form>
    </div>
  );
}
