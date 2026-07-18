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
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Große, selten geänderte Libs in eigene Chunks -> besseres Caching
        // (three.js bleibt gecacht, wenn sich nur App-Code ändert) + paralleles Laden.
        manualChunks: {
          three: ["three"],
          r3f: ["@react-three/fiber", "@react-three/drei"],
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
});
