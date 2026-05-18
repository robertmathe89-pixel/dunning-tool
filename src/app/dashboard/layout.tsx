import { Bird, Settings, User } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Top Nav */}
      <nav className="border-b border-[#22222E] bg-[#0A0A0F]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Bird className="w-6 h-6 text-[#F59E0B]" />
              <span className="text-white font-semibold">Dunning Tool</span>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/settings"
                className="p-2 text-[#8A8A9E] hover:text-white hover:bg-[#1A1A24] rounded-lg transition-all duration-200"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <div className="w-8 h-8 rounded-full bg-[#F59E0B]/20 flex items-center justify-center">
                <User className="w-4 h-4 text-[#F59E0B]" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
