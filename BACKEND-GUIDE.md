# Backend Guide — Node.js + Express + TypeScript + Postgres (JWT / Zod / Middleware)

> A from-scratch, file-by-file guide for the backend half of a *CRUD + JWT auth* assignment — the exact stack, setup, and reasoning used by the PulseDesk reference build. Written generically: **`<resource>`** = your domain entity (incident, product, task, booking, …).

---

## 1. What you'll have at the end

A small but complete HTTP API:

- `POST /api/auth/login` (public) and `POST /api/auth/register` (public) → issue JWTs
- `POST /api/<resources>` → create (auth + zod)
- `GET /api/<resources>` → list, **scoped to the requester** (auth)
- `PATCH /api/<resources>/:id` → partial update (auth + zod)
- `DELETE /api/<resources>/:id` → delete (auth)
- A middleware pipeline that proves the **"Express Middlewares"** rubric point: `cors` → `json` → `validate()` → `requireAuth()` → `errorHandler()`
- One Postgres schema (`users` + `<resources>`), one seed script

---

## 2. Prerequisites

- Node.js 18+ (Express 5 needs 18+)
- PostgreSQL running locally (`practice` database in the reference build); `psql` on PATH, or the password in `PGPASSWORD`
- A text editor; ideally a terminal with `psql`

---

## 3. Scaffold + dependencies (the setup step)

```bash
mkdir api && cd api
npm init -y
```

**Install the fixed dependency set** — this exact list covers every topic variant:

```bash
npm i express cors jsonwebtoken bcryptjs zod dotenv pg
npm i -D tsx typescript @types/express @types/cors @types/jsonwebtoken @types/pg @types/node
```

Why each one:
| Package | Why |
|---|---|
| `express` | the framework; `express.json()` body parser; routing/middleware |
| `cors` | lets the Vite dev server (different port) call the API during development |
| `jsonwebtoken` | issue/verify JWTs for auth |
| `bcryptjs` | password hashing. **Pure JS** — no native build step, works everywhere. Same API as `bcrypt`. |
| `zod` | runtime validation → builds the "Zod Validation" criterion; also gives typed results |
| `dotenv` | loads `.env` (JWT secret, DB creds, port) at boot |
| `pg` | Postgres driver + connection pool |
| `tsx` | run/`watch` TypeScript directly in dev, no build step |
| `typescript` + `@types/*` | typechecking and correct editor intellisense |

> Do **not** add a JS `bcrypt` — it's a native module; on Windows an uninstall can leave a locked `bcrypt.node` (EPERM cleanup warnings). `bcryptjs` behaves identically without the native bits.

**Two critical `package.json` edits** (open it):

```jsonc
{
  "type": "module",        // ESM. Pairs with the tsconfig below.
  "scripts": {
    "dev": "tsx watch src/index.ts",   // watch + restart
    "seed": "tsx scripts/seed.ts",     // create the first user
    "build": "tsc",                    // compile src -> dist
    "start": "node dist/index.js",     // run the compiled API
    "typecheck": "tsc --noEmit"
  }
}
```

**Create `tsconfig.json`** at the project root:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",             // ESM-aware emit
    "moduleResolution": "NodeNext",   // resolves the .js-style imports (see §5)
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,                   // non-negotiable for a graded project
    "esModuleInterop": true,          // lets default-import CJS modules (jsonwebtoken, bcryptjs)
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

**Create `.env`** (and make sure `.gitignore` excludes it — secrets!):

```env
PORT=3000
PGUSER=postgres
PGHOST=localhost
PGDATABASE=practice
PGPASSWORD=admin
PGPORT=5432
JWT_SECRET=<a long random string>
SEED_EMAIL=demo@test.com
SEED_PASSWORD=password123
```

`.gitignore` wins:
```
node_modules/
dist/
.env
```

---

## 4. Database — `schema.sql`

