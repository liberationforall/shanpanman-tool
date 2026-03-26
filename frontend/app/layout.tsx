import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MahsaAlert — Intelligence Dashboard",
  description:
    "Live incident reporting and strike intelligence platform tracking confirmed strikes on government and military targets.",
  openGraph: {
    title: "MahsaAlert Intelligence Dashboard",
    description: "Live incident reporting and OSINT platform.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
