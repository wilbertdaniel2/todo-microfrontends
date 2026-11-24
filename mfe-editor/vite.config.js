import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/todo-editor.js",
      formats: ["es"],
      fileName: () => "todo-editor.js",
    },
  },
});