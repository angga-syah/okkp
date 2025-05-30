import IzinEksporImpor from "@/components/Service/ekspor-impor";
import { Metadata } from "next";
import ServiceLayout from "@/components/Service/service-layout";

export const metadata: Metadata = {
  title: "Izin Ekspor dan Impor - PT. Fortuna Sada Nioga",
  description: "Layanan pengurusan izin ekspor dan impor untuk kegiatan perdagangan internasional di Indonesia",
  keywords: "izin ekspor, izin impor, API, angka pengenal importir, eksportir terdaftar, perdagangan internasional",
  openGraph: {
    title: "Izin Ekspor dan Impor - PT. Fortuna Sada Nioga",
    description: "Layanan profesional pengurusan izin ekspor dan izin impor untuk kegiatan bisnis internasional",
    url: "https://fortunasadanioga.com/services/ekspor-impor",
    type: "website",
  }
};
 
const EksporImpor = () => {
  return (
    <div className="pt-[80px]">
      <ServiceLayout>
      <IzinEksporImpor />
      </ServiceLayout>
    </div>
  );
};
 
export default EksporImpor;