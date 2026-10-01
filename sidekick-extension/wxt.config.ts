import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: "src",
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),

  manifest: {
    name: "SideKick Tracker (RJ)",
    description: "Let's Track Your Mail With Just One Side Kick",
    version: '0.1.2',

    permissions: [
      "storage",
      "tabs",
    ],

    host_permissions: [
      "https://mail.google.com/*",
      "http://localhost:5000/*",
    ],

    action: {
      default_title: "Sidekick Tracker",
    },
  },
});
