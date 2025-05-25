import OrderComponent from "@/components/Order";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order Layanan - PT. Fortuna Sada Nioga",
  description: "Pengurusan Visa Tinggal dan Visa Kerja",
  keywords: "order visa, layanan imigrasi, pengurusan visa, dokumen TKA",
  openGraph: {
    title: "Order Layanan - PT. Fortuna Sada Nioga",
    description: "Layanan pengurusan Visa Tinggal dan Visa Kerja di Indonesia",
    url: "https://fortunasadanioga.com/order",
    type: "website",
  }
};

const OrderPage = () => {
  return (
    <div className="pt-[0px]">
      <OrderComponent />
    </div>
  );
};

export default OrderPage;