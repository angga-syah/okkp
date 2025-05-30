import About from "@/components/About/about";
import ScrollUp from "@/components/Common/ScrollUp";
import Contact from "@/components/Contact";
import Hero from "@/components/Hero";
import FadeInSection from "@/components/Common/FadeInSection";
import ClientLogos from "@/components/Common/ClientLogos";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "PT. Fortuna Sada Nioga - Jasa Pengurusan Visa dan Perizinan di Indonesia",
  description: "PT. Fortuna Sada Nioga adalah konsultan terpercaya dalam pengurusan dokumen tenaga kerja asing dan perizinan investasi di Indonesia sejak 1998.",
  keywords: "visa Indonesia, perizinan investasi, visa kerja, dokumen imigrasi, konsultan TKA",
  openGraph: {
    title: "PT. Fortuna Sada Nioga - Jasa Pengurusan Visa dan Perizinan di Indonesia",
    description: "Konsultan terpercaya dalam pengurusan dokumen TKA dan perizinan investasi di Indonesia",
    images: [{ url: '/images/og-image.jpg', width: 1200, height: 630, alt: 'PT. Fortuna Sada Nioga' }],
    url: "https://fortunasadanioga.com",
  }
};

export default function Home() {
  return (
    <>
      <ScrollUp />
      <Hero />
      <ClientLogos/>
      <FadeInSection threshold={0.05}>
        <About />
      </FadeInSection>
      <FadeInSection threshold={0.05}>
        <Contact />
      </FadeInSection>
    </>
  );
}