```sql
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS <resources> (
  id              SERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  <extra fields>  ...,
  severity        TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in-progress','resolved')),
  user_id         INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Apply it:

```bash
# PowerShell
$env:PGPASSWORD='admin'; psql -h localhost -U postgres -d practice -f schema.sql
# macOS/Linux
PGPASSWORD=admin psql -h localhost -U postgres -d practice -f schema.sql
```

**Why each decision matters:**
- **`SERIAL`, not `BIGSERIAL`** — `pg` returns `int8` columns as *strings*. `SERIAL` (int4) returns numbers, so `id`s match your TS types and `WHERE id = ?` comparisons with zero casting.
- **`CHECK (... IN (...))`** — the DB enforces the enum even if a caller bypasses zod. Defense in depth.
- **`TIMESTAMPTZ`** — timezone-correct timestamps, serialized as ISO strings, which `new Date()` on the frontend parses.
- **`ON DELETE CASCADE`** on `user_id` — a user's rows go away with the user.
- **`UNIQUE` email** — backs your duplicate-email 409 check at the DB level too.
- **`updated_at`** — you'll bump it on PATCH (`updated_at = now()`).

---

## 5. Backend load-bearing rule: ESM import paths

Because `"type":"module"` + `moduleResolution: NodeNext`, **every relative import needs a `.js` extension** — even though the file is `.ts`:

```ts
import { pool } from "./db.js";          // correct
import { pool } from "./db";             // runtime crash: ERR_MODULE_NOT_FOUND
```

`tsc` rewrites paths at build, `tsx` handles it in dev. Forget it once and you'll learn it forever.

---

## 6. Source files, in build order, with the *why*

```
src/
  index.ts            # boot: dotenv + app.listen          (§6.1)
  app.ts              # express app + middleware order      (§6.2)
  db.ts               # pg Pool                             (§6.3)
  types.ts            # JWT payload + Express augmentation  (§6.4)
  security.ts         # bcryptjs + jwt helpers              (§6.5)
  middleware/
    validate.ts       # zod -> middleware                    (§6.6)
    auth.ts           # JWT guard                            (§6.7)
    errorHandler.ts   # global error mapper + HttpError      (§6.8)
  schemas/
    auth.zod.ts       # login/register schemas               (§6.9)
    <resource>.zod.ts # create/update schemas                (§6.10)
  routes/
    auth.routes.ts    # login (+ register)                   (§6.11)
    <resource>.routes.ts # full CRUD                         (§6.12)
scripts/
  seed.ts             # first user                           (§6.13)
```

### 6.1 `index.ts` — keep it tiny

```ts
import "dotenv/config";
import { app } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`API running at http://localhost:${port}`));
```
Why split `index.ts` and `app.ts`? The *app* (all routes + middleware) becomes importable and testable; `index.ts` is just the process entrypoint. `dotenv` loads before anything imports `app.js`.

### 6.2 `app.ts` — the middleware pipeline (criterion: Express Middlewares)

```ts
import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.routes.js";
import { <resource>Router } from "./routes/<resource>.routes.js";

export const app = express();

app.use(cors());              // dev helper: allow the Vite origin
app.use(express.json());      // parse JSON bodies into req.body

app.get("/api/health", (_req, res) => res.json({ status: "ok" })); // sanity check

app.use("/api", authRouter);
app.use("/api", <resource>Router);

app.use(errorHandler);        // MUST be last — errors bubble down to it
```

**Order is the whole point.** `cors`/`json` run on every request; routers run for their paths; `errorHandler` sits at the end of the chain and catches anything `next()`ed or thrown. Validate/auth live *inside* the routers on the routes that need them (not globally).

### 6.3 `db.ts` — env-driven pool

```ts
import { Pool } from "pg";

export const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT ?? 5432),
});
```
Single shared pool = one set of connections, reused across requests. Values come from `.env` — no hardcoded creds in code.

### 6.4 `types.ts` — payload + request augmentation

```ts
export interface AuthTokenPayload {
  id: number;
  email: string;
}

declare global {
  namespace Express {
    interface Request { userId?: number }   // added by requireAuth
  }
}
```
`declare global` lets Express's own `Request` type carry `req.userId` so `routes` compile with `req.userId` instead of casting. This file being a module (it exports) is what makes `declare global` legal.

### 6.5 `security.ts` — one place for hash + token logic

```ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AuthTokenPayload } from "./types.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";
const JWT_EXPIRES_IN = "2h";

