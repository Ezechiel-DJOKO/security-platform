import type { Metadata } from "next";
import "./globals.css";
import { ClientLayout } from "@/components/providers/ClientLayout";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="fr" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}