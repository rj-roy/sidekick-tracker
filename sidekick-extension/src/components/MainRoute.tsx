import Loading from "./Loading";
import Login from "./Login";
import Dashboard from "@/feature/dashboard/components/DashBoard";
import type { SessionState } from "@/shared/types/AuthType";

interface MainRouteProps {
    session: SessionState;
    handleSignIn: () => void;
    handleLogOut: () => void;
}

const MainRoute = ({session, handleSignIn, handleLogOut }: MainRouteProps) => {

    switch (session.status) {
        case "loading":
            return <Loading />;

        case "unauthenticated":
            return <Login handleSignIn={handleSignIn} />;

        case "authenticated":
            return session.user ? (
                <Dashboard user={session.user} handleLogOut={handleLogOut} />
            ) : (
                <Loading />
            );

        default:
            return null;
    }
};

export default MainRoute;