import { useLoad } from "../useLoad.js";
import { Grid, ErrorText } from "../components/ui.jsx";

export default function Saved() {
  const { data, setData, error } = useLoad("/me/likes");
  return (
    <>
      <h1>Saved</h1>
      <p className="sub">Items you hearted.</p>
      <ErrorText error={error?.message} />
      <Grid items={data?.items} empty="No saved items yet. Tap the heart on any listing."
        onUnlike={id => setData({ items: data.items.filter(l => l.id !== id) })} />
    </>
  );
}
