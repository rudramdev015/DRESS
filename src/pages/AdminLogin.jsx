import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setToken } from "../lib/api.js";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { token } = await api("/admin/login", { method: "POST", body: { id: id.trim(), password } });
      setToken(token);
      navigate("/admin");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <img src="/logo.jpg" alt="Trade World" className="login-logo" />
        <h1>Store admin</h1>
        <p className="muted small">Log in to add tees, change prices and update your WhatsApp number.</p>
        <label className="field">
          <span>Admin ID</span>
          <input value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" autoFocus />
        </label>
        <label className="field">
          <span>Password</span>
          <div className="pw">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button type="button" onClick={() => setShow((s) => !s)}>{show ? "Hide" : "Show"}</button>
          </div>
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? "Checking…" : "Log in"}
        </button>
        <Link to="/" className="muted small center">← Back to store</Link>
      </form>
    </div>
  );
}
