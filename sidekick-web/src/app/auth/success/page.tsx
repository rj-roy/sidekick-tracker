import AuthSuccessContent from "@/components/auth/success/AuthSuccessContent";
import { Suspense } from "react";

export default function AuthSuccess() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-page flex items-center justify-center text-secondary">
          Verifying session...
        </div>
      }
    >
      <AuthSuccessContent />
    </Suspense>
  );
}