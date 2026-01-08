"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserMenu } from "./user-menu";
import type { User } from "@supabase/supabase-js";

export function AppHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-blue-500/20 group-hover:ring-blue-500/40 transition-all duration-300 shadow-md shadow-blue-500/10 group-hover:shadow-blue-500/20">
              <Image
                src="/logo.png"
                alt="LinWheel"
                width={36}
                height={36}
                className="object-cover scale-110"
                priority
              />
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
            <span className="font-semibold text-base bg-gradient-to-r from-blue-600 to-sky-500 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent">
              LinWheel
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive("/dashboard")
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/generate"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive("/generate")
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800"
              }`}
            >
              Generate
            </Link>
            <Link
              href="/results"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive("/results") || pathname.startsWith("/results/")
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800"
              }`}
            >
              Results
            </Link>

            <div className="w-px h-6 bg-zinc-700 mx-2" />

            {/* User Menu */}
            <UserMenu user={user} />
          </nav>
        </div>
      </div>
    </header>
  );
}
