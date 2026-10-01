import { creator } from "@lottiefiles/vite-plugin-creator";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import mkcert from "vite-plugin-mkcert";

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "standalone" ? [] : [mkcert()]), creator()],
  server: { host: "127.0.0.1" },
}));
