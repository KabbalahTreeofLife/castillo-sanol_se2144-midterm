# Full-Stack CRUD + Auth — Complete Project Guide

> **Purpose:** A step-by-step recipe for building a *Node.js (Express + TypeScript + DB) backend* and a *React (TypeScript) frontend* with: **Zod validation, JWT auth, Express middleware, full CRUD, React Context + useReducer, and global dispatching**.
>
> It is written generically — the "resource" below could be incidents/tickets, products, tasks, bookings, inventory items, blog posts, members, etc. The PulseDesk codebase is used as the worked example throughout, and every pitfall listed is one that implementation actually hit.

---

## 0. How to read this guide

- **`<Resource>`** = your domain entity (what the app manages). Example: `Incident`, `Product`, `Task`, `Booking`.
- **`<resource>`** = lowercase plural for routes/tables: `/api/incidents`, `incidents` table.
- **`[USER-*]`** = owner-scoping. The `.env`, `.env` field names and seeded credentials are the only per-project knobs besides the domain.

Use it in three modes:
1. **Greenfield** — follow Step 1 through Step 7 in order.
2. **Rubric check** — jump to §8 and §9 before submitting.
3. **Sparse-spec rescue** — you only have the prompt text (endpoints in a messy table, a sample `State`/`Action` snippet, a tech matrix). Read §1 and §11 first.

---

## 1. Step 0 — Parse a sparse/messy spec

Often the assignment is given as a wall of text: a technology matrix, a "core assessment criteria" sentence, a garbled endpoint table (sometimes as an image), and a sample frontend `State`/`Action` snippet. You must convert that into a working app. Procedure:

### 1.1 Build a translation table from the spec text

Go line by line and produce a checklist like this one (this is exactly what a PulseDesk-style spec maps to):

| Spec says | What it means | Where it lands |
|---|---|---|
| `POST /api/auth/login` — Public — "Zod Login" — "Returns JWT Token" | Public login endpoint, body validated by a zod schema, returns a signed JWT (and usually the user object) | `routes/auth.routes.ts` + `schemas/auth.zod.ts` |
| `POST /api/<resources>` — JWT Protected — `validate(createSchema)` — "CREATE" | Signed-in users can create a resource; body validated | `routes/<resource>.routes.ts` + `schemas/<resource>.zod.ts` |
| `GET /api/<resources>` — JWT — "READ All" | List resources *for the authenticated user* (decide scoping — see §4.9) | route handler |
| `PATCH /api/<resources>/:id` — JWT — `validate(updateSchema)` — "UPDATE Status/Severity" | Partial update of specific fields | route handler + `.partial()` schema |
| `DELETE /api/<resources>/:id` — JWT — "DELETE" | Delete a resource (maybe only when a flag like `resolved` is set) | route handler |
| Core criteria list | Non-negotiable rubric; demo each one explicitly | §8 table |

> **If the endpoint image/table is missing or mangled** (characters like `lapi` are clearly `/api`, `i d` is `:id`), reconstruct it from the CRUD criteria: a public `auth/login`, plus `POST`/`GET`/`PATCH`/`DELETE` on the resource. Everything else is detail.

### 1.2 Decide the unanswered questions explicitly

Any spec will leave gaps. Detection questions to ask (and default answers if you must choose):

1. **Ownership scope** — do users see *their own* rows or *all* rows? *(Default that matches most rubrics: user-scoped — every query filters by the JWT's user id. It's also the safer/impressive choice and exposes "security" naturally.)*
2. **First user** — the spec only has `login`; how does anyone log in? *(Seed a demo user script — recommended. Or add `register` as a bonus.)*
3. **Delete rule** — the overview says "delete resolved tickets"; is that enforced on the frontend (button enabled only when condition true) and/or backend? *(Frontend enforcement is enough to satisfy the description.)*
4. **Routing** — are there multiple pages? *(A single view that switches login ⇄ dashboard based on `state.user` needs zero extra deps and is simpler to grade than `react-router`.)*
5. **DB** — in-memory vs real DB. *(If the scaffold already has `pg` + a `.env` with credentials, use Postgres. A real DB is what "DB" in the architecture line implies.)*

