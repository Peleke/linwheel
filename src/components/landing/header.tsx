"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "header-blur border-b border-white/5" : ""
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden">
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <span className="relative text-white font-bold text-sm">L</span>
          </div>
          <span className="font-semibold text-lg gradient-text">LinWheel</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="#how"
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            How it works
          </Link>
          <Link
            href="#angles"
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            The 6 Angles
          </Link>
          {user ? (
            <Link
              href="/generate"
              className="glow-button px-5 py-2.5 rounded-lg text-sm font-medium text-white"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="glow-button px-5 py-2.5 rounded-lg text-sm font-medium text-white"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <Link
          href={user ? "/generate" : "/login"}
          className="md:hidden glow-button px-4 py-2 rounded-lg text-sm font-medium text-white"
        >
          {user ? "Dashboard" : "Get Started"}
        </Link>
      </div>
    </header>
  );
}
