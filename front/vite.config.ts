import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico"],
      manifest: {
        name: "Personal",
        short_name: "Jaime Morán",
        description: "App personal de Jaime Morán Santos",
        theme_color: "#ffffff",
        icons: [
          { src: "/pwa-152x152.png", sizes: "152x152", type: "image/png" },
          { src: "/pwa-180x180.png", sizes: "180x180", type: "image/png" },
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
});
