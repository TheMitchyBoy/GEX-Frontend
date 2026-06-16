import { Inter, JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SchemaProvider } from "@/components/SchemaProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GEX Dashboard — SPX",
  description: "Read-only gamma exposure dashboard for SPX",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body>
        <SchemaProvider>
          <div className="app-shell">
            <Nav />
            <main>{children}</main>
            <Footer />
          </div>
        </SchemaProvider>
      </body>
    </html>
  );
}
