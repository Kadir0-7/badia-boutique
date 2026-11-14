import { Link } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { useLoad } from "../useLoad.js";
import { Grid, ErrorText, QuickFilters } from "../components/ui.jsx";

export default function Feed() {
  const { user } = useAuth();
  const { data, error } = useLoad(user === undefined ? null : "/listings/feed?u=" + (user?.id || ""));
  const personalised = data?.personalised;

  return (
    <>
      <h1>{personalised ? `Picked for you, ${user.handle}` : user ? "Set your taste to personalize this feed" : "Modest clothing, new and pre-loved"}</h1>
      <p className="sub">
        {personalised
          ? "Listings are ranked by who you shop for, your categories, sizes and budget. New posts that match jump to the top. "
          : user
            ? "Tell us who you shop for, what you wear and what you’ll pay. Matching listings float to the top and show why. "
            : "Create a free account to save items, message sellers and get a feed ranked by your taste. "}
        {user
          ? <Link className="btn sm" to="/taste">{personalised ? "Edit preferences" : "Set preferences"}</Link>
          : <Link className="btn p sm" to="/signup">Create account</Link>}
      </p>
      <QuickFilters />
      <ErrorText error={error?.message} />
      <Grid items={data?.items} whyFor={l => l.why} empty={<>Nothing listed yet. <Link to="/sell">Be the first to sell something.</Link></>} />
    </>
  );
}
