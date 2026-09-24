import { useEffect } from 'react';
import { api } from './api/client';
// import {
//   useIncidentDispatch,
//   useIncidentState,
// } from './context/IncidentContext';
// import Dashboard from './components/Dashboard';
// import Login from './components/Login';

export default function App() {
  // const { token } = useIncidentState();
  // const dispatch = useIncidentDispatch();

  // Global fetch: load all incidents whenever an authenticated session exists.
  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    api
      .fetchIncidents()
      // .then((incidents) => {
      //   if (!cancelled) dispatch({ type: 'FETCH_SUCCESS', payload: incidents });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          dispatch({
            type: 'SET_ERROR',
            payload: err instanceof Error ? err.message : 'Failed to load incidents',
          });
        }
      });

    return () => {
      // cancelled = true;
    };
  }, [token, dispatch]);

  return token ? <Dashboard /> : <Login />;
}
