import { Mail, Settings } from "lucide-react";
import '../../styles/global.css';
import { AuthApi } from "@/feature/auth/api";
import MainRoute from "@/components/MainRoute";
import { resolveSession } from "@/shared/utils/resolveSession";
import type { SessionState } from "@/shared/types/AuthType";

function App() {
  const [session, setSession] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    const session = async () => {
      const session = await resolveSession();

      if(!session){
        setSession({status: "unauthenticated"})
      };

      if(session.status === "unauthenticated"){
        setSession({status: "unauthenticated"})
      };
      
      setSession(session);
    };

    session();
  }, []);


  const handleSignIn = async () => {
    await AuthApi.login()
  };

  const handleLogOut = () => {
    console.log('logged out');
  };

  return (
    <>
      <div className="w-[410px] bg-page text-primary">
        <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-signal-soft">
              <Mail className="size-4 text-signal" />
            </div>

            <span className="text-[15px] font-semibold">
              SideKick
            </span>
          </div>

          {
            session.status === 'authenticated' ?
              <button className="rounded-md p-1.5 text-muted hover:bg-page hover:text-primary">
                <Settings className="size-4" />
              </button>
              : <button
                className="text-info font-bold hover:underline"
                onClick={() => handleSignIn()}>
                Sign In
              </button>
          }
        </header>

        <main>
          <MainRoute session={session} handleSignIn={handleSignIn} handleLogOut={handleLogOut} />
        </main>

      </div>
    </>
  );
}

export default App;
