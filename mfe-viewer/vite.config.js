import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // React necesita saber que está en producción al compilar como librería
  define:
    command === "build"
      ? { "process.env.NODE_ENV": JSON.stringify("production") }
      : {},
  build: {
    lib: {
      entry: "src/main.jsx",
      formats: ["es"],
      fileName: () => "todo-viewer.js",
    },
  },
}));