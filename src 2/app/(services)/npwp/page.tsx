// E:\kp\New folder\src\app\services\npwp\page.tsx
import NPWP from "@/components/Service/npwp";
import { Metadata } from "next";
import ServiceLayout from "@/components/Service/service-layout";
export const metadata: Metadata = {
  title: "Nomor Pokok Wajib Pajak (NPWP) - PT. Fortuna Sada Nioga",
  description: "Layanan pengurusan NPWP untuk individu dan badan usaha di Indonesia",
  keywords: "NPWP, nomor pokok wajib pajak, tax ID, pajak Indonesia, identitas pajak",
  openGraph: {
    title: "Nomor Pokok Wajib Pajak (NPWP) - PT. Fortuna Sada Nioga",
    description: "Layanan profesional pengurusan NPWP pribadi dan badan",
    url: "https://fortunasadanioga.com/services/npwp",
    type: "website",
  }
};
 
const NPWPPage = () => {
  return (
    <div className="pt-[80px]">
            <ServiceLayout>
      <NPWP />
      </ServiceLayout>
    </div>
  );
};
 
export default NPWPPage;