Write the decisions at the top of your implementation notes — they become the spec you actually build against.

### 1.3 The "same context only" case

If you are given *literally the same shape* of prompt (technology matrix + criteria + endpoint table + `State`/`Action` sample + `initialState` snippet), the recipe is always:

1. Backend: reuse the middleware trio `validate()` + `requireAuth()` + `errorHandler()`, sign JWT at login, and a `POST/GET/PATCH/DELETE` set on one resource.
2. Frontend: reproduce the sample `State`/`Action`/`initialState` almost verbatim (it is a *specification of what your reducer must support*), then extend with `*_START`/`LOGOUT` actions and action creators.
3. Prove each rubric line exists in code (§8) and prove it works over HTTP (§7).

The sample snippet is a contract, not a suggestion — name actions exactly as shown (`SET_AUTH`, `FETCH_SUCCESS`, ...). Add extra actions, don't rename the given ones (in PulseDesk the spec's `SET_AUTH` was kept verbatim while its draft `any` payload was upgraded to a typed `User`).

---

## 2. Step 1 — Scaffold both apps

### Backend
```
npx create-express-ts (or manual)
```
Manual minimum layout:
```
api/
  package.json          # "type":"module", scripts: dev/build/start/typecheck/seed
  tsconfig.json         # target ES2022, module NodeNext, moduleResolution NodeNext, strict, types:["node"]
  .env                  # PORT, DB creds, JWT_SECRET
  schema.sql            # DDL, run once via psql
  scripts/seed.ts       # create the first user (see §4.3)
  src/
    index.ts            # bootstrap only: dotenv + app.listen
    app.ts              # express app, middleware order (see §4.4)
    db.ts               # pg Pool from env
    types.ts            # JWT payload + Express.Request augmentation
    security.ts         # bcryptjs hash/compare + jwt sign/verify
    schemas/            # *ard.zod.ts files
    middleware/         # auth.ts, validate.ts, errorHandler.ts
    routes/             # auth.routes.ts, <resource>.routes.ts
```

Key `package.json` bits:
```jsonc
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "seed": "tsx scripts/seed.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  }
}
```
Core deps: `express`, `cors`, `jsonwebtoken`, `bcryptjs`, `zod`, `dotenv`, `pg`. Dev: `tsx`, `typescript`, `@types/{express,cors,jsonwebtoken,pg,node}`.

> ⚠️ **The dependency set is FIXED — it does not change with the topic.** Whether the resource is incidents, products, tasks, or bookings, the backend always uses *exactly* this list. Install once, reuse on every project:
>
> ```bash
> npm i express cors jsonwebtoken bcryptjs zod dotenv pg
> npm i -D tsx typescript @types/express @types/cors @types/jsonwebtoken @types/pg @types/node
> ```
> (Only the *domain* changes — never the packages. See §10.)

### Frontend
```
npm create vite@latest frontend -- --template react-ts
```
- Keep the stock Vite/React/TS scaffold. Add `styled-components` (optional, but consistent styling).
- The template ships global CSS (`index.css`) with theme vars and forced `#root` layout — **replace it** with your own minimal reset (§6) rather than fighting it.

> ⚠️ **Frontend deps are fixed too** — `react`, `react-dom`, `typescript`, `vite`, and `styled-components`. That's the whole list, for every topic:
>
> ```bash
> npm i styled-components
> ```
> (Again, only the *domain/UI labels* change between topics — the dependency set does not. See §10.)

---

## 3. Step 2 — Design the domain & database

### 3.1 The universal two-table shape

Every assignment of this kind has the same shape: **users** + **the resource**.

