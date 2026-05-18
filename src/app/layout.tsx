import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Dunning Tool — Personal Payment Recovery",
  description: "Recover failed subscription payments with personal emails that come from you — not a robot. $29/mo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased bg-[#0A0A0F] text-white`}>
        {children}
      </body>
    </html>
  );
}
