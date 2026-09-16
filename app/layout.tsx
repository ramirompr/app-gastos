import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { CurrencyDisplayProvider } from "@/lib/currency-display-context";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "Mis Gastos",
  description: "Seguimiento personal de gastos",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192x192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body>
        <AuthProvider>
          <CurrencyDisplayProvider>{children}</CurrencyDisplayProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