```sql
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS <resources> (
  id              SERIAL PRIMARY KEY,
  title           TEXT NOT NULL,                 -- or whatever your "name/field" is
  <extra fields>  ...,
  <enum_field>    TEXT NOT NULL DEFAULT '<default>'
                  CHECK (<enum_field> IN ('a', 'b', 'c')),
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', '<working>', '<done>')),
  user_id         INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.2 Rules that will save you hours

- **`SERIAL`, not `BIGSERIAL`.** The `pg` driver returns `int8` (bigint) as a **string**, `int4` (int) as a **number**. Use `SERIAL` so `id` and `user_id` come back as numbers and match your TypeScript types and `DELETE/UPDATE WHERE id = ?` logic without casting.
- **Enforce enums in the DB and in zod** (defense in depth) — the `CHECK` constraint catches anything zod misses.
- **`TIMESTAMPTZ`** — better than `TIMESTAMP`; also grant `updated_at = now()` on PATCH.
- **`ON DELETE CASCADE`** on `user_id` — deleting a user removes their rows (and is a nice "scoping" detail).

Database isn't just storage; the table columns *are* your `Create`/`Update` zod schemas' other half. Define the schema's allowed fields first, then mirror them in zod.

---

## 4. Step 3 — Backend fundamentals (these never change)

### 4.1 ESM + NodeNext: append `.js` to relative imports

With `"type": "module"` and `moduleResolution: NodeNext`, every relative import needs the `.js` extension even though the source file is `.ts`:

```ts
import { pool } from "../db.js";        // not "./db"
import { validate } from "../middleware/validate.js";
```
TypeScript rewrites it correctly at build, `tsx` runs it directly. Forgetting this is the #1 startup crash (`ERR_MODULE_NOT_FOUND`).

### 4.2 Express 5: async handlers self-forward errors

Express 5 automatically forwards a rejected promise from an async handler/middleware to the error handler **without** `try/catch` or `next(e)`:

```ts
router.post("/x", async (req, res) => {
  const user = (await pool.query(...)).rows[0];
  if (!user) throw new HttpError(401, "Invalid credentials");  // Express 5 handles it
  res.json(...);
});
```

### 4.3 Authentication: bcryptjs + jsonwebtoken

- `bcryptjs` (pure JS — no native build, cross-platform safe). Same API as `bcrypt`:

```ts
export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const comparePassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
```

- `jsonwebtoken` sign/verify wrapped in one place:

```ts
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";
export const signToken = (p: { id: number; email: string }) =>
  jwt.sign(p, JWT_SECRET, { expiresIn: "2h" });
