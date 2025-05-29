// E:\kp\KP\src\app\(services)\ijin-tinggal\page.tsx
import IzinTinggalKeluarga from "@/components/Service/ijin-tinggal";
import { Metadata } from "next";
import ServiceLayout from "@/components/Service/service-layout";
export const metadata: Metadata = {
  title: "Izin Tinggal Keluarga - PT. Fortuna Sada Nioga",
  description: "Layanan pengurusan izin tinggal untuk keluarga Tenaga Kerja Asing di Indonesia",
  keywords: "izin tinggal, visa keluarga, ITAS keluarga, dependant visa, keluarga TKA",
  openGraph: {
    title: "Izin Tinggal Keluarga - PT. Fortuna Sada Nioga",
    description: "Layanan profesional pengurusan izin tinggal untuk keluarga TKA di Indonesia",
    url: "https://fortunasadanioga.com/services/ijin-tinggal",
    type: "website",
  }
};
 
const IzinTinggal = () => {
  return (
    <div className="pt-[80px]">
      <ServiceLayout>
      <IzinTinggalKeluarga />
      </ServiceLayout>
    </div>
  );
};
 
export default IzinTinggal;