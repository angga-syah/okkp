// E:\kp\New folder\src\app\services\gudang-berikat\page.tsx
import GudangBerikat from "@/components/Service/gudang-berikat";
import { Metadata } from "next";
import ServiceLayout from "@/components/Service/service-layout";

export const metadata: Metadata = {
  title: "Gudang Berikat - PT. Fortuna Sada Nioga",
  description: "Layanan pengurusan izin Gudang Berikat untuk penimbunan barang impor tanpa bea masuk",
  keywords: "gudang berikat, bonded warehouse, fasilitas gudang, bea cukai, penimbunan barang impor",
  openGraph: {
    title: "Gudang Berikat - PT. Fortuna Sada Nioga",
    description: "Layanan profesional pengurusan izin Gudang Berikat untuk fasilitas penangguhan bea masuk",
    url: "https://fortunasadanioga.com/services/gudang-berikat",
    type: "website",
  }
};
 
const GudangBerikatPage = () => {
  return (
    <div className="pt-[80px]">
            <ServiceLayout>
      <GudangBerikat />
      </ServiceLayout>
    </div>
  );
};
 
export default GudangBerikatPage;