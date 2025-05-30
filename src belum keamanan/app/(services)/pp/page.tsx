// E:\kp\New folder\src\app\services\pp\page.tsx
import PeraturanPerusahaan from "@/components/Service/pp";
import { Metadata } from "next";
import ServiceLayout from "@/components/Service/service-layout";
export const metadata: Metadata = {
  title: "Peraturan Perusahaan - PT. Fortuna Sada Nioga",
  description: "Layanan pembuatan dan pengesahan Peraturan Perusahaan sesuai UU Ketenagakerjaan",
  keywords: "peraturan perusahaan, company regulation, UU 13 tahun 2003, PP perusahaan, ketenagakerjaan",
  openGraph: {
    title: "Peraturan Perusahaan - PT. Fortuna Sada Nioga",
    description: "Layanan profesional pembuatan dan pengesahan Peraturan Perusahaan",
    url: "https://fortunasadanioga.com/services/pp",
    type: "website",
  }
};
 
const PP = () => {
  return (
    <div className="pt-[80px]">
            <ServiceLayout>
      <PeraturanPerusahaan />
      </ServiceLayout>
    </div>
  );
};
 
export default PP;