const envUrl = import.meta.env.VITE_APP_API_URL;
export const BASE_API_URL: string =
  typeof envUrl === 'string' ? envUrl : 'http://localhost:5000';