export const verifyToken = (token: string) => jwt.verify(token, JWT_SECRET);
```

- Payload/request types live in `types.ts`, including the global augmentation so `req.userId` compiles:

```ts
export interface AuthTokenPayload { id: number; email: string }
declare global {
  namespace Express { interface Request { userId?: number } }
}
```

- **Seed the first user** (specs almost never include register): a `scripts/seed.ts` that upserts a demo account so `login` has something to match:

```ts
await pool.query(
  `INSERT INTO users (email, password_hash) VALUES ($1, $2)
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
  [email, await bcrypt.hash(password, 10)],
);
```
Make email/password configurable via env (`SEED_EMAIL`, `SEED_PASSWORD`) so you can create a *second* user later for scoping tests.

### 4.4 The middleware trio (this *is* the "Express Middlewares" criterion)

Order in `app.ts` matters:

```ts
app.use(cors());
app.use(express.json());
app.use("/api", authRouter);
app.use("/api", <resource>Router);
app.get("/api/health", ...);     // optional
app.use(errorHandler);            // ALWAYS last
```

**a. `validate(schema)` — turns zod into middleware:**

```ts
import type { ZodTypeAny } from "zod";
export const validate = (schema: ZodTypeAny) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return next(result.error);   // ZodError -> errorHandler -> 400
  req.body = result.data;                            // now trusted/typed
  next();
};
```

**b. `requireAuth` — guards a whole router:**

```ts
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return next(httpError(401, "No token provided"));
  try {
    const payload = verifyToken(token);
    if (typeof payload === "string" || typeof payload.id !== "number")
      return next(httpError(401, "Invalid token payload"));
    req.userId = payload.id;
    next();
  } catch (err) {
    // TokenExpiredError / JsonWebTokenError -> 401
    if (err instanceof jwt.TokenExpiredError || err instanceof jwt.JsonWebTokenError)
      return next(httpError(401, "Invalid or expired token"));
    next(err);
  }
}
// attach to a router:
router.use(requireAuth);
```
> ⚠️ **jsonwebtoken CJS gotcha (real bugs hit):** in ESM, `import { JsonWebTokenError } from "jsonwebtoken"` fails at runtime — the package's named exports aren't detectable by the ESM loader. Access them off the default import: `jwt.JsonWebTokenError`, `jwt.TokenExpiredError`.

**c. `errorHandler` — one mapping table:**

| Error | HTTP | Body |
|---|---|---|
| `ZodError` | 400 | `{ message, issues: [{ path, message }] }` |
| `HttpError(status, msg)` | its status | `{ message }` |
| `TokenExpiredError` / `JsonWebTokenError` | 401 | `{ message }` |
| anything else | 500 (+ `console.error`) | `{ message: "Internal server error" }` |

```ts
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
// helper to attach status to plain errors without a class:
const httpError = (status: number, message: string) => {
  const e = new Error(message); (e as Error & {status:number}).status = status; return e;
};
```

### 4.5 Zod v4 — the API that changed

If `zod` v4 is installed, remember:
- `z.email()` top-level (the `.email()` string method is deprecated).
- `.partial()` for update schemas.
- `.enum([...])` for fixed sets.
- Errors on `result.error.issues` (not `.errors`).
- `safeParse` is preferred over `throw`-style `.parse` in middleware.

```ts
// auth schema
export const loginSchema = z.object({ email: z.email(), password: z.string().min(6) });

// resource schemas — mirror the DB CHECKs
export const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
});
export const updateSchema = z.object({
  severity: z.enum(["low","medium","high","critical"]).optional(),
  status:   z.enum(["open","in-progress","resolved"]).optional(),
});
```

### 4.6 Route CRUD baked for any resource

The four handlers and one scoping trick that make CRUD "full" and safe:

```ts
// CREATE (scope it to the requester)
INSERT INTO <resources> (..., user_id) VALUES (..., $n, $req.userId) RETURNING *;   // 201

// READ ALL (the scoping rule)
SELECT * FROM <resources> WHERE user_id = $1 ORDER BY created_at DESC;

// UPDATE (partial, own-row-only, one query, no ownership race)
UPDATE <resources> SET <cols you allowed> , updated_at = now()
WHERE id = $1 AND user_id = $2 RETURNING *;   // 0 rows => 404 (not yours or doesn't exist)

// DELETE (same single-query ownership trick)
DELETE FROM <resources> WHERE id = $1 AND user_id = $2;   // 204 if 1 row, else 404
```

Build the UPDATE set dynamically from the validated fields so the schema stays the source of truth:

```ts
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
// UPDATE <resources> SET ${updates.join(", ")} WHERE id = $1 AND user_id = $2 RETURNING *
```
Validate `:id`: `Number.isInteger(Number(req.params.id))` → 400 otherwise.

### 4.7 Serialize to the client shape in one place

Postgres returns snake_case (`user_id`, `created_at`); the frontend types are camelCase (`userId`, `createdAt`). Normalize **at the API boundary** with a mapper so the wire contract matches the TS types:

```ts
function toResource(row: ResourceRow) {
  return {
    id: row.id, title: row.title, ...,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```
Apply it on CREATE, UPDATE, and map the LIST. One mapper per resource; never sprinkle field renames through route code.

### 4.8 Register vs. seed

If you add `POST /api/auth/register` (or "sign up" is in the spec), the handler is: validate → duplicate-email check (`409 Email already registered`) → `bcrypt.hash` → `INSERT ... RETURNING id, email` → sign token → `201 { token, user }`. Return the exact same shape as login; the frontend then treats both identically.

### 4.9 Ownership scoping — the one design decision to get right

- **Global** (everyone sees all rows): simpler, matches "READ All" literally, but nothing to demo about isolation.
- **User-scoped** (each user sees/edits only their own): every query has `WHERE user_id = $1`. The `AND user_id` in UPDATE/DELETE means a foreign user gets **404**, not 403 — indistinguishable from "doesn't exist", which is the desired privacy behavior.

Choose user-scoped by default unless the spec says everyone shares.

---

## 5. Step 4 — Backend build order (recipe)

Build in this order and check `npm run typecheck` + run the server after each group:

1. `db.ts`, `types.ts`, `security.ts` — infrastructure. (Typecheck.)
2. `middleware/validate.ts`, `middleware/auth.ts`, `middleware/errorHandler.ts`. (Typecheck.)
3. `schemas/*.zod.ts`. (Typecheck.)
4. `routes/auth.routes.ts` (login; register if needed). (Server up + curl login.)
5. `routes/<resource>.routes.ts` (POST/GET/PATCH/DELETE). (Curl full CRUD.)
6. `app.ts` (wire order per §4.4), `index.ts`. (Full HTTP pass.)

Run `npm run seed` once the schema+seed script exist. Apply schema with:
```
psql -U postgres -d <yourdb> -f schema.sql
```
(Set `PGPASSWORD` in the shell or use the PG* env vars from `.env`.)

---

## 6. Step 5 — Frontend fundamentals

### 6.1 Vite proxy (avoid CORS pain entirely)

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:3000" } },
});
```
Frontend then fetches `/api/...` same-origin; the backend can keep its `cors()` anyway. Use `''` as your API base URL.

### 6.2 API client — one wrapper

Centralize `fetch`, token header, error parsing, and `204` handling so every action creator is 3 lines:

```ts
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = body.issues?.map(i => i.message).join("; ");
    const err = new Error(detail ? `${body.message ?? "Request failed"}: ${detail}` : (body.message ?? "Request failed"));
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return res.json() as T;
}
```
Group calls in an `api` object (login/register/fetchAll/create/update/delete) so the reducer can't accidentally touch HTTP.

### 6.3 Types — turn the spec's sample into a contract

The spec sample is a *minimum*. Keep its action names, fix its sloppiness (`any` → typed `User`; `string` id → `number` if your DB says so):

```ts
export type Status = "open" | "in-progress" | "resolved";   // any enum field
export interface User { id: number; email: string }
export interface Resource {
  id: number; title: string;
  /* enum fields, user_id, timestamps */ createdAt: string;
}
export interface State {
  user: User | null;
  token: string | null;
  resources: Resource[];
  loading: boolean;
  error: string | null;
}
export type Action =
  | { type: "AUTH_START" }
  | { type: "SET_AUTH"; payload: { user: User; token: string } }  // spec-mandated name
  | { type: "LOGOUT" }
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: Resource[] }
  | { type: "CREATE_SUCCESS"; payload: Resource }
  | { type: "UPDATE_SUCCESS"; payload: Resource }
  | { type: "DELETE_SUCCESS"; payload: number }
  | { type: "SET_ERROR"; payload: string };
