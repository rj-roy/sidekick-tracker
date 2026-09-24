// import type React from "react";
// import { useEffect, useState } from "react";

// import Loading from "./Loading";
// import Login from "./Login";
// import Dashboard from "@/feature/dashboard/components/DashBoard";
// import { AuthApi } from "@/feature/auth/api";

// // interface MainRouteProps {
// //     status: AuthState;
// //     setStatus: React.Dispatch<React.SetStateAction<AuthState>>;
// //     handleSignIn: () => void;
// //     handleLogOut: () => void;
// // }

// const MainRoute = ({ status, setStatus, handleSignIn, handleLogOut }: MainRouteProps) => {
//     // const [user, setUser] = useState<User | null>(null);

//     // useEffect(() => {
//     //     let mounted = true;

//     //     const loadSession = async () => {
//     //         setStatus("loading");

//     //         try {
//     //             const sessionUser = await AuthApi.getSession();

//     //             if (!mounted) return;

//     //             if (sessionUser) {
//     //                 setUser(sessionUser);
//     //                 setStatus("logged-in");
//     //             } else {
//     //                 setUser(null);
//     //                 setStatus("logged-out");
//     //             }
//     //         } catch (error) {
//     //             if (!mounted) return;

//     //             console.error("Failed to get session:", error);
//     //             setUser(null);
//     //             setStatus("logged-out");
//     //         }
//     //     };

//     //     loadSession();

//     //     return () => {
//     //         mounted = false;
//     //     };
//     // }, [setStatus]);

//     // switch (status) {
//     //     case "loading":
//     //         return <Loading />;

//     //     case "logged-out":
//     //         return <Login handleSignIn={handleSignIn} />;

//     //     case "logged-in":
//     //         return user ? (
//     //             <Dashboard user={user} handleLogOut={handleLogOut} />
//     //         ) : (
//     //             <Loading />
//     //         );

//     //     default:
//     //         return null;
//     // }
// };

// export default MainRoute;