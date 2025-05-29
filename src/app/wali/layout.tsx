"use client";

import { SessionProvider } from 'next-auth/react';
import { SessionChecker } from "@/components/login/proteksi";
import { Providers } from "../providers";

interface WaliLayoutProps {
  children: React.ReactNode;
}

export default function WaliLayout({ children }: WaliLayoutProps) {
  return (
    <SessionProvider>
      <Providers>
        <SessionChecker/>
        {children}
      </Providers>
    </SessionProvider>
  );
}