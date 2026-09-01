import { useEffect, useState } from "react";
import { authApi } from "../../api/auth.api";
import { ApiClientError } from "../../api/client";
import type { User } from "../../types/auth";
import Loading from "./Loading";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";

export default function AuthRouter() {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "logged-out">("loading");

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const me = await authApi.me();
        if (active) {
          setUser(me);
          setStatus("ok");
        }
      } catch (err) {
        if (!active) return;

        if (err instanceof ApiClientError && err.status === 401) {
          setStatus("logged-out");
        } else {
          setStatus("ok");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (status === "loading") {
    return <Loading />;
  }

  if (status === "logged-out") {
    return <Login />;
  }

  return <Dashboard />;
}