
import '../../styles/global.css';
import { AuthApi } from "@/feature/auth/api";
import MainRoute from "@/components/MainRoute";
import Header from "@/components/Header";
import TrackedMailsView from "@/pages/tracked-mails/TrackedMailsView";
import { resolveSession } from "@/shared/utils/resolveSession";
import type { SessionState } from "@/shared/types/AuthType";
import { apiClient } from "@/shared/api/client";

function App() {
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const [view, setView] = useState<"home" | "tracked">("home");
  const [mailData, setMailData] = useState<unknown>(null);

  useEffect(() => {
    const session = async () => {
      const session = await resolveSession();

      if (!session) {
        setSession({ status: "unauthenticated" })
      };

      if (session.status === "unauthenticated") {
        setSession({ status: "unauthenticated" })
      };

      setSession(session);
    };

    session();
  }, []);


  useEffect(() => {
    if (session.status !== "authenticated") {
      setView("home");
    }
  }, [session.status]);

  useEffect(() => {
    if (view !== "tracked" || session.status !== "authenticated") {
      return;
    }

    let cancelled = false;

    const fetchMail = async () => {
      try {
        const data = await apiClient.get(`/api/mail/get?userId=${session.user.id}`);
        if (!cancelled) {
          setMailData(data);
        }
      } catch (error) {
        console.error("Failed to fetch tracked mail:", error);
        if (!cancelled) {
          setMailData(null);
        }
      }
    };

    fetchMail();

    return () => {
      cancelled = true;
    };
  }, [view, session]);

  const handleSignIn = async () => {
    await AuthApi.login()
  };

  const handleLogOut = async () => {
    try {
      await apiClient.post("/api/auth/logout");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
    setSession({ status: "unauthenticated" });
    setView("home");
  };

  if (view === "tracked" && session.status === "authenticated") {
    return <TrackedMailsView onBack={() => setView("home")} mailData={mailData} />;
  }

  return (
    <>
      <div className="w-[360px] bg-page text-primary">
        <Header showSettings={session.status === "authenticated"} onHome={() => setView("home")}>
          {
            session.status === 'authenticated' ?
              <button onClick={() => setView("tracked")} className="rounded-sm px-2 py-1 text-[10px] font-sm text-info hover:bg-page hover:underline">
                Tracked Mails
              </button>
              : <button
                className="text-info font-bold hover:underline"
                onClick={() => handleSignIn()}>
                Sign In
              </button>
          }
        </Header>

        <main>
          <MainRoute session={session} handleSignIn={handleSignIn} handleLogOut={handleLogOut} />
        </main>

      </div>
    </>
  );
}

export default App;
