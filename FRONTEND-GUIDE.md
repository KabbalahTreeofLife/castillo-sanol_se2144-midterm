# Frontend Guide — React (TypeScript) + Context API + useReducer

> A from-scratch, file-by-file guide for the frontend half of a *CRUD + JWT auth* assignment — the exact setup, configuration changes, and reasoning used by the PulseDesk reference build. Written generically: **`<Resource>`** = your domain entity (incident, product, task, booking, …).

---

## 1. What you'll have at the end

A single-page React app that proves *"React Context + useReducer"* and *"Global Dispatching"*:

- An **auth screen** (sign in ⇄ create account toggle)
- A **dashboard** that lists `<Resource>s`, creates new ones, updates enum fields, and deletes (with a gated delete button — e.g. only when `status === 'resolved'`)
- One **context provider** wrapping the whole app that exposes `{ state, dispatch, login, register, logout, fetchAll, create, update, remove }`
- Token persistence across reloads (`localStorage`) + automatic 401 → logout

---

## 2. Scaffold + dependencies (the setup step)

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm i styled-components
```

Why:
- The `react-ts` Vite template gives you React + TS + a dev server with HMR for free.
- **`styled-components`** is the only extra UI dependency — CSS-in-JS keeps every component's styles co-located and typed. (If you prefer plain CSS, skip it — the guide's structure is independent of it.)

**Fixed dependency set** — this is complete: `react`, `react-dom`, `typescript`, `vite`, and `styled-components`. Nothing else is needed for any topic variant.

### 2.1 The one template file to rewrite first: `src/index.css`

The stock template ships global CSS with a `@media (prefers-color-scheme: dark)` block plus a `#root { width:1126px; text-align:center; display:flex; ... }` layout for its demo page. **Both break real apps** (dark-scheme white-text-on-white controls; forced centering). Replace the whole thing with a minimal, forced-light reset:

```css
:root {
  color-scheme: light;                 /* lock form controls to light rendering */
  --text: #334155;
  --text-h: #0f172a;
  --bg: #ffffff;
  font-family: system-ui, 'Segoe UI', Roboto, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}
*, *::before, *::after { box-sizing: border-box; }
html, body, #root { margin: 0; padding: 0; }
body { background: var(--bg); color: var(--text); min-height: 100svh; }
#root { width: 100%; min-height: 100svh; }
h1, h2 { color: var(--text-h); }
```

**Why forced light:** the reference build's dark-scheme media query flipped the page background to near-black while styled components hardcoded dark text (`#0f172a`) — the title became *invisible black-on-black*, and native `<select>`/`<input>` controls rendered white text on white backgrounds. Locking `color-scheme: light` removes that entire class of bugs.

---

## 3. `vite.config.ts` — proxy to the API

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',   // dev: frontend :5173 -> backend :3000
    },
  },
})
```
**Why:** the API and the dev server run on different ports. With the proxy, `fetch('/api/...')` is same-origin from the browser's perspective — no CORS headaches, no hardcoded `http://localhost:3000` URLs scattered in code. (Keep `cors()` on the backend too; belt and suspenders.)

### tsconfig note (TypeScript 5/6 + Vite)

The template enforces `verbatimModuleSyntax`. That means:
```ts
import { useState } from 'react';        // value import — normal
import type { Severity } from '../types'; // type-only import — MUST use `import type`
```
Mix these up and the build fails with `"X is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled"`.

---

## 4. Directory layout (what you'll build)

```
frontend/
  src/
    types/index.ts                 # State/Action/domain contract     (§4.1)
    api/client.ts                  # fetch wrapper + api object        (§4.2)
    context/incidentContext.ts     # createContext + value interface   (§4.3)
    context/useIncidents.ts        # useIncidents() hook               (§4.4)
    context/IncidentContext.tsx    # reducer + provider + actions      (§4.5)
    components/Select.tsx          # custom dropdown                   (§4.6)
    components/AuthForm.tsx        # login/signup                      (§4.7)
    components/<Resource>Form.tsx  # create form                       (§4.8)
    components/<Resource>List.tsx  # list + loading/empty              (§4.9)
    components/<Resource>Card.tsx  # row + badges + update/delete      (§4.10)
    App.tsx                        # shell: auth ⇄ dashboard           (§4.11)
    main.tsx                       # wrap app in the provider          (§4.12)
```

