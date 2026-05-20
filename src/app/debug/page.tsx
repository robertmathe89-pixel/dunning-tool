"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DebugPage() {
  const [info, setInfo] = useState<any>(null);
  const [cookies, setCookies] = useState<string>("");

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();

      // Read all cookies visible to JS
      const allCookies = document.cookie
        .split(";")
        .map((c) => c.trim())
        .filter(Boolean);

      setCookies(allCookies.join("\n"));

      // Call debug API
      const res = await fetch("/api/debug", { credentials: "same-origin" });
      const apiData = await res.json();

      setInfo({
        browserUser: user?.email || null,
        browserSession: !!session,
        apiStatus: res.status,
        apiData,
      });
    }
    check();
  }, []);

  return (
    <div className="p-8 bg-[#0A0A0F] text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Auth Debug</h1>

      {info ? (
        <div className="space-y-4">
          <div className="bg-[#111118] p-4 rounded border border-[#22222E]">
            <h2 className="text-lg font-semibold mb-2 text-[#F59E0B]">Browser Client</h2>
            <p>User: {info.browserUser || "none"}</p>
            <p>Session: {info.browserSession ? "yes" : "no"}</p>
          </div>

          <div className="bg-[#111118] p-4 rounded border border-[#22222E]">
            <h2 className="text-lg font-semibold mb-2 text-[#10B981]">API Route (/api/debug)</h2>
            <p>Status: {info.apiStatus}</p>
            <p>Has Session: {info.apiData?.hasSession ? "yes" : "no"}</p>
            <p>Has User: {info.apiData?.hasUser ? "yes" : "no"}</p>
            <p>User ID: {info.apiData?.userId || "none"}</p>
            <p>Cookie Count: {info.apiData?.cookieCount}</p>
            <p>Cookie Names: {info.apiData?.cookieNames?.join(", ") || "none"}</p>
            <p className="text-xs text-[#5A5A6E] mt-2 break-all">
              Raw: {info.apiData?.rawCookieHeader}
            </p>
          </div>

          <div className="bg-[#111118] p-4 rounded border border-[#22222E]">
            <h2 className="text-lg font-semibold mb-2 text-[#8B5CF6]">Browser Cookies (document.cookie)</h2>
            <pre className="text-xs text-[#8A8A9E] whitespace-pre-wrap">{cookies || "none"}</pre>
          </div>
        </div>
      ) : (
        <p className="text-[#8A8A9E]">Loading...</p>
      )}
    </div>
  );
}
