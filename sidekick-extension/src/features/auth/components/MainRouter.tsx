import { useEffect, useState } from "react";
import { authApi } from "../api";
import type { User, AuthState } from "../types";
import Login from "./Login";
import Loading from "./Loading";
import Dashboard from "../../dashboard/components/Dashboard";

const MainRouter = () => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthState>("loading");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const me = await authApi.me();
        setUser(me);
        setStatus("logged-in");
      } catch {
        setUser(null);
        setStatus("logged-out");
      }
    };

    checkAuth();
  }, []);

  if (status === "loading") return <Loading />;
  if (status === "logged-out") return <Login />;

  return <Dashboard />;
};

export default MainRouter;
