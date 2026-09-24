import type {
  Environment,
  Microservice,
  State,
  User,
  ServiceStatus,
} from "../types";

const BASE = ""; // '' because Vite proxies '/api' to the backend

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

  if (res.status === 204) return undefined as T; // DELETE sends no body

  if (!res.ok) {
    let body: { message?: string; issues?: { message: string }[] } = {};
    try {
      body = (await res.json()) as typeof body;
    } catch {
      /* non-JSON body */
    }
    const detail = body.issues?.map((i) => i.message).join("; ");
    const error = new Error(
      detail
        ? `${body.message ?? "Request failed"}: ${detail}`
        : (body.message ?? "Request failed"),
    ) as Error & { status: number };
    error.status = res.status;
    throw error; // single error shape for all callers
  }
  return res.json() as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, role: string) =>
    request<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    }),
  fetchMicroServices: () => request<Microservice[]>("/api/services"),
  createMicroServices: (data: {
    name: string;
    endpointUrl: string;
    environment: Environment;
    status: ServiceStatus;
    version: string;
  }) =>
    request<Microservice>("/api/services", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateMicroServices: (
    id: number,
    data: {
      name?: string;
      endpointUrl?: string;
      environment?: Environment;
      status?: ServiceStatus;
      version?: string;
    },
  ) =>
    request<Microservice>(`/api/services/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteMicroServices: (id: number) =>
    request<void>(`/api/services/${id}`, { method: "DELETE" }),
};
