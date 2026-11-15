import type { Metadata } from "next";
import "./bootstrap.css";
import "./globals.css";
import Link from "next/link";
import JQuerySetup from "@/components/jquery-setup";

export const metadata: Metadata = {
  title: "Employee Manager",
  description: "A simple app to create, view, edit, and delete employee records.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <JQuerySetup />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="header-inner">
            <Link href="/employees" className="brand">
              <span className="brand-mark" aria-hidden="true">
                E
              </span>
              Employee Manager
            </Link>

            <span className="header-note">Employee directory</span>
          </div>
        </header>
        <main id="main" className="container">
          {children}
        </main>
      </body>
    </html>
  );
}
