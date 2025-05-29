// E:\kp\New folder\src\app\services\epo\page.tsx
import ExitPermitOnly from "@/components/Service/epo";
import { Metadata } from "next";
import ServiceLayout from "@/components/Service/service-layout";

export const metadata: Metadata = {
  title: "Exit Permit Only (EPO) - PT. Fortuna Sada Nioga",
  description: "Layanan pengurusan Exit Permit Only (EPO) untuk warga negara asing yang meninggalkan Indonesia",
  keywords: "EPO, exit permit only, izin keluar, imigrasi Indonesia, dokumen keimigrasian",
  openGraph: {
    title: "Exit Permit Only (EPO) - PT. Fortuna Sada Nioga",
    description: "Layanan profesional pengurusan Exit Permit Only untuk WNA yang akan meninggalkan Indonesia",
    url: "https://fortunasadanioga.com/services/epo",
    type: "website",
  }
};
 
const EPO = () => {
  return (
    <div className="pt-[80px]">
            <ServiceLayout>
      <ExitPermitOnly />
      </ServiceLayout>
    </div>
  );
};
 
export default EPO;