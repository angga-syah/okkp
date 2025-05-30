import CustomerWrapper from "@/components/Track";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lacak Dokumen - PT. Fortuna Sada Nioga",
  description: "Lacak status dokumen visa dan perizinan Anda secara real-time",
  keywords: "lacak dokumen, status visa, tracking dokumen imigrasi",
  openGraph: {
    title: "Lacak Dokumen - PT. Fortuna Sada Nioga",
    description: "Lacak status dokumen visa dan perizinan Anda secara real-time",
    url: "https://fortunasadanioga.com/track",
    type: "website",
  }
};
  
const Track = () => {
    return (
      <div className="pt-[150px]">
        <CustomerWrapper />
      </div>
    );
};
  
export default Track;