export const hashPassword     = (pw: string) => bcrypt.hash(pw, 10);
export const comparePassword  = (pw: string, hash: string) => bcrypt.compare(pw, hash);
export const signToken = (payload: AuthTokenPayload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
export const verifyToken = (token: string) => jwt.verify(token, JWT_SECRET);
```
- `bcrypt.hash` with 10 salt rounds is the standard cost.
- `jwt.sign` payload is the *user identity* — that's what every later request proves.
- Keep secret/expiry in one function so routes never deal with JWT internals.

### 6.6 `middleware/validate.ts` — zod becomes middleware (criterion: Zod Validation)

```ts
import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

export const validate = (schema: ZodTypeAny) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);  // ZodError -> errorHandler -> 400
    req.body = result.data;                          // validated & typed from here on
    next();
  };
```
- `safeParse` never throws — you decide how to fail (here: hand off the `ZodError`).
- Using it as a **factory** (`validate(createSchema)`) means one line per route registers validation.
- Replacing `req.body` with `result.data` guarantees downstream handlers see only validated, trimmed, prodded data.

### 6.7 `middleware/auth.ts` — the JWT guard (criterion: JWT Authentication)

```ts
import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { verifyToken } from "../security.js";

const httpError = (status: number, message: string) => {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
};

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) return next(httpError(401, "No token provided"));

  try {
    const payload = verifyToken(token);
    if (typeof payload === "string" || typeof (payload as JwtPayload).id !== "number") {
      return next(httpError(401, "Invalid token payload"));
    }
    req.userId = (payload as JwtPayload).id as number;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
      return next(httpError(401, "Invalid or expired token"));
    }
    next(error);
  }
}
```
Attach once and it protects the whole router:
```ts
<resource>Router.use(requireAuth);
```
> **The runtime trap that actually bit the reference build:** `import { JsonWebTokenError } from "jsonwebtoken"` *type-checks* but **crashes in ESM** ("does not provide an export named …"), because the CJS module's named exports aren't detected by Node. Use `import jwt from "jsonwebtoken"` and read `jwt.TokenExpiredError` / `jwt.JsonWebTokenError` off the default.

**Why `login` and `requireAuth` must always answer the same way:** uniform handling on the frontend — one `401` branch (logout) covers bad, expired, and missing tokens.

### 6.8 `middleware/errorHandler.ts` — one mapping table (criterion: Express Middlewares)

```ts
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "HttpError"; }
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  if (error instanceof HttpError) {
    return res.status(error.status).json({ message: error.message });
  }
  if (error instanceof Error && typeof (error as Error & { status?: number }).status === "number") {
    return res.status((error as Error & { status: number }).status).json({ message: error.message });
  }
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
}
```
**Why:** every route can now `throw new HttpError(401, "…")` (or plain error with `.status`) and the *behavior* (status code + JSON shape) lives in one place. Express 5 also forwards rejected async handlers here automatically — no `try/catch` boilerplate in routes.

Mapping contract used everywhere in the app:

| Error | HTTP | Body |
|---|---|---|
| `ZodError` | 400 | `{ message, issues[] }` |
| `HttpError`/`.status` | its status | `{ message }` |
| `TokenExpired/JsonWebToken` | 401 | `{ message }` |
| unknown | 500 + `console.error` | `{ message }` |

### 6.9 `schemas/auth.zod.ts`

```ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),            // zod v4 top-level email (not .email())
  password: z.string().min(6),
});

export const registerSchema = loginSchema;
```
**Why `z.email()`:** zod v4 moved to a top-level `z.email()`; the string `.email()` method is deprecated. `min(6)` matches the seed/signup UX so a too-short password is caught before reaching the DB.

### 6.10 `schemas/<resource>.zod.ts`

```ts
import { z } from "zod";

const severityEnum = z.enum(["low", "medium", "high", "critical"]);
const statusEnum   = z.enum(["open", "in-progress", "resolved"]);

export const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  severity: severityEnum,
});

export const updateSchema = z.object({
  severity: severityEnum.optional(),   // allow changing these two fields
  status:   statusEnum.optional(),
});
```
**Why `partial`-style update schema and no `refine`:** the "at least one field" rule is enforced in the route (if nothing present → `400 Nothing to update`), keeping the schema a plain field validator — simpler and easier to grade than a `superRefine`.

### 6.11 `routes/auth.routes.ts`

```ts
import { Router } from "express";
import { pool } from "../db.js";
import { HttpError } from "../middleware/errorHandler.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, registerSchema } from "../schemas/auth.zod.js";
import { comparePassword, hashPassword, signToken } from "../security.js";

