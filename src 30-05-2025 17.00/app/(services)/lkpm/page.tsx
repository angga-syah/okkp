// E:\kp\New folder\src\app\services\lkpm\page.tsx
import LaporanKegiatan from "@/components/Service/lkpm";
import { Metadata } from "next";
import ServiceLayout from "@/components/Service/service-layout";
export const metadata: Metadata = {
  title: "Laporan Kegiatan Penanaman Modal (LKPM) - PT. Fortuna Sada Nioga",
  description: "Layanan pembuatan Laporan Kegiatan Penanaman Modal untuk perusahaan investasi di Indonesia",
  keywords: "LKPM, laporan investasi, BKPM, pelaporan modal, kegiatan investasi",
  openGraph: {
    title: "Laporan Kegiatan Penanaman Modal (LKPM) - PT. Fortuna Sada Nioga",
    description: "Layanan profesional pembuatan dan pelaporan LKPM ke BKPM",
    url: "https://fortunasadanioga.com/services/lkpm",
    type: "website",
  }
};
 
const LKPM = () => {
  return (
    <div className="pt-[80px]">
      <ServiceLayout>
      <LaporanKegiatan />
      </ServiceLayout>
    </div>
  );
};
 
export default LKPM;