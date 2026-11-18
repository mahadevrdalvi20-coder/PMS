import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Stride — Performance Management", template: "%s · Stride" },
  description: "Goals, self-appraisals and manager reviews in one place — run your performance cycle end to end.",
};

export const viewport: Viewport = { themeColor: "#1e2faf" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: { colorPrimary: "#1d36d8", borderRadius: "0.6rem" },
      }}
    >
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <body className="min-h-full font-sans">{children}</body>
      </html>
    </ClerkProvider>
  );
}
