import AuthSuccessContent from "@/components/auth/success/AuthSuccessContent";
import { Suspense } from "react";

export default function AuthSuccess() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-caption">
          Verifying session...
        </div>
      }
    >
      <AuthSuccessContent />
    </Suspense>
  );
}