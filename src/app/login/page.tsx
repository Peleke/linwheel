"use client";

import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = () => {
    // Mock auth: just set a localStorage flag
    localStorage.setItem("linwheel_user", "demo");
    router.push("/generate");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full">
        <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">
          Continue to LinWheel to start generating content.
        </p>

        <button
          onClick={handleLogin}
          className="w-full px-6 py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
        >
          Continue as Demo User
        </button>

        <p className="text-sm text-neutral-500 mt-4 text-center">
          Real auth coming soon. This is a demo flow.
        </p>
      </div>
    </div>
  );
}
