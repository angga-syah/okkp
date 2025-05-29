import { Menu } from "@/types/menu";

// Definisikan tipe untuk menu dengan terjemahan
interface MenuWithTranslation {
  id: number;
  title: {
    en: string;
    id: string;
  };
  path?: string;
  newTab: boolean;
  submenu?: MenuWithTranslation[];
}

const menuData: MenuWithTranslation[] = [
  {
    id: 1,
    title: {
      id: "Beranda",
      en: "Home"
    },
    path: "/",
    newTab: false,
  },
  {
    id: 4,
    title: {
      id: "Layanan",
      en: "Services"
    },
    // Remove the path here to make it a pure dropdown menu item
    newTab: false,
    submenu: [
      {
        id: 40,
        title: {
          id: "Semua Layanan",
          en: "All Services"
        },
        path: "/services",
        newTab: false,
      },
      // Visa & Imigrasi Category
      {
        id: 41,
        title: {
          id: "Visa & Imigrasi",
          en: "Visa & Immigration"
        },
        newTab: false,
        submenu: [
          {
            id: 411,
            title: {
              id: "Visa Kunjungan",
              en: "Visit Visa"
            },
            path: "/visa",
            newTab: false,
          },
          {
            id: 412,
            title: {
              id: "Izin Kerja TKA",
              en: "Foreign Worker Permits"
            },
            path: "/ijin-kerja",
            newTab: false,
          },
          {
            id: 413,
            title: {
              id: "Izin Tinggal Keluarga",
              en: "Family Stay Permits"
            },
            path: "/ijin-tinggal",
            newTab: false,
          },
          {
            id: 414,
            title: {
              id: "Izin Tinggal Tetap (ITAP)",
              en: "Permanent Stay Permit"
            },
            path: "/itap",
            newTab: false,
          },
          {
            id: 415,
            title: {
              id: "VISA/KITAS Lansia",
              en: "Retirement Visa/KITAS"
            },
            path: "/itas-lansia",
            newTab: false,
          },
          {
            id: 416,
            title: {
              id: "Exit Permit Only (EPO)",
              en: "Exit Permit Only (EPO)"
            },
            path: "/epo",
            newTab: false,
          },
          {
            id: 417,
            title: {
              id: "Mutasi",
              en: "Changes & Transfers"
            },
            path: "/mutasi",
            newTab: false,
          }
        ]
      },
      // Layanan Bisnis Category
      {
        id: 42,
        title: {
          id: "Layanan Bisnis",
          en: "Business Services"
        },
        newTab: false,
        submenu: [
          {
            id: 421,
            title: {
              id: "Izin Ekspor dan Impor",
              en: "Export-Import Permits"
            },
            path: "/ekspor-impor",
            newTab: false,
          },
          {
            id: 422,
            title: {
              id: "Gudang Berikat",
              en: "Bonded Warehouse"
            },
            path: "/gudang-berikat",
            newTab: false,
          },
          {
            id: 423,
            title: {
              id: "Kawasan Berikat",
              en: "Bonded Zone"
            },
            path: "/kawasan-berikat",
            newTab: false,
          },
          {
            id: 424,
            title: {
              id: "Surat Keterangan Domisili",
              en: "Certificate of Domicile"
            },
            path: "/domisili",
            newTab: false,
          },
          {
            id: 425,
            title: {
              id: "Peraturan Perusahaan",
              en: "Company Regulations"
            },
            path: "/pp",
            newTab: false,
          }
        ]
      },
      // Layanan Investasi Category
      {
        id: 43,
        title: {
          id: "Layanan Investasi",
          en: "Investment Services"
        },
        newTab: false,
        submenu: [
          {
            id: 431,
            title: {
              id: "Dokumen Investasi",
              en: "Investment Documentation"
            },
            path: "/investasi",
            newTab: false,
          },
          {
            id: 432,
            title: {
              id: "Laporan Kegiatan Penanaman Modal",
              en: "Investment Activity Reports"
            },
            path: "/lkpm",
            newTab: false,
          },
          {
            id: 433,
            title: {
              id: "Nomor Pokok Wajib Pajak",
              en: "Tax ID Number (NPWP)"
            },
            path: "/npwp",
            newTab: false,
          }
        ]
      },
      // Kepatuhan & Pelaporan Category
      {
        id: 44,
        title: {
          id: "Kepatuhan & Pelaporan",
          en: "Compliance & Reporting"
        },
        newTab: false,
        submenu: [
          {
            id: 441,
            title: {
              id: "Wajib Lapor Ketenagakerjaan",
              en: "Manpower Reporting"
            },
            path: "/wlk",
            newTab: false,
          }
        ]
      }
    ],
  },
  {
    id: 2,
    title: {
      id: "Tentang Kami",
      en: "About Us"
    },
    path: "/about",
    newTab: false,
  },
  {
    id: 5,
    title: {
      id: "Pengguna Jasa",
      en: "Our Clients"
    },
    path: "/clients",
    newTab: false,
  },
  {
    id: 3,
    title: {
      id: "Kontak",
      en: "Contact"
    },
    path: "/contact",
    newTab: false,
  },
  {
    id: 33,
    title: {
      id: "Berita",
      en: "News"
    },
    path: "/news",
    newTab: false,
  },
];

// Recursive function to translate a menu item and its submenus
function translateMenuItem(item: MenuWithTranslation, language: string): Menu {
  const translatedItem: Menu = {
    id: item.id,
    title: item.title[language as keyof typeof item.title] || item.title['id'],
    newTab: item.newTab
  };
  
  if (item.path) {
    translatedItem.path = item.path;
  }
  
  if (item.submenu) {
    translatedItem.submenu = item.submenu.map(subItem => 
      translateMenuItem(subItem, language)
    );
  }
  
  return translatedItem;
}

// Fungsi untuk mengambil menu dengan bahasa yang dipilih
export function getTranslatedMenu(language: string = 'id'): Menu[] {
  return menuData.map(item => translateMenuItem(item, language));
}

export default menuData;