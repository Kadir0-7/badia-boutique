import { Route, Routes, Link } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { RequireAuth } from "./auth.jsx";
import Feed from "./pages/Feed.jsx";
import Browse from "./pages/Browse.jsx";
import Listing from "./pages/Listing.jsx";
import ListingForm from "./pages/ListingForm.jsx";
import Saved from "./pages/Saved.jsx";
import Taste from "./pages/Taste.jsx";
import { Login, Signup } from "./pages/AuthPages.jsx";
import Inbox from "./pages/Inbox.jsx";
import Conversation from "./pages/Conversation.jsx";
import Orders from "./pages/Orders.jsx";
import Order from "./pages/Order.jsx";
import Checkout from "./pages/Checkout.jsx";
import Seller from "./pages/Seller.jsx";
import Account from "./pages/Account.jsx";

const auth = el => <RequireAuth>{el}</RequireAuth>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Feed />} />
        <Route path="browse" element={<Browse />} />
        <Route path="listing/:id" element={<Listing />} />
        <Route path="listing/:id/edit" element={auth(<ListingForm />)} />
        <Route path="sell" element={auth(<ListingForm />)} />
        <Route path="saved" element={auth(<Saved />)} />
        <Route path="taste" element={auth(<Taste />)} />
        <Route path="inbox" element={auth(<Inbox />)} />
        <Route path="inbox/:id" element={auth(<Conversation />)} />
        <Route path="orders" element={auth(<Orders />)} />
        <Route path="orders/:id" element={auth(<Order />)} />
        <Route path="checkout/:listingId" element={auth(<Checkout />)} />
        <Route path="account" element={auth(<Account />)} />
        <Route path="u/:handle" element={<Seller />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="*" element={<><h1>Page not found</h1><p className="sub"><Link to="/">Back to the feed</Link></p></>} />
      </Route>
    </Routes>
  );
}
