import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aurora Voice Assistant",
  description:
    "An ambient-first voice assistant that listens, understands, and speaks right from your browser."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-white`}>
        {children}
      </body>
    </html>
  );
}
