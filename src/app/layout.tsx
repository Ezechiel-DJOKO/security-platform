import type { Metadata } from "next";
import "./globals.css";
import { ClientLayout } from "@/components/providers/ClientLayout"; // Ajuste le chemin si nécessaire

export const metadata: Metadata = {
  title: "Security Platform",
  description: "Gestion des vulnérabilités et plans de correction",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}