// E:\kp\New folder\src\app\services\investasi\page.tsx
import DokumenInvestasi from "@/components/Service/investasi";
import { Metadata } from "next";
import ServiceLayout from "@/components/Service/service-layout";
export const metadata: Metadata = {
  title: "Dokumen Investasi - PT. Fortuna Sada Nioga",
  description: "Layanan pengurusan dokumen investasi dan pendirian PMA di Indonesia",
  keywords: "PMA, investasi asing, penanaman modal, BKPM, izin investasi, investasi Indonesia",
  openGraph: {
    title: "Dokumen Investasi - PT. Fortuna Sada Nioga",
    description: "Layanan profesional pengurusan dokumen investasi dan pendirian PT PMA",
    url: "https://fortunasadanioga.com/services/investasi",
    type: "website",
  }
};
 
const Investasi = () => {
  return (
    <div className="pt-[80px]">
      <ServiceLayout>
      <DokumenInvestasi />
      </ServiceLayout>
    </div>
  );
};
 
export default Investasi;