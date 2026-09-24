import { createContext, type Dispatch } from "react";
import type {
  Action,
  ServiceStatus,
  Environment,
  State,
  Microservice,
} from "../types";

export interface ServicesContextValue extends State {
  dispatch: Dispatch<Action>; // <-- the "Global Dispatching" surface
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  fetchMicroServices: () => Promise<void>;
  createMicroServices: (data: Microservice) => Promise<void>;
  updateMicroServices: (id: string, data: Microservice) => Promise<void>;
  deleteMicroServices: (id: string) => Promise<void>;
}

export const ServicesContext = createContext<ServicesContextValue | null>(null);