```

### 6.4 Context + useReducer (the rubric centerpiece)

- **Reducer is pure.** A `switch` over `Action`; every case returns a new state (map/filter/spread — never mutate). No `fetch` inside the reducer.
- **`initialState` reads the persisted token:** `token: localStorage.getItem("token")`.
- **Provider exposes TWO surfaces** — this is what graders mean by "global dispatching":
  1. `dispatch` itself (any component can fire any action),
  2. action *creators* (`login`, `register`, `fetchAll`, `create`, `update`, `remove`) that do the async `api.*` call then `dispatch` the matching `_SUCCESS`/`SET_ERROR`.

```tsx
const value = { ...state, dispatch, login, logout, fetchAll, create, update, remove };
return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
```
- **Persistence:** `login`/`register` write `localStorage.setItem("token", token)`; `logout` removes it and resets `resources: []`.
- **Session heal:** on mount, if a token exists, auto-`fetchAll()`. In every catch, if `error.status === 401` → `logout()` (kills stale/expired sessions everywhere).
- **Wrap the whole app** in the provider (in `main.tsx`), not one page.

Split files to keep Fast-refresh lint happy (oxlint's `only-export-components`):
```
context/incidentContext.ts     # createContext + the context value interface
context/useIncidents.ts        # useIncidents() hook
context/IncidentContext.tsx    # <IncidentProvider/> + reducer + action creators only
```

### 6.5 Components (minimum set, any topic)

- `AuthForm.tsx` — login + signup toggle (a `mode` state; button label + autocomplete change). Disable while `loading`; show `error`.
- `ModelForm.tsx` — create/edit the resource (inputs + a dropdown for enum fields).
- `ModelList.tsx` — maps `state.resources`; spinner while `loading`; empty state.
- `ModelCard.tsx` — one row: title, badges, enum dropdowns that call `update(id, {field})`, and a delete button that is **disabled unless the delete-condition is true** (this is how "delete resolved tickets" becomes a frontend rule).
- A **custom `Select`** because native `<select>` can't be styled consistently (§6.6).

`App.tsx` then becomes a one-liner switch: `user ? <Dashboard/> : <AuthForm/>`, plus an error banner whose dismiss calls `dispatch({ type: "SET_ERROR", payload: "" })` directly — an explicit, visible use of global dispatch.

### 6.6 Styling traps actually hit

- **Forced dark mode / invisible text:** template CSS (`index.css`) ships `color-scheme: light dark` + `@media (prefers-color-scheme: dark)` that flips `--bg` to near-black while your components hardcode dark text (`#0f172a`) → invisible heading. **Force light mode**: `color-scheme: light`, drop the dark media block, plain white body, `box-sizing: border-box`, no `text-align:center`/forced `display:flex` on `#root`.
- **Form controls inherit the UA dark scheme**: a native `<select>`/`<input>` on a white background gets white text in dark scheme → set `color-scheme: light` *and* explicit `color`/background on every control you style.
- **Native `<select>` limits**: the OS-drawn option list won't match the button and you can't style an open/closed arrow. Build a small custom dropdown: a `<button>` + absolutely positioned `<ul>`, chevron rotates with open state, closes on outside-click/`Escape`, arrow keys move highlight, `role="listbox"`/`aria-expanded`. (Reusable `<Select>` component.)

