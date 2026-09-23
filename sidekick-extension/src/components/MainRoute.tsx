import type { User, AuthState } from "@/shared/types";
import type React from "react";
import Loading from "./Loading";
import Login from "./Login";
import Dashboard from "@/feature/dashboard/components/DashBoard";
import { apiClient } from "@/shared/api/client";
import { AuthApi } from "@/feature/auth/api";

interface MainRoute {
    status: AuthState;
    setStatus: React.Dispatch<React.SetStateAction<AuthState>>;
    handleSignIn: () => void;
    handleLogOut: () => void;
};

const MainRoute = ({ status, setStatus, handleSignIn, handleLogOut }: MainRoute) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const loadSession = async () => {
            try {
                const user = await AuthApi.getSession();
                console.log(user, "userldkfjs");
            } catch (error) {
                console.error("Failed to get session:", error);
            }
        };

        loadSession();
    }, []);

    if (status === "loading") return <Loading />;
    if (status === "logged-out") return <Login handleSignIn={handleSignIn} />;

    return <Dashboard handleLogOut={handleLogOut} />;
};

export default MainRoute;