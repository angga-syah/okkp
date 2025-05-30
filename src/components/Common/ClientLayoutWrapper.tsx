"use client";

import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { Providers } from "@/app/providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WB from "@/components/WB";
import Chatbot from "@/components/Chatbot";
import Cf from "./cf";
import { SessionChecker } from "@/components/login/proteksi";
import { LanguageProvider } from "@/components/Header/Bahasa";
import TimeValidator from "./Time";
import { useEffect } from "react";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWali = pathname.startsWith("/wali");

  // Disable console errors in production
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        // Filter out specific CSP and Permissions-Policy errors
        const errorMessage = args.join(' ');
        if (
          !errorMessage.includes('Permissions-Policy header') && 
          !errorMessage.includes('was preloaded using link preload but not used')
        ) {
          originalConsoleError(...args);
        }
      };
      
      return () => {
        console.error = originalConsoleError;
      };
    }
  }, []);

  return (
    <SessionProvider>
      <Providers>
        <SessionChecker />
        <LanguageProvider>
          <TimeValidator maxTimeDifference={2880}>
            {/* Cloudflare handler placed at top level to handle resources early */}
            <Cf />
            
            {!isWali && (
              <>
                <Header />
                <WB />
              </>
            )}

            {children}

            {!isWali && <Footer />}
          </TimeValidator>
        </LanguageProvider>
      </Providers>
    </SessionProvider>
  );
}