import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">
          Admin Access
        </h1>
        <p className="text-sm text-gray-500 text-center mb-8">
          Stageworth Review Tool
        </p>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
