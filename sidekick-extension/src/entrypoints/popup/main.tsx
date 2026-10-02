import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@/styles/global.css";
import { resolveSession } from "@/shared/utils/resolveSession";
import { SessionProvider } from "@/providers/sessionProvider";

const session = await resolveSession();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SessionProvider initialSession={session}>
      <App />
    </SessionProvider>
  </React.StrictMode>,
);