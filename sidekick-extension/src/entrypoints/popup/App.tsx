import { Mail, Settings } from "lucide-react";
import '../../styles/global.css';
import type { AuthState } from "@/shared/types";
import MainRoute from "@/components/MainRoute";

function App() {
  const [status, setStatus] = useState<AuthState>('loading');
  let loggedIn = false;

  const handleSignIn = () => {
    console.log('signed In');
  };

  const handleLogOut = () => {
    console.log('logged out');
  };

  return (
    <>
      <body className="w-[410px] bg-page text-primary">
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
            loggedIn ?
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
          <MainRoute status={status} setStatus={setStatus} handleSignIn={handleSignIn} handleLogOut={handleLogOut} />
        </main>

      </body>
    </>
  );
}

export default App;
