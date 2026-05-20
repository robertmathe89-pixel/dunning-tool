"use client";

import { Bird, Settings, User, LogOut, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    }
    getUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

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
              
              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#1A1A24] transition-all duration-200"
                >
                  <div className="w-8 h-8 rounded-full bg-[#F59E0B]/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <span className="text-sm text-[#8A8A9E] hidden sm:block max-w-[150px] truncate">
                    {userEmail || "Account"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#5A5A6E]" />
                </button>

                {showUserMenu && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    {/* Menu */}
                    <div className="absolute right-0 top-full mt-2 w-64 bg-[#111118] border border-[#22222E] rounded-lg shadow-xl z-50 py-2">
                      <div className="px-4 py-3 border-b border-[#22222E]">
                        <p className="text-xs text-[#5A5A6E] mb-1">Signed in as</p>
                        <p className="text-sm text-white font-medium truncate">
                          {userEmail || "Unknown"}
                        </p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/dashboard"
                          onClick={() => setShowUserMenu(false)}
                          className="block px-4 py-2 text-sm text-[#8A8A9E] hover:text-white hover:bg-[#1A1A24] transition-colors"
                        >
                          Dashboard
                        </Link>
                        <Link
                          href="/dashboard/settings"
                          onClick={() => setShowUserMenu(false)}
                          className="block px-4 py-2 text-sm text-[#8A8A9E] hover:text-white hover:bg-[#1A1A24] transition-colors"
                        >
                          Settings
                        </Link>
                      </div>
                      <div className="border-t border-[#22222E] py-1">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            handleLogout();
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
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
