import type { Metadata } from "next";
import { Recursive } from "next/font/google";
import "./globals.css";

const recursive = Recursive({ subsets: ["latin"], variable: "--font-recursive" });

export const metadata: Metadata = {
  title: "Hacktron dependency scan: two ways a malicious package passes (unofficial demo)",
  description:
    "Hacktron's dependency-scan Action passed a PR with debug@4.4.2 when the verdict API rate-limited it, and checks npm aliases under the alias name. A tested patch. Unofficial demo by Cheryl Aurelia.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${recursive.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