export const authRouter = Router();

authRouter.post("/auth/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const { rows } = await pool.query("SELECT id, email, password_hash FROM users WHERE email = $1", [email]);
  const user = rows[0];
  if (!user) throw new HttpError(401, "Invalid credentials");

  const ok = await comparePassword(password, user.password_hash);
  if (!ok) throw new HttpError(401, "Invalid credentials");

  res.json({ token: signToken({ id: user.id, email: user.email }), user: { id: user.id, email: user.email } });
});

authRouter.post("/auth/register", validate(registerSchema), async (req, res) => {
  const { email, password } = req.body;

  const { rowCount } = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if ((rowCount ?? 0) > 0) throw new HttpError(409, "Email already registered");

  const passwordHash = await hashPassword(password);
  const { rows } = await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
    [email, passwordHash],
  );
  const user = rows[0];

  res.status(201).json({ token: signToken({ id: user.id, email: user.email }), user });
});
```
- **Same error for wrong email OR wrong password** ("Invalid credentials") — don't leak which one you failed.
- **`rowCount` can be `null`** from `pg` — hence `(rowCount ?? 0) > 0`. This exact nullability is a classic typecheck failure.
- login/register return the **same shape** (`{ token, user }`), which the frontend treats identically.

### 6.12 `routes/<resource>.routes.ts` — full CRUD, user-scoped

```ts
import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { validate } from "../middleware/validate.js";
import { createSchema, updateSchema } from "../schemas/<resource>.zod.js";

export const <resource>Router = Router();
<resource>Router.use(requireAuth);                 // everything below needs a JWT

const toResource = (row: any) => ({                // snake_case -> camelCase at the edge
  id: row.id, title: row.title, description: row.description,
  severity: row.severity, status: row.status,
  userId: row.user_id, createdAt: row.created_at, updatedAt: row.updated_at,
});

