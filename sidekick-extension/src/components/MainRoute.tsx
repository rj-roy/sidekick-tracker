import type { User, AuthState } from "@/shared/types";
import type React from "react";
import Loading from "./Loading";
import Login from "./Login";
import Dashboard from "@/feature/dashboard/components/DashBoard";
import { apiClient } from "@/shared/api/client";

interface MainRoute {
    status: AuthState;
    setStatus: React.Dispatch<React.SetStateAction<AuthState>>;
    handleSignIn: () => void;
    handleLogOut: () => void;
};

const MainRoute = ({ status, setStatus, handleSignIn, handleLogOut }: MainRoute) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(()=>{
        const checkAuth = () => {
            apiClient.get('/auth/me');
        };

        checkAuth();
    },[]);

    if (status === "loading") return <Loading />;
    if (status === "logged-out") return <Login handleSignIn={handleSignIn} />;

    return <Dashboard handleLogOut={handleLogOut} />;
};

export default MainRoute;