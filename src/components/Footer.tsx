import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full border-t border-outline-variant bg-surface-container-lowest py-8">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 font-label-sm text-label-sm text-on-surface-variant font-mono">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <span className="text-on-surface font-semibold">
            Kilohertz Hardware
          </span>
          <span className="hidden md:inline text-outline-variant">•</span>
          <span>High-Performance Computing & Components</span>
          <span className="hidden md:inline text-outline-variant">•</span>
          <span>Fast Worldwide Shipping</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            All Systems Operational
          </span>
          <span>© 2025 Kilohertz Hardware. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
