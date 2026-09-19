import { CircleHelp, LogOut } from "lucide-react";

export default function Dashboard({ handleLogOut }: { handleLogOut: () => void }) {
    return (
        <div className="p-4">
            {/* <TrackingStatus /> */}

            <div className="mt-3 flex justify-center">
                <button className="flex items-center gap-1 text-[10px] text-muted hover:text-primary">
                    <CircleHelp className="size-3" />
                    How it works
                </button>
            </div>

            <div className="mt-3 flex justify-center">
                <button
                    onClick={handleLogOut}
                    className="flex items-center gap-1 text-[10px] text-muted hover:text-primary"
                >
                    <LogOut className="size-3" />
                    Log out
                </button>
            </div>
        </div>
    );
}
