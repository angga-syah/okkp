import Contact from "@/components/Contact";
import { Metadata } from "next";
import Atas from "@/components/Contact/atas";

export const metadata: Metadata = {
  title: "Kontak - PT. Fortuna Sada Nioga",
  description: "Kontak - PT. Fortuna Sada Nioga Jasa Pengurusan Dokumen Tenaga Kerja Asing dan Perizinan Investasi",
  keywords: "kontak, konsultan visa, jasa imigrasi, tenaga kerja asing, konsultasi perizinan",
  openGraph: {
    title: "Kontak - PT. Fortuna Sada Nioga",
    description: "Hubungi PT. Fortuna Sada Nioga untuk konsultasi pengurusan dokumen TKA dan perizinan investasi",
    url: "https://fortunasadanioga.com/contact",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  }
};

const ContactP = () => {
  return (
    <div className="pt-[180px]">
    <>
      <Atas/>
      <Contact />
    </>
    </div>
  );
};

export default ContactP;