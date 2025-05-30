//data.ts
export interface Service {
  id: number;
  name: string;
  price: number;
  requirementKeys: string[];
}

export interface ProcessInfo {
  icon: string;
  text: string;
}

export const services: Service[] = [
  { 
    id: 1, 
    name: "E-Visa Business Single Entry", 
    price: 5000000,
    requirementKeys: [
      "passport6",
      "Photo",
      "iL",
      "hotel",
      "flightTicket"
    ]
  },
  { 
    id: 2, 
    name: "E-Visa Business Multiple Entry", 
    price: 7000000,
    requirementKeys: [
      "passport12",
      "Photo",
      "iL",
      "hotel",
      "rL",
      "itinerary",
      "flightTicket"
    ]
  },
];

export const translations = {
  en: {
    pageTitle: "Order Service",
    pageSubtitle: "Choose the e-visa service according to your needs",
    formLabels: {
      selectService: "Select Service",
      fullName: "Full Name",
      email: "Email",
      uploadDocuments: "Upload Documents",
      uploadInstructions: "Upload All Documents In 1 File",
      uploadDescription: "Include all requirements in one PDF/ZIP file",
      totalPrice: "Total Price:",
      orderNow: "Order Now",
      processing: "Processing...",
      securePayment: "Secure Payment",
      encryptedData: "Encrypted Data"
    },
    requirements: {
      title: "Document Requirements",
      items: {
        passport6: "Passport with minimum 6 months validity",
        passport12: "Passport with minimum 12 months validity",
        Photo: "Color photo with white background (3x4 cm)",
        iL: "Invitation letter from destination company",
        hotel: "Hotel reservation confirmation",
        flightTicket: "Flight ticket",
        rL: "Recommendation letter from origin company",
        itinerary: "Travel itinerary"
      }
    },
    processInfo: {
      title: "Process Information",
      items: [
        {
          icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
          text: "E-visa application process takes 3-5 business days"
        },
        {
          icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
          text: "Secure payment through various methods such as credit cards, bank transfers, and e-wallets"
        },
        {
          icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
          text: "E-visa is valid for 30 days from the date of entry into the destination country"
        },
        {
          icon: "M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z",
          text: "Confirmation and e-visa documents will be sent via the registered email"
        }
      ]
    },
    messages: {
      securityVerification: "Please complete the security verification first",
      invalidName: "Invalid name. Use only letters and common characters.",
      invalidEmail: "Invalid email",
      uploadRequired: "Please upload the requirements document",
      completeForm: "Please fill out the form completely",
      submissionError: "An error occurred while processing the order",
      orderSuccess: "Order successfully created and documents uploaded!",
      payLater: "Pay Later",
      continueToPayment: "Continue to Payment",
      startTypingToShowVerification: "Start filling the form to show security verification",
      processingOrder: "Processing your order. This might take a moment..."
    }
  },
  id: {
    pageTitle: "Order Layanan",
    pageSubtitle: "Pilih layanan e-visa sesuai kebutuhan Anda",
    formLabels: {
      selectService: "Pilih Layanan",
      fullName: "Nama Lengkap",
      email: "Email",
      uploadDocuments: "Upload Dokumen",
      uploadInstructions: "Upload Semua Dokumen Dalam 1 File",
      uploadDescription: "Sertakan semua persyaratan dalam satu file PDF/ZIP",
      totalPrice: "Total Harga:",
      orderNow: "Pesan Sekarang",
      processing: "Sedang Diproses...",
      securePayment: "Pembayaran Aman",
      encryptedData: "Data Terenkripsi"
    },
    requirements: {
      title: "Persyaratan Dokumen",
      items: {
        passport6: "Paspor dengan masa berlaku minimal 6 bulan",
        passport12: "Paspor dengan masa berlaku minimal 12 bulan",
        Photo: "Foto berwarna latar belakang putih (3x4 cm)",
        iL: "Surat undangan dari perusahaan tujuan",
        hotel: "Bukti reservasi hotel",
        flightTicket: "Tiket Pesawat",
        rL: "Surat rekomendasi dari perusahaan asal",
        itinerary: "Jadwal perjalanan (itinerary)"
      }
    },
    processInfo: {
      title: "Informasi Proses",
      items: [
        {
          icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
          text: "Proses pengajuan e-visa membutuhkan waktu 3-5 hari kerja"
        },
        {
          icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
          text: "Pembayaran aman melalui berbagai metode seperti kartu kredit, transfer bank, dan e-wallet"
        },
        {
          icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
          text: "E-visa berlaku selama 30 hari dari tanggal masuk negara tujuan"
        },
        {
          icon: "M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z",
          text: "Konfirmasi dan dokumen e-visa akan dikirim melalui email yang didaftarkan"
        }
      ]
    },
    messages: {
      securityVerification: "Mohon selesaikan verifikasi keamanan terlebih dahulu",
      invalidName: "Nama tidak valid. Gunakan hanya huruf dan karakter umum.",
      invalidEmail: "Email tidak valid",
      uploadRequired: "Mohon unggah dokumen persyaratan",
      completeForm: "Mohon isi formulir dengan lengkap",
      submissionError: "Terjadi kesalahan saat memproses pesanan",
      orderSuccess: "Pesanan berhasil dibuat dan dokumen diunggah!",
      payLater: "Bayar Nanti",
      continueToPayment: "Lanjutkan ke Pembayaran",
      startTypingToShowVerification: "Mulai mengisi formulir untuk menampilkan verifikasi keamanan",
      processingOrder: "Sedang memproses pesanan Anda. Ini mungkin membutuhkan waktu beberapa saat..."
    }
  }
};