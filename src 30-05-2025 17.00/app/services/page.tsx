// E:\kp\KP\src\app\services\page.tsx
import ServicesPage from "@/components/Service/service";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daftar Layanan - PT. Fortuna Sada Nioga",
  description: "Daftar Layanan pengurusan Legalitas Tenaga Kerja Asing dan Perusahaan",
  keywords: "TKA, Visa, ITAS, ITAP, RPTKA, IMTA, Ijin Kerja, Ijin Tinggal, Paspor ",
  openGraph: {
    title: "Daftar Layanan - PT. Fortuna Sada Nioga",
    description: "Daftar Layanan profesional yang ditawarkan oleh PT. Fortuna Sada Nioga",
    url: "https://fortunasadanioga.com/services",
    type: "website",
  }
};
 
const allService = () => {
  return (
    <div className="pt-[80px]">
      <ServicesPage />
    </div>
  );
};
 
export default allService;