---

## 4. The files, with the logic and the *why*

### 4.1 `src/types/index.ts` — the contract (criterion: the spec's State/Action)

The assignment usually gives you a sample `State`, `Action`, and `initialState`. Treat them as a **minimum contract**: keep their exact action names, fix their sloppiness (`any` → a real `User`), and extend with lifecycle actions.

```ts
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type Status   = 'open' | 'in-progress' | 'resolved';

export interface User { id: number; email: string }

export interface Incident {
  id: number;
  title: string;
  description?: string;
  severity: Severity;
  status: Status;
  userId: number;        // owner — matches scoped API responses
  createdAt: string;
  updatedAt?: string;
}

export interface State {
  user: User | null;
  token: string | null;
  incidents: Incident[];
  loading: boolean;
  error: string | null;
}

export type Action =
  | { type: 'AUTH_START' }
  | { type: 'SET_AUTH'; payload: { user: User; token: string } }  // spec-mandated name
  | { type: 'LOGOUT' }
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Incident[] }
  | { type: 'CREATE_SUCCESS'; payload: Incident }
  | { type: 'UPDATE_SUCCESS'; payload: Incident }
  | { type: 'DELETE_SUCCESS'; payload: number }
  | { type: 'SET_ERROR'; payload: string };
```

Why this exact set:
- **`token: string | null`** mirrors `localStorage.getItem('token')` (which returns `null`).
- **`SET_AUTH`** is kept verbatim from the spec sample — graders (or just the rubric) look for it.
- **`*_START` / `LOGOUT`** are the additions: they're the only way `loading` ever becomes `true` (the stock spec sample never turns `loading` on!) and `LOGOUT` resets everything.
- **`DELETE_SUCCESS` carries the id** so the reducer can filter it out.
- One types file is the single source of truth shared by the reducer, the API client, and every component — changing a field updates all three at once.

### 4.2 `src/api/client.ts` — one fetch wrapper, zero duplication

```ts
import type { Incident, Severity, Status } from '../types';

const BASE = '';   // '' because Vite proxies '/api' to the backend

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 204) return undefined as T;            // DELETE sends no body

  if (!res.ok) {
    let body: { message?: string; issues?: { message: string }[] } = {};
    try { body = await res.json() as typeof body; } catch { /* non-JSON body */ }
    const detail = body.issues?.map((i) => i.message).join('; ');
    const error = new Error(detail ? `${body.message ?? 'Request failed'}: ${detail}` : (body.message ?? 'Request failed')) as Error & { status: number };
    error.status = res.status;
    throw error;                                            // single error shape for all callers
  }
  return res.json() as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  fetchIncidents: () => request<Incident[]>('/api/incidents'),
  createIncident: (data: { title: string; description?: string; severity: Severity }) =>
    request<Incident>('/api/incidents', { method: 'POST', body: JSON.stringify(data) }),
  updateIncident: (id: number, data: { status?: Status; severity?: Severity }) =>
    request<Incident>(`/api/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteIncident: (id: number) => request<void>(`/api/incidents/${id}`, { method: 'DELETE' }),
};
```

**Why this matters — three things happen correctly here or nowhere:**
1. **Token attachment** — every authenticated call gets `Authorization: Bearer …` automatically. The reducer and components never touch `fetch`.
2. **Error normalization** — zod's `{ message, issues[] }` body is flattened into a readable `Error` with a `.status`. The reducer only needs one `.catch` path for *all* failures.
3. **`204` handling** — DELETE returns no body; unwrapping it would crash `.json()`. Guard it.

### 4.3 `src/context/incidentContext.ts` — the context + its shape

```ts
import { createContext, type Dispatch } from 'react';
import type { Action, Severity, State, Status } from '../types';

export interface IncidentContextValue extends State {
  dispatch: Dispatch<Action>;   // <-- the "Global Dispatching" surface
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchIncidents: () => Promise<void>;
  createIncident: (data: { title: string; description?: string; severity: Severity }) => Promise<void>;
  updateIncident: (id: number, data: { status?: Status; severity?: Severity }) => Promise<void>;
  deleteIncident: (id: number) => Promise<void>;
}

