import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 25575,
    host: "0.0.0.0",
    allowedHosts: ["flightai.nuriservices.at"],
  },
});
