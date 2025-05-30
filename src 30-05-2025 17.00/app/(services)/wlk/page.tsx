// E:\kp\New folder\src\app\services\wlk\page.tsx
import WajibLaporKetenagakerjaan from "@/components/Service/wlk";
import { Metadata } from "next";
import ServiceLayout from "@/components/Service/service-layout";
export const metadata: Metadata = {
  title: "Wajib Lapor Ketenagakerjaan - PT. Fortuna Sada Nioga",
  description: "Layanan pelaporan ketenagakerjaan online sesuai UU No.7 tahun 1981",
  keywords: "wajib lapor ketenagakerjaan, laporan tenaga kerja, UU No.7 tahun 1981, kepatuhan ketenagakerjaan",
  openGraph: {
    title: "Wajib Lapor Ketenagakerjaan - PT. Fortuna Sada Nioga",
    description: "Layanan profesional pelaporan ketenagakerjaan online",
    url: "https://fortunasadanioga.com/services/wlk",
    type: "website",
  }
};
 
const WLK = () => {
  return (
    <div className="pt-[80px]">
            <ServiceLayout><WajibLaporKetenagakerjaan /></ServiceLayout>
      
    </div>
  );
};
 
export default WLK;