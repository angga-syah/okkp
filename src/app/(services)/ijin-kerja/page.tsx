// E:\kp\New folder\src\app\services\ijin-kerja\page.tsx
import IzinKerjaTKA from "@/components/Service/ijin-kerja";
import { Metadata } from "next";
import ServiceLayout from "@/components/Service/service-layout";
export const metadata: Metadata = {
  title: "Izin Kerja TKA - PT. Fortuna Sada Nioga",
  description: "Layanan pengurusan dokumen izin kerja untuk Tenaga Kerja Asing di Indonesia",
  keywords: "izin kerja, RPTKA, IMTA, tenaga kerja asing, TKA, expatriate, notifikasi",
  openGraph: {
    title: "Izin Kerja TKA - PT. Fortuna Sada Nioga",
    description: "Layanan profesional pengurusan dokumen izin kerja untuk Tenaga Kerja Asing",
    url: "https://fortunasadanioga.com/services/ijin-kerja",
    type: "website",
  }
};
 
const IzinKerja = () => {
  return (
    <div className="pt-[80px]">
      <ServiceLayout>
      <IzinKerjaTKA />
      </ServiceLayout>
    </div>
  );
};
 
export default IzinKerja;