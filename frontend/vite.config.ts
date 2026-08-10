import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    // Para deploy no GitHub Pages em https://usuario.github.io/nome-do-repo/,
    // defina BASE_PATH="/nome-do-repo/" no ambiente de build (ver README).
    base: env.BASE_PATH || "/",
  };
});
