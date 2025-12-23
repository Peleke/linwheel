import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo & tagline */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <div>
              <span className="font-semibold">LinWheel</span>
              <p className="text-xs text-neutral-500">Turn one podcast into a month of content.</p>
            </div>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-neutral-400">
            <Link href="/generate" className="hover:text-white transition-colors">
              Generate
            </Link>
            <Link href="#how" className="hover:text-white transition-colors">
              How it works
            </Link>
            <Link href="#angles" className="hover:text-white transition-colors">
              Angles
            </Link>
          </nav>

          {/* Copyright */}
          <p className="text-sm text-neutral-600">
            © {new Date().getFullYear()} LinWheel
          </p>
        </div>
      </div>
    </footer>
  );
}
