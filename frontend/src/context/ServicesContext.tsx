import { useEffect, useReducer, type ReactNode } from "react";
import { api } from "../api/client";
import type { Action, State, Microservice } from "../types";
import { ServicesContext, type ServicesContextValue } from "./servicesContext";

const initialState: State = {
  user: null,
  token: localStorage.getItem("token"), // restore session across reloads
  services: [],
  selectedEnvironment: "ALL",
  loading: false,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "AUTH_START":
      return { ...state, loading: true, error: null };
    case "SET_AUTH":
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      };
    case "LOGOUT":
      return {
        ...state,
        user: null,
        token: null,
        services: [],
        loading: false,
        error: null,
      };
    case "FETCH_START":
      return { ...state, loading: true, error: null };
    case "FETCH_SERVICES_SUCCESS":
      return {
        ...state,
        services: action.payload,
        loading: false,
        error: null,
      };
    case "CREATE_SERVICE_SUCCESS":
      return {
        ...state,
        services: [action.payload, ...state.services],
        loading: false,
        error: null,
      };
    case "UPDATE_SERVICE_SUCCESS":
      return {
        ...state,
        services: state.services.map((i) =>
          i.id === action.payload.id ? action.payload : i,
        ),
        loading: false,
        error: null,
      };
    case "DELETE_SERVICE_SUCCESS":
      return {
        ...state,
        services: state.services.filter((i) => i.id !== action.payload),
        loading: false,
        error: null,
      };
    case "SET_ERROR":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

export function ServicesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const logout = () => {
    localStorage.removeItem("token");
    dispatch({ type: "LOGOUT" });
  };

  const fetchMicroServices = async () => {
    dispatch({ type: "FETCH_START" });
    try {
      const service = await api.fetchMicroServices();
      dispatch({ type: "FETCH_SERVICES_SUCCESS", payload: service });
    } catch (error) {
      if ((error as Error & { status: number }).status === 401) return logout();
      dispatch({ type: "SET_ERROR", payload: (error as Error).message });
    }
  };

  const login = async (email: string, password: string) => {
    dispatch({ type: "AUTH_START" });
    try {
      const { token, user } = await api.login(email, password);
      localStorage.setItem("token", token);
      dispatch({ type: "SET_AUTH", payload: { user, token } });
      await fetchMicroServices();
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: (error as Error).message });
    }
  };

  const register = async (email: string, password: string) => {
    dispatch({ type: "AUTH_START" });
    try {
      const { token, user } = await api.login(email, password);
      localStorage.setItem("token", token);
      dispatch({ type: "SET_AUTH", payload: { user, token } });
      await fetchMicroServices();
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: (error as Error).message });
    }
  };

  const createMicroServices = async (data: Microservice) => {
    try {
      const service = await api.createMicroServices(data);
      dispatch({ type: "CREATE_SERVICE_SUCCESS", payload: service });
    } catch (error) {
      if ((error as Error & { status: number }).status === 401) return logout();
      dispatch({ type: "SET_ERROR", payload: (error as Error).message });
    }
  };

  const updateMicroServices = async (id: string, data: Microservice) => {
    try {
      const service = await api.updateMicroServices(id, data);
      dispatch({ type: "UPDATE_SERVICE_SUCCESS", payload: service });
    } catch (error) {
      if ((error as Error & { status: number }).status === 401) {
        return logout();
      }
      dispatch({ type: "SET_ERROR", payload: (error as Error).message });
    }
  };
  const deleteMicroServices = async (id: string) => {
    try {
      await api.deleteMicroServices(id);
      dispatch({ type: "DELETE_SERVICE_SUCCESS", payload: id });
    } catch (error) {
      if ((error as Error & { status: number }).status === 401) {
        return logout();
      }
      dispatch({ type: "SET_ERROR", payload: (error as Error).message });
    }
  };

  useEffect(() => {
    if (localStorage.getItem("token")) void fetchMicroServices(); // session heal on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: ServicesContextValue = {
    ...state,
    dispatch,
    login,
    register,
    logout,
    fetchMicroServices,
    createMicroServices,
    updateMicroServices,
    deleteMicroServices,
  };

  return (
    <ServicesContext.Provider value={value}>
      {children}
    </ServicesContext.Provider>
  );
}
