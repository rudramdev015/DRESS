import { Suspense, lazy } from "react";
import { Link, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";

// Home loads instantly; every other page is downloaded only when someone opens it.
const Shop = lazy(() => import("./pages/Shop.jsx"));
const Product = lazy(() => import("./pages/Product.jsx"));
const Bag = lazy(() => import("./pages/Bag.jsx"));
const Custom = lazy(() => import("./pages/Custom.jsx"));
const AdminLogin = lazy(() => import("./pages/AdminLogin.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));

function NotFound() {
  return (
    <section className="wrap empty">
      <h1 className="display">404</h1>
      <p>This page went out of print.</p>
      <Link to="/shop" className="btn btn-primary">Back to the shop</Link>
    </section>
  );
}

export function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="Loading">
      <span />
    </div>
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
      <Route path="admin/login" element={<Suspense fallback={<PageLoader />}><AdminLogin /></Suspense>} />
      <Route path="admin" element={<Suspense fallback={<PageLoader />}><Admin /></Suspense>} />
    </Routes>
  );
}
