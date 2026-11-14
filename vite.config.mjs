import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development Vite serves the React app on :5173 and forwards API and
// photo requests to the Express server on :3000.
export default defineConfig({
  root: "client",
  plugins: [react()],
  build: { outDir: "../dist", emptyOutDir: true },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/uploads": "http://localhost:3000"
    }
  }
});
