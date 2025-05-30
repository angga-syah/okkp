// E:\kp\New folder\src\app\services\itas-lansia\page.tsx
import VisaKitasLansia from "@/components/Service/itas-lansia";
import { Metadata } from "next";
import ServiceLayout from "@/components/Service/service-layout";
export const metadata: Metadata = {
  title: "VISA/KITAS Lansia - PT. Fortuna Sada Nioga",
  description: "Layanan pengurusan visa dan KITAS untuk lansia/pensiunan asing di Indonesia",
  keywords: "visa lansia, KITAS pensiunan, retirement visa, visa pensiun, lansia asing",
  openGraph: {
    title: "VISA/KITAS Lansia - PT. Fortuna Sada Nioga",
    description: "Layanan profesional pengurusan visa dan izin tinggal untuk pensiunan asing",
    url: "https://fortunasadanioga.com/services/itas-lansia",
    type: "website",
  }
};
 
const KitasLansia = () => {
  return (
    <div className="pt-[80px]">
      <ServiceLayout>
      <VisaKitasLansia />
      </ServiceLayout>
    </div>
  );
};
 
export default KitasLansia;