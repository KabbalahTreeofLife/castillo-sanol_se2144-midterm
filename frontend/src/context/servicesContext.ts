import { createContext, type Dispatch } from "react";
import type { Action, ServiceStatus, Environment, State } from "../types";

export interface ServicesContextValue extends State {
  dispatch: Dispatch<Action>; // <-- the "Global Dispatching" surface
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  fetchMicroServices: () => Promise<void>;
  createMicroServices: (data: {
    name: string;
    endpointUrl: string;
    environment: Environment;
    status: ServiceStatus;
    version: string;
  }) => Promise<void>;
  updateMicroServices: (
    id: number,
    data: {
      name?: string;
      endpointUrl?: string;
      environment?: Environment;
      status?: ServiceStatus;
      version?: string;
    },
  ) => Promise<void>;
  deleteMicroServices: (id: number) => Promise<void>;
}

export const ServicesContext = createContext<ServicesContextValue | null>(null);
