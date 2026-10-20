import { Link, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Shop from "./pages/Shop.jsx";
import Product from "./pages/Product.jsx";
import Bag from "./pages/Bag.jsx";
import Custom from "./pages/Custom.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import Admin from "./pages/Admin.jsx";

function NotFound() {
  return (
    <section className="wrap empty">
      <h1 className="display">404</h1>
      <p>This page went out of print.</p>
      <Link to="/shop" className="btn btn-primary">Back to the shop</Link>
    </section>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="product/:id" element={<Product />} />
        <Route path="bag" element={<Bag />} />
        <Route path="custom" element={<Custom />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="admin/login" element={<AdminLogin />} />
      <Route path="admin" element={<Admin />} />
    </Routes>
  );
}
