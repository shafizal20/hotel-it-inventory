import axios from "axios";
export const api = axios.create({ baseURL: "/api/v1", withCredentials: true, headers: { "X-Requested-With": "XMLHttpRequest" } });
api.interceptors.response.use(r => r, e => {
  if (e.response?.status === 401 && !String(e.config?.url).startsWith("/auth/") && location.pathname !== "/login") location.href = "/login";
  return Promise.reject(e);
});
export const errMsg = (e: any): string => {
  const d = e?.response?.data?.detail;
  return typeof d === "string" ? d : e?.response ? "Please check the form values." : "Cannot reach the server.";
};
