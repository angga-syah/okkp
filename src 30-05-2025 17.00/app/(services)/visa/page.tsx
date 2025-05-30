//E:\kp\New folder\src\app\services\visa\page.tsx
import VisaServicesPage from "@/components/Service/visa";
import { Metadata } from "next";
import ServiceLayout from "@/components/Service/service-layout";
export const metadata: Metadata = {
  title: "Layanan Visa - PT. Fortuna Sada Nioga",
  description: "Layanan pengurusan visa tinggal dan visa kerja untuk tenaga kerja asing di Indonesia",
  keywords: "visa Indonesia, visa kerja, visa tinggal, pengurusan dokumen imigrasi",
  openGraph: {
    title: "Layanan Visa - PT. Fortuna Sada Nioga",
    description: "Layanan profesional pengurusan visa tinggal dan visa kerja untuk TKA",
    url: "https://fortunasadanioga.com/services/visa",
    type: "website",
  }
};
  
const Visa = () => {
    return (
      <div className="pt-[80px]">
              <ServiceLayout><VisaServicesPage /></ServiceLayout>
        
      </div>
    );
};
  
export default Visa;