export const IncidentContext = createContext<IncidentContextValue | null>(null);
```

**Why its own file:** oxlint's `react(only-export-components)` rule (Fast-refresh correctness) only allows *components* to be exported from a `.tsx` file that also exports components. By splitting the context (`.ts`), the hook (`.ts`), and the provider component (`.tsx`) into separate files, lint runs with **zero warnings** while staying maintainable.

**Why `dispatch` is in the public interface:** "Global Dispatching" is demonstrated when components can fire actions *directly* from anywhere in the tree — not only via wrapped helpers. The ErrorBanner dismiss in `App.tsx` does exactly this.

### 4.4 `src/context/useIncidents.ts` — the typed hook

```ts
import { useContext } from 'react';
import { IncidentContext } from './incidentContext';

export function useIncidents() {
  const context = useContext(IncidentContext);
  if (!context) throw new Error('useIncidents must be used within an IncidentProvider');
  return context;
}
```
Throwing on `null` turns a silent "undefined is not an object" into a descriptive error when a component forgets the provider.

### 4.5 `src/context/IncidentContext.tsx` — the reducer + provider (criterion: Context + useReducer + Global Dispatching)

```tsx
import { useEffect, useReducer, type ReactNode } from 'react';
import { api } from '../api/client';
import type { Action, Severity, State, Status } from '../types';
import { IncidentContext, type IncidentContextValue } from './incidentContext';

const initialState: State = {
  user: null,
  token: localStorage.getItem('token'),   // restore session across reloads
  incidents: [],
  loading: false,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'AUTH_START':      return { ...state, loading: true, error: null };
    case 'SET_AUTH':        return { ...state, user: action.payload.user, token: action.payload.token, loading: false, error: null };
    case 'LOGOUT':          return { ...state, user: null, token: null, incidents: [], loading: false, error: null };
    case 'FETCH_START':     return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':   return { ...state, incidents: action.payload, loading: false, error: null };
    case 'CREATE_SUCCESS':  return { ...state, incidents: [action.payload, ...state.incidents], loading: false, error: null };
    case 'UPDATE_SUCCESS':  return {
      ...state,
      incidents: state.incidents.map((i) => (i.id === action.payload.id ? action.payload : i)),
      loading: false, error: null,
    };
    case 'DELETE_SUCCESS':  return {
      ...state,
      incidents: state.incidents.filter((i) => i.id !== action.payload),
      loading: false, error: null,
    };
    case 'SET_ERROR':       return { ...state, loading: false, error: action.payload };
    default:                return state;
  }
}

