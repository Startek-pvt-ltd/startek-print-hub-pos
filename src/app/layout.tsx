import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Startek Print Hub POS", template: "%s | Startek Print Hub POS" },
  description: "Point of Sale and print-job operations for Startek Print Hub",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
