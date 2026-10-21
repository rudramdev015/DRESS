import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    target: "es2020",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // React + router change rarely, so browsers keep them cached between site updates.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          three: ["three"],
        },
      },
    },
  },
});
