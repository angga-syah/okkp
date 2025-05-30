// E:\kp\New folder\src\app\services\itap\page.tsx
import IzinTinggalTetap from "@/components/Service/itap";
import { Metadata } from "next";
import ServiceLayout from "@/components/Service/service-layout";
export const metadata: Metadata = {
  title: "Izin Tinggal Tetap (ITAP) - PT. Fortuna Sada Nioga",
  description: "Layanan pengurusan Izin Tinggal Tetap (ITAP) untuk warga negara asing di Indonesia",
  keywords: "ITAP, izin tinggal tetap, permanent stay permit, imigrasi, warga negara asing",
  openGraph: {
    title: "Izin Tinggal Tetap (ITAP) - PT. Fortuna Sada Nioga",
    description: "Layanan profesional pengurusan Izin Tinggal Tetap untuk WNA di Indonesia",
    url: "https://fortunasadanioga.com/services/itap",
    type: "website",
  }
};
 
const ITAP = () => {
  return (
    <div className="pt-[80px]">
      <ServiceLayout>
      <IzinTinggalTetap />
      </ServiceLayout>
    </div>
  );
};
 
export default ITAP;