import ClientLayoutWrapper from "@/components/Common/ClientLayoutWrapper";
import { Inter } from "next/font/google";
import "../styles/index.css";
import { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

// Metadata default untuk seluruh situs
export const metadata: Metadata = {
  metadataBase: new URL('https://fortunasadanioga.com'),
  title: {
    default: "PT. Fortuna Sada Nioga - Jasa Pengurusan Visa dan Perizinan",
    template: "%s | PT. Fortuna Sada Nioga"
  },
  description: "PT. Fortuna Sada Nioga menyediakan layanan profesional pengurusan visa dan perizinan investasi di Indonesia sejak 1998.",
  keywords: "visa Indonesia, perizinan investasi, tenaga kerja asing, konsultan imigrasi",
  authors: [{ name: "PT. Fortuna Sada Nioga" }],
  creator: "PT. Fortuna Sada Nioga",
  robots: {
    index: true,
    follow: true
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "PT. Fortuna Sada Nioga"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="id">
      <head />
      <body className={`bg-[#f9fafb] dark:bg-[#121928] ${inter.className}`}>
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}