export function IncidentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  const fetchIncidents = async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const incidents = await api.fetchIncidents();
      dispatch({ type: 'FETCH_SUCCESS', payload: incidents });
    } catch (error) {
      if ((error as Error & { status: number }).status === 401) return logout();
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
    }
  };

  const login = async (email: string, password: string) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const { token, user } = await api.login(email, password);
      localStorage.setItem('token', token);
      dispatch({ type: 'SET_AUTH', payload: { user, token } });
      await fetchIncidents();
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
    }
  };

  const register = async (email, password) => { /* identical shape */ };

  const createIncident = async (data) => {
    try {
      const incident = await api.createIncident(data);
      dispatch({ type: 'CREATE_SUCCESS', payload: incident });
    } catch (error) {
      if ((error as Error & { status: number }).status === 401) return logout();
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
    }
  };

  const updateIncident = async (id, data) => { /* await api.updateIncident -> dispatch UPDATE_SUCCESS */ };
  const deleteIncident = async (id) => { /* await api.deleteIncident -> dispatch DELETE_SUCCESS */ };

  useEffect(() => {
    if (localStorage.getItem('token')) void fetchIncidents();   // session heal on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: IncidentContextValue = {
    ...state, dispatch, login, register, logout,
    fetchIncidents, createIncident, updateIncident, deleteIncident,
  };

  return <IncidentContext.Provider value={value}>{children}</IncidentContext.Provider>;
}
```

The four architectural rules to internalize:

1. **The reducer is 100% pure.** It receives `(state, action)` and returns a *new* state. It never fetches, never touches `localStorage`, never mutates arrays — `UPDATE` uses `.map`, `DELETE` uses `.filter`, `CREATE` prepends with spread. This purity is precisely what "useReducer" is being assessed for.
2. **HTTP lives in action creators, not the reducer.** Each `async` function calls `api.*` and then dispatches one `*_SUCCESS` or `SET_ERROR`. `dispatch` is the *only* channel from the async layer into state.
3. **Every side effect is reconciled:**
   - `login/register` write the token to `localStorage` *and* dispatch `SET_AUTH` — then fetch the fresh list so a signed-in user immediately sees their data.
   - `logout` removes the token and wipes `incidents` (so the *next* user doesn't see the previous one's data).
   - `401` anywhere → `logout()` — a single stale/expired token can't wedge the app.
   - `initialState` reads `localStorage`, so a reload keeps you signed in; the mount `useEffect` then re-hydrates the list.
4. **Global dispatching is real:** `dispatch` sits on the context value, and components may call it directly (see `App.tsx`'s error dismiss). That's the "Global Dispatching" rubric item made explicit.

### 4.6 `src/components/Select.tsx` — the custom dropdown (why not `<select>`)

Native `<select>` can't satisfy two requirements:
- its **open list** is rendered by the OS and can never match your button's styling;
- there's **no CSS state for open/closed**, so the arrow can't show state.

So build a small controlled dropdown. Core idea:

- a `<button>` shows the current label + a CSS chevron that **rotates 180°** when `open`;
- an absolutely-positioned `<ul role="listbox">` renders below it; each `li` is `role="option"`, highlights the selected and hovered items;
- it **closes on outside click** (`pointerdown` listener on `document`), on `Escape`, and after selecting;
- **arrow keys** move the highlight, `Enter`/`Space` toggle/select;
- full `aria-expanded` / `aria-haspopup="listbox"` / `aria-selected` wiring for accessibility.

The component is generic and reusable: `value`, `options: { value, label }[]`, `onChange`, `size`, optional `label`. Both the create form and each card use it.

### 4.7 `src/components/AuthForm.tsx` — login ⇄ signup

```tsx
const [mode, setMode] = useState<'signin' | 'signup'>('signin');
const { login, register, loading, error } = useIncidents();

const handleSubmit = (e: FormEvent) => {
  e.preventDefault();
  if (mode === 'signin') void login(email, password);
  else void register(email, password);
};
```
- A `SwitchButton` toggles `mode` ("Don't have an account? Sign up" ⇄ "Already have an account? Sign in").
- Button label changes (`Sign In` / `Create Account`), `autoComplete` switches between `current-password`/`new-password`, and `minLength={6}` mirrors the backend zod rule.
- Errors render from `state.error`; the submit button is disabled while `loading`.

**Why two modes share one form:** login and register return the *same* `{token, user}` shape, so both funnel through the same `SET_AUTH` action — a textbook example of the wire contract driving the UI.

### 4.8 `src/components/<Resource>Form.tsx` — create form

- Controlled `title` / `description` inputs + a `Select` for severity.
- On submit → `await createIncident(data)` → then **reset local state** so the form is ready for the next entry (the new card appears at the top of the list via `CREATE_SUCCESS`).
- `required` + `maxLength` mirror the backend zod constraints (defense in depth, same as the DB `CHECK`).

### 4.9 `src/components/<Resource>List.tsx` — three states

```tsx
const { incidents, loading } = useIncidents();
if (loading) return <Spinner />;                 // CSS spin animation while FETCH_START
if (incidents.length === 0) return <Empty />;    // friendlier than a blank page
return <ul>{incidents.map((i) => <li key={i.id}><Card incident={i} /></li>)}</ul>;
```
`key={i.id}` matters — it's what lets React efficiently reconcile updates/deletes. `loading` was the action the spec's sample forgot; without `FETCH_START` the spinner would never appear.

### 4.10 `src/components/<Resource>Card.tsx` — display + mutate + gated delete

- **Badges** via a small `Badge` styled component parameterized by background/foreground from a `severityColors`/`statusColors` map — each state gets its own color identity.
- **Two `Select`s** (status, severity) whose `onChange` call `updateIncident(id, { status })` / `{ severity }` → the optimistic-ish server round-trip then `UPDATE_SUCCESS` replaces the card in state.
- **The delete gate** — this is how the spec's "delete resolved tickets" rule is realized:
```tsx
<DeleteButton
  disabled={incident.status !== 'resolved'}
  title={incident.status === 'resolved' ? 'Delete incident' : 'Only resolved incidents can be deleted'}
  onClick={() => void deleteIncident(incident.id)}
