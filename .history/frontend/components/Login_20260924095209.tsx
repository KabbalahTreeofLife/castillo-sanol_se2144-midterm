import { useState, type FormEvent } from 'react';
import { api, setToken } from '../../api/auth/login;

export default function Login() {
  const dispatch = ;
  const [email, setEmail] = useState('admin@servicehub.test');
  const [password, setPassword] = useState('password123');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const { token, user } = await api.login(email, password);
      setToken(token);
      dispatch({ type: 'SET_AUTH', payload: { user, token } });
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : 'Login failed',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={handleSubmit}>
        <div className="brand">
          <span className="brand-dot" />
          <h1>PulseDesk</h1>
        </div>
        <p className="muted">Sign in to the Service Hub</p>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="hint">
          Demo account: <code>admin@servicehub.test</code> / <code>password123</code>
        </p>
      </form>
    </div>
  );
}
