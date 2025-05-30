// E:\kp\New folder\src\app\clients\page.tsx
import ClientList from "@/components/Common/klien";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pengguna Jasa - PT. Fortuna Sada Nioga",
  description: "Daftar perusahaan terkemuka yang mempercayakan kebutuhan dokumentasi dan perizinan mereka kepada PT. Fortuna Sada Nioga",
  keywords: "klien, pengguna jasa, perusahaan, Fortuna Sada Nioga, perusahaan multinasional, manufaktur, teknologi",
  openGraph: {
    title: "Pengguna Jasa - PT. Fortuna Sada Nioga",
    description: "Dipercaya oleh perusahaan terkemuka di berbagai industri di Indonesia",
    url: "https://fortunasadanioga.com/clients",
    type: "website",
  }
};

const ClientsPage = () => {
  return (
    <div className="pt-[150px]">
      <ClientList />
    </div>
  );
};

export default ClientsPage;