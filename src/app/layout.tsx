import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SentryUserContext } from "@/components/SentryUserContext";
import { getCurrentUser } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "E-Commerce App",
  description: "A modern e-commerce application with product catalog and secure checkout",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get authenticated user data from server (secure!)
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Set user context + companyId for CLIENT-SIDE events */}
        <SentryUserContext 
          userId={user.id}
          userEmail={user.email}
          userName={user.name}
          companyId={user.companyId}
        />
        {children}
      </body>
    </html>
  );
}