>Delete</DeleteButton>
```
Disabled-with-explanation rather than hidden: the user learns *why* it's grayed out.

### 4.11 `src/App.tsx` — the shell

```tsx
const { user, error, dispatch } = useIncidents();

<Shell>
  {error && (
    <ErrorBanner>
      <span>{error}</span>
      <DismissButton onClick={() => dispatch({ type: 'SET_ERROR', payload: '' })}>×</DismissButton>
    </ErrorBanner>
  )}
  {user ? <Dashboard /> : <AuthForm />}   // routing via context state — no router needed
</Shell>
```

- **`user ? <Dashboard/> : <AuthForm/>` is the entire "routing".** No `react-router` dependency; the criterion is Context + useReducer, and the auth state *is* the route condition.
- The top-level **ErrorBanner** is placed here (not in Dashboard/AuthForm) so login, create, update, *and* delete errors all surface in one visible place.
- The `××` dismiss calls **`dispatch` directly** — the explicit Global Dispatching demonstration the rubric asks for.
- `Dashboard` uses `user` and `logout` from the same context; `logout` resets everything.

### 4.12 `src/main.tsx` — provider at the root

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IncidentProvider>
      <App />
    </IncidentProvider>
  </StrictMode>,
)
```
**Why the provider wraps the whole app:** "global" dispatching only works if every component is a descendant of the provider. Put it at the very root.

---

## 5. Styling notes (styled-components)

- Keep a small palette of tokens as shared constants (`#0f172a` text, `#3b82f6` primary accent, `#cbd5e1` borders) instead of repeating literals.
- Badge colors: derive from a `Record<Status, { bg, fg }>` so adding/removing a status updates all badges in one map.
- **Never rely on inherited text color for controls you re-background**: any control with an explicit `background: white` must also get `color: #0f172a` and `color-scheme: light`, otherwise dark-scheme UA defaults make white-on-white text.

---

## 6. Running & verifying the frontend

```bash
npm run dev      # :5173 (backend must be on :3000)
npm run build    # tsc -b && vite build  — MUST pass before submitting
npm run lint     # oxlint — aim for zero warnings (see split-file trick, §4.3)
```

Manual smoke test (the "done" checklist):
1. Reload the page → still signed in (token restore + auto-fetch).
2. Sign out → token cleared, list wiped, login form shown.
3. Sign up a fresh account → empty list.
4. Create → card appears at top; reload → still there (it came from the API, not React).
5. Change status/severity via dropdowns → card updates; `resolved` finally enables Delete.
6. Delete → card disappears.
7. Log out and in as another user → *their* list, not the previous user's.
8. Kill the backend and perform an action → the red ErrorBanner appears; × dismisses it via `dispatch`.

---

## 7. Frontend pitfall ledger (all real, all fixed during the reference build)

| Pitfall | Cause | Fix |
|---|---|---|
| "Invalid Date" on cards | backend `created_at` vs client `createdAt` | backend mapper (§6.12 backend guide) |
| Title invisible | dark-scheme background + hardcoded dark text | force `color-scheme: light` in `index.css` |
| White-on-white dropdowns | UA dark controls over styled white background | `color-scheme: light` + explicit `color` on controls |
| Native `<select>` list mismatch + frozen arrow | OS-rendered listbox; no open/closed pseudo-state | custom `<Select>` dropdown |
| Non-component exports break build/lint | oxlint Fast-refresh rule | split context/hook/provider into 3 files |
| `loading` never true | spec sample had no `*_START` action | add `AUTH_START`/`FETCH_START` |
| 401 after token expiry leaves stale session | no handler | `status === 401 → logout()` in every catch |
| `deleteIncident` after `resolved` gate only (UI) | spec's "delete resolved tickets" | `disabled` + explanatory `title` |

---

## 8. Rubric → frontend evidence

| Criterion | Where it lives |
|---|---|
| React Context + useReducer | `IncidentContext.tsx`: `useReducer`, pure switch, provider at `main.tsx` root |
| Global Dispatching | `dispatch` on the context value; `App.tsx` ErrorBanner uses it directly |
| Full CRUD (client side) | `fetch/create/update/delete` action creators + list/forms/cards |
| JWT (client side) | token persistence, bearer header in `api/client.ts`, 401 auto-logout |