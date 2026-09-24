CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('developer', 'lead'))
)

CREATE TABLE services (
    id           SERIAL PRIMARY KEY,
    name         TEXT NOT NULL,
    endpoint_url TEXT NOT NULL,
    environment  TEXT NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
    status       TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
    version      TEXT NOT NULL,
    owner_email  TEXT NOT NULL REFERENCES users (email) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
)