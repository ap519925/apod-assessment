import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "APOD Explorer",
  description: "Browse the most recent NASA Astronomy Pictures of the Day.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <footer className="mt-auto border-t border-slate-800 px-4 py-6 text-center text-xs text-slate-500">
          Images and text from{" "}
          <a href="https://apod.nasa.gov/apod/" className="underline hover:text-slate-300">
            NASA APOD
          </a>
          . Content updates on each build.
        </footer>
      </body>
    </html>
  );
}
