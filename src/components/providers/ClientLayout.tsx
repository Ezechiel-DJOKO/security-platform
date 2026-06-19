'use client';

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={true}
        disableTransitionOnChange={true}
        themes={['light', 'dark']}
      >
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}