---

## 7. Step 6 — Verification playbook (do this before submitting)

### 7.1 HTTP happy path (PowerShell or curl)

```powershell
# start:  node dist/index.js   (or npm run dev)
$R  = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -ContentType "application/json" -Body '{"email":"demo@test.com","password":"password123"}'
$h  = @{ Authorization = "Bearer $($R.token)" }
# create / list / patch / delete ... expect 201, 200, 200, 204
```

### 7.2 Negative matrix — prove the middleware works

| Test | Expect |
|---|---|
| login, wrong password | 401 |
| GET resource, no token | 401 |
| GET resource, garbage token | 401 |
| POST/PATCH with invalid enum or missing required field | 400 with zod issues |
| PATCH with empty body | 400 |
| PATCH/DELETE nonexistent id | 404 |
| register duplicate email | 409 |
| **user B patches/deletes user A's row** | **404 (scoping!)** |
| user B's list after user A created rows | empty |

These table rows are exactly what a grader/TA will click — run them all, and keep the output.

### 7.3 Quality gates

- `npm run typecheck` (api) — must be clean.
- `npm run build` && `npm run lint` (frontend) — build clean, lint zero warnings (split the hook file if the only warning is Fast-refresh).
- Start both, log in, create/update/delete in the browser, reload the page (token persistence + auto-fetch).

---

## 8. Step 7 — Map every criterion to a file (submit-time checklist)

Copy this table into your report and fill file names:

| Criterion | How to point at it | PulseDesk example |
|---|---|---|
| Zod validation | schemas + `validate()` middleware; 400 body shape | `schemas/*.zod.ts`, `middleware/validate.ts` |
| JWT auth | login returns token; `requireAuth` on the router; 401s | `security.ts`, `middleware/auth.ts` |
| Express middlewares | cors/json + validate + auth + global errorHandler ordered last | `app.ts` |
| Full CRUD | 4 routes with correct 201/200/204 + 404 ownership | `routes/<resource>.routes.ts` |
| Context + useReducer | `useReducer`, pure reducer switch, provider wraps app | `context/IncidentContext.tsx` |
| Global dispatching | `dispatch` on context + a place that dispatches directly | `context/useIncidents.ts`, `App.tsx` |

