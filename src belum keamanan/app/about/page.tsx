import About from "@/components/About/about";
import HistoryContent from "@/components/About/history";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tentang Kami - PT. Fortuna Sada Nioga",
  description: "PT. Fortuna Sada Nioga adalah perusahaan jasa konsultan berpengalaman dalam pengurusan dokumen Tenaga Kerja Asing dan perizinan investasi di Indonesia sejak 1998.",
  keywords: "konsultan TKA, perizinan investasi Indonesia, jasa imigrasi, visa kerja Indonesia",
  openGraph: {
    title: "Tentang Kami - PT. Fortuna Sada Nioga",
    description: "Konsultan berpengalaman dalam pengurusan dokumen TKA dan perizinan investasi di Indonesia sejak 1998.",
    url: "https://fortunasadanioga.com/about",
    siteName: "PT. Fortuna Sada Nioga",
    locale: "id_ID",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  }
};

const AboutPage = () => {
  return (
    <div className="pt-[180px]">
    <>
      <HistoryContent/>
      <About/>
    </>
    </div>
  );
};

export default AboutPage;