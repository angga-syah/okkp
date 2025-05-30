// E:\kp\New folder\src\app\services\domisili\page.tsx
import SuratKeteranganDomisili from "@/components/Service/domisili";
import ServiceLayout from "@/components/Service/service-layout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Surat Keterangan Domisili - PT. Fortuna Sada Nioga",
  description: "Layanan pengurusan Surat Keterangan Domisili Usaha (SKDU) untuk bisnis di Indonesia",
  keywords: "SKDU, surat domisili, domisili perusahaan, legalitas usaha, izin usaha",
  openGraph: {
    title: "Surat Keterangan Domisili - PT. Fortuna Sada Nioga",
    description: "Layanan profesional pengurusan Surat Keterangan Domisili Usaha untuk legalitas bisnis",
    url: "https://fortunasadanioga.com/services/domisili",
    type: "website",
  }
};
 
const Domisili = () => {
  return (
    <div className="pt-[80px]">
      <ServiceLayout>
      <SuratKeteranganDomisili />
      </ServiceLayout>
    </div>
  );
};
 
export default Domisili;