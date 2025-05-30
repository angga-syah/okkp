// E:\kp\New folder\src\app\services\mutasi\page.tsx
import MutasiService from "@/components/Service/mutasi";
import { Metadata } from "next";
import ServiceLayout from "@/components/Service/service-layout";
export const metadata: Metadata = {
  title: "Mutasi - PT. Fortuna Sada Nioga",
  description: "Layanan pengurusan mutasi alamat, paspor, dan jabatan untuk warga negara asing di Indonesia",
  keywords: "mutasi alamat, mutasi paspor, alih jabatan, perubahan izin tinggal, warga negara asing",
  openGraph: {
    title: "Mutasi - PT. Fortuna Sada Nioga",
    description: "Layanan profesional pengurusan mutasi untuk warga negara asing di Indonesia",
    url: "https://fortunasadanioga.com/services/mutasi",
    type: "website",
  }
};
 
const Mutasi = () => {
  return (
    <div className="pt-[80px]">
      <ServiceLayout>
      <MutasiService />
      </ServiceLayout>
    </div>
  );
};
 
export default Mutasi;