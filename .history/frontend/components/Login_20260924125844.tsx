import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/src/middleware/auth";
import { useServices } from "../context/ServicesContext";

export default function Login() {
  const { state, dispatch } = useServices();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const { user, token } = await api.login(email, password);
      dispatch({ type: "SET_AUTH", payload: { user, token } });
      navigate("/");
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        payload: err instanceof Error ? err.message : "Login failed",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth">
      <section className="auth-panel">
        <h1>ServiceHub</h1>
        <p className="lede">
          Sign in to see which services are up, and which aren't.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {state.error && (
            <p className="form-error" role="alert">
              {state.error}
            </p>
          )}

          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
