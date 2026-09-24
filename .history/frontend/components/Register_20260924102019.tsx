return (
  <div className="signup-page">
    <form className="card signup-card" onSubmit={handleSubmit}>
      <div className="brand">
        <span className="brand-dot" />
        <h1>Service Hub</h1>
      </div>
      <p className="muted">Sign up to access the Service Hub</p>

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
        {submitting ? "Signing in…" : "Sign in"}
      </button>

      <p className="hint">
        Demo account: <code>admin@servicehub.test</code> /{" "}
        <code>password123</code>
      </p>
    </form>
  </div>
);
