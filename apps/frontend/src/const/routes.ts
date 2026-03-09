// Prefer REACT_API_URL (for CRA-style envs), fall back to VITE_APP_API_URL,
// then finally to localhost for local development.
const envUrl =
  (import.meta.env as any).REACT_API_URL ?? import.meta.env.VITE_APP_API_URL;
export const BASE_API_URL: string =
  typeof envUrl === 'string' ? envUrl : 'http://localhost:5000';