---

## 9. Pitfall ledger (every one of these bit the reference build)

| Pitfall | Fix |
|---|---|
| `import { X } from "jsonwebtoken"` works in TS, crashes at runtime in ESM | use `import jwt ... ` then `jwt.TokenExpiredError` |
| Relative imports missing `.js` under NodeNext | `import { pool } from "../db.js"` |
| `pg` returns bigint as string | use `SERIAL` (int4), not `BIGSERIAL` |
| `created_at`/`user_id` vs `createdAt`/`userId` mismatch → "Invalid Date" on the card | map snake_case→camelCase at the API boundary (`toResource`) |
| Dark-scheme white text on white styled controls | `color-scheme: light` + explicit `color`/`background` |
| Template `index.css` hides dark text / center-squishes header | replace it with a minimal light reset |
| Native `<select>` list styling + arrow state | custom dropdown component |
| async route handler crash not caught | Express 5 forwards rejections automatically — but keep a final `errorHandler` |
| `rowCount` can be null from `pg` | `(rowCount ?? 0)` before comparing |
| `npm uninstall bcrypt` EPERM on Windows leftover `.node` | ignore the cleanup warning; verify package.json |
| Fixing lint Fast-refresh warning | move non-component exports (the context, the hook) into separate files |
| Spec `SET_AUTH` literal name vs your own naming | keep the spec's exact action names; add extras around them |

---

## 10. Adapting to a *different topic* — worked transformation

Everything above is topic-agnostic. To pivot from "incident desk" to, say, **"library book reservations"**:

| PulseDesk concept | New project |
|---|---|
| `incidents` / `Incident` / `/api/incidents` | `books`/`Book`/`/api/books` (or `loans`), `/api/loans` |
| severity enum | `condition: ["new","good","worn"]` or `category` |
| status `open/in-progress/resolved` | status `available|reserved|borrowed` (any 3-way lifecycle) |
| "delete resolved tickets" | "delete only returned books" (frontend gate on `status === 'borrowed'` → disable) |
| Scoping | `WHERE user_id` = the borrower/member |

Mechanically it's *identical*: same tables, same middleware trio, same reducer, same client wrapper, same checklist, and **the exact same dependency set (§2)** — you never reinstall or swap packages when the topic changes. The ~40 lines that change are: the DB fields, the zod enums/fields, the UPDATE column list, and the card/form UI labels.

---

## 11. If you are given "just the same context" again

A stripped-down recipe that works from *just* the prompt text:

1. **Install the fixed dependency set** (§2 — backend `express cors jsonwebtoken bcryptjs zod dotenv pg` + TS tooling; frontend via the Vite react-ts template + `styled-components`). Same list every time; the topic only changes domain code.
2. **Decode the endpoint table** (§1.1). Rebuild `/api/auth/login` (public, zod, returns JWT) + `POST/GET/PATCH/DELETE /api/<resource>[/:id]` (all JWT, zod on create/update).
3. **Copy the sample `State`/`Action`/`initialState` almost verbatim** into `types/index.ts` and the context — then add `AUTH_START`, `LOGOUT`, `FETCH_START`, and typed payloads (§6.3).
4. **Make the rubric self-evident** in code and in HTTP output (§8, §7.2): one curl row per criterion.
5. **Ask yourself the 5 default questions** (§1.2) and write the answers next to the spec, because the spec won't contain them.
6. **Build in this order**, running the gates after each stage: schema → backend infra → middleware trio → schemas → auth routes → resource routes → app wiring → seed → frontend types/client → context/provider → components → styling reset → full HTTP pass → browser pass.

The reference implementation of this loop is the PulseDesk codebase: `api/src/*` for backend, `frontend/src/*` for client. Everything you need to *re-derive* the pattern is in the sections above.