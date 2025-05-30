// E:\kp\New folder\src\app\services\kawasan-berikat\page.tsx
import KawasanBerikat from "@/components/Service/kawasan-berikat";
import { Metadata } from "next";
import ServiceLayout from "@/components/Service/service-layout";
export const metadata: Metadata = {
  title: "Kawasan Berikat - PT. Fortuna Sada Nioga",
  description: "Layanan pengurusan izin Kawasan Berikat untuk fasilitas produksi dengan penangguhan bea masuk",
  keywords: "kawasan berikat, bonded zone, fasilitas produksi, bea cukai, fasilitas pengolahan",
  openGraph: {
    title: "Kawasan Berikat - PT. Fortuna Sada Nioga",
    description: "Layanan profesional pengurusan izin Kawasan Berikat untuk fasilitas produksi",
    url: "https://fortunasadanioga.com/services/kawasan-berikat",
    type: "website",
  }
};
 
const KawasanBerikatPage = () => {
  return (
    <div className="pt-[80px]">
      <ServiceLayout>
      <KawasanBerikat />
      </ServiceLayout>
    </div>
  );
};
 
export default KawasanBerikatPage;