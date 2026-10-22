import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Proxy keeps the app and API same-origin, so the SameSite=Strict session cookie works.
export default defineConfig({ plugins: [react()], server: { port: 5173, proxy: { "/api": "http://127.0.0.1:8000" } } });