// CREATE
<resource>Router.post("/<resources>", validate(createSchema), async (req, res) => {
  const { title, description, severity } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO <resources> (title, description, severity, status, user_id)
     VALUES ($1, $2, $3, 'open', $4) RETURNING *`,
    [title, description ?? "", severity, req.userId],
  );
  res.status(201).json(toResource(rows[0]));
});

// READ ALL (user-scoped)
<resource>Router.get("/<resources>", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM <resources> WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.userId],
  );
  res.json(rows.map(toResource));
});

// UPDATE (partial, own-row-only)
<resource>Router.patch("/<resources>/:id", validate(updateSchema), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new HttpError(400, "Invalid id");

  const updates: string[] = [];
  const params: unknown[] = [id, req.userId];
  for (const key of ["severity", "status"] as const) {
    if (req.body[key] !== undefined) {
      params.push(req.body[key]);
      updates.push(`${key} = $${params.length}`);
    }
  }
  if (updates.length === 0) throw new HttpError(400, "Nothing to update");
  updates.push("updated_at = now()");

  const { rows, rowCount } = await pool.query(
    `UPDATE <resources> SET ${updates.join(", ")} WHERE id = $1 AND user_id = $2 RETURNING *`,
    params,
  );
  if (rowCount === 0) throw new HttpError(404, "Resource not found");
  res.json(toResource(rows[0]));
});

// DELETE
<resource>Router.delete("/<resources>/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new HttpError(400, "Invalid id");

  const { rowCount } = await pool.query(
    `DELETE FROM <resources> WHERE id = $1 AND user_id = $2`,
    [id, req.userId],
  );
  if (rowCount === 0) throw new HttpError(404, "Resource not found");
  res.status(204).end();
});
```

Why each decision:
- **`WHERE user_id = $1` on every query** — the scoping rule. Users see/edit/delete only their own rows. Putting `user_id = $2` inside UPDATE/DELETE means a foreign user's attempt hits **0 rows → 404** ("does not exist"), the classic secure-by-omission behavior.
- **Dynamic UPDATE string** — the zod schema stays the source of truth for *which* fields are updatable, and the SQL is built from the fields actually present. `updated_at = now()` is appended so the frontend shows freshness.
- **`RETURNING *`** — one round-trip: mutate *and* get the new row to echo back to the client.
- **`204` with no body** for DELETE — matches `content-length: 0` conventions and the frontend's `request()` wrapper handles it specially.
- **Mapper at the boundary** — Postgres returns `user_id/created_at`; the "Invalid Date" bug happened precisely because the frontend read `createdAt`. Normalizing once in `toResource` fixes it for the whole client.

### 6.13 `scripts/seed.ts` — first users

```ts
import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "../src/db.js";

const email    = process.env.SEED_EMAIL ?? "demo@test.com";
const password = process.env.SEED_PASSWORD ?? "password123";

const passwordHash = await bcrypt.hash(password, 10);
await pool.query(
  `INSERT INTO users (email, password_hash) VALUES ($1, $2)
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
  [email, passwordHash],
);
console.log(`Seeded user: ${email} / ${password}`);
await pool.end();
```
- **Why seed when the spec only has `login`:** without a register endpoint in the endpoint list, you still need *a* user to log in. This is the resolution of the "first user" question.
- `ON CONFLICT ... DO UPDATE` makes it **idempotent** — rerun whenever you change `SEED_PASSWORD` or with new env vars (`$env:SEED_EMAIL='other@test.com'`) to also create a *second* user for scoping tests.
- It lives under `scripts/` (outside `rootDir: src`) so the production `tsc` build ignores it; `tsx` runs it directly.

---

## 7. Running the backend

```bash
npm run seed      # once, before first login
npm run dev       # :3000, auto-restarts
npm run typecheck # should be silent
npm run build && npm start   # production path
```

---

## 8. Verification playbook (the "am I done" script)

| # | Call | Expect |
|---|---|---|
| 1 | `POST /api/auth/login` w/ seed creds | 200, `{ token, user }` |
| 2 | `POST /api/auth/login` wrong password | 401 |
| 3 | `POST /api/<resources>` w/ token | 201, resource with `userId` |
| 4 | `GET /api/<resources>` w/ token | 200 array (only own rows) |
| 5 | `PATCH /api/<resources>/:id` `{severity,status}` | 200 updated |
| 6 | `PATCH ...` with empty `{}` | 400 |
| 7 | `DELETE /api/<resources>/:id` | 204 |
| 8 | Same route, **no token** | 401 |
| 9 | Create with invalid enum | 400 + zod `issues` |
| 10 | User B lists / patches user A's row | empty list / 404 |
| 11 | `POST /api/auth/register` duplicate email | 409 |

Each numbered row is one rubric point made visible over HTTP — graders love output like this.

---

## 9. Backend pitfall ledger (all real, all fixed during the reference build)

| Pitfall | Cause | Fix |
|---|---|---|
| `import { JsonWebTokenError } from "jsonwebtoken"` crashes | CJS named exports invisible to ESM loader | default import + `jwt.TokenExpiredError` |
| `ERR_MODULE_NOT_FOUND` on relative import | NodeNext needs extensions | `from "./db.js"` |
| `id` comes back as a string | `BIGSERIAL` → `pg` returns int8 as string | use `SERIAL` |
| `user_id`/`created_at` keys vs camelCase client | Postgres snake_case | `toResource()` mapper |
| `rowCount > 0` type error | `pg` types `rowCount` as `number \| null` | `(rowCount ?? 0) > 0` |
| Express 5 handler throws → 500 with no detail | (expected) | add `errorHandler` last + `HttpError` |
| `SEED` duplicates | racy / rerun | `ON CONFLICT DO UPDATE` |

---

## 10. Rubric → backend evidence

| Criterion | Where it lives |
|---|---|
| Zod Validation | `schemas/*.zod.ts` + `validate()` + 400 `{ issues }` shape |
| JWT Authentication | `security.ts` (sign), `auth.ts` (verify guard), 401s |
| Express Middlewares | `app.ts` order: `cors` → `json` → routers → `errorHandler` |
| Full CRUD | `POST/GET/PATCH/DELETE` + 201/200/204/404 scoped handlers |