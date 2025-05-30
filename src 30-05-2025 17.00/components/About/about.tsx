"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import { useLanguage } from "../Header/Bahasa";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.6, ease: "easeOut" } 
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
};

const slideIn = {
  hidden: { opacity: 0, x: -30 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { 
      type: "spring", 
      stiffness: 80, 
      damping: 12,
      duration: 0.5 
    } 
  }
};

const popUp = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1, 
    transition: { 
      type: "spring", 
      stiffness: 250, 
      damping: 15, 
      delay: 0.1 
    } 
  }
};

// Company Info Section
const CompanyInfo = () => {
  const { language } = useLanguage();
  // Content translations (same as before)
  const content = {
    en: {
      solutionText: "Trusted solution for processing foreign worker legality and company establishment in Indonesia",
      values: [
        {
          title: "Professional",
          description: "Our expert team is ready to provide the best solutions with high professional standards.",
          icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        },
        {
          title: "Efficient",
          description: "Fast and timely processing with guaranteed results.",
          icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        },
        {
          title: "Trustworthy",
          description: "Experienced in company legality processing with a good track record of success.",
          icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        }
      ],
      servicesTitle: "Our Services",
      services: [
        {
          title: "Foreign Worker Legality",
          description: "Complete services for foreign worker legality processes in Indonesia"
        },
        {
          title: "Company Establishment",
          description: "Assisting in the process of establishing new companies from start to finish"
        },
        {
          title: "Business Licensing",
          description: "Processing business permits and other legal documents for business needs"
        },
        {
          title: "Legal Consultation",
          description: "Consultation on legal aspects and company legality in Indonesia"
        }
      ],
      historyTitle: "Our History and Vision",
      historyText1: "Established in 1998, PT. Fortuna Sada Nioga is present as a solution for domestic and foreign companies that need services for processing Foreign Worker (TKA) documents and investment permits in Indonesia. Starting from a small office in Jakarta, we continue to grow into one of the leading consultants in this field.",
      historyText2: "We understand the complexity of regulations in Indonesia and are committed to providing professional services that are efficient, accurate, and in accordance with applicable regulations. With an experienced team of experts, we are ready to help clients overcome various administrative and regulatory challenges.",
      historyText3: "Our vision is to be a leading partner in facilitating the administrative needs of companies, so that clients can focus on developing their core business. The values of integrity, professionalism, and commitment to client satisfaction are the foundation of every service we provide."
    },
    id: {
      solutionText: "Solusi terpercaya untuk pengurusan legalitas TKA dan perusahaan di Indonesia",
      values: [
        {
          title: "Profesional",
          description: "Tim ahli kami siap memberikan solusi terbaik dengan standar profesional tinggi.",
          icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        },
        {
          title: "Efisien",
          description: "Proses pengurusan cepat dan tepat waktu dengan hasil yang terjamin.",
          icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        },
        {
          title: "Terpercaya",
          description: "Berpengalaman dalam pengurusan legalitas perusahaan dengan catatan kesuksesan yang baik.",
          icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        }
      ],
      servicesTitle: "Layanan Kami",
      services: [
        {
          title: "Pengurusan Legalitas TKA",
          description: "Layanan lengkap untuk proses legalitas Tenaga Kerja Asing di Indonesia"
        },
        {
          title: "Pendirian Perusahaan",
          description: "Membantu proses pendirian perusahaan baru dari awal hingga selesai"
        },
        {
          title: "Perizinan Usaha",
          description: "Pengurusan izin usaha dan dokumen legal lainnya untuk kebutuhan bisnis"
        },
        {
          title: "Konsultasi Hukum",
          description: "Konsultasi tentang aspek hukum dan legalitas perusahaan di Indonesia"
        }
      ],
      historyTitle: "Sejarah dan Visi Kami",
      historyText1: "Didirikan pada tahun 1998, PT. Fortuna Sada Nioga hadir sebagai solusi bagi perusahaan domestik maupun asing yang membutuhkan layanan pengurusan dokumen Tenaga Kerja Asing (TKA) dan perizinan investasi di Indonesia. Berawal dari sebuah kantor kecil di Jakarta, kami terus berkembang menjadi salah satu konsultan terkemuka di bidang ini.",
      historyText2: "Kami memahami kompleksitas regulasi di Indonesia dan berkomitmen untuk menyediakan layanan profesional yang efisien, akurat, dan sesuai dengan ketentuan yang berlaku. Dengan tim ahli yang berpengalaman, kami siap membantu klien mengatasi berbagai tantangan administratif dan regulasi.",
      historyText3: "Visi kami adalah menjadi mitra terdepan dalam memfasilitasi kebutuhan administratif perusahaan, sehingga klien dapat fokus pada pengembangan bisnis utama mereka. Nilai-nilai integritas, profesionalisme, dan komitmen terhadap kepuasan klien menjadi landasan dalam setiap layanan yang kami berikan."
    }
  };

  // Current language content
  const t = content[language];

  return (
    <section className="py-8 md:py-12 lg:py-16 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={fadeIn}
          className="text-center mb-8 md:mb-12"
        >
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "8rem" }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="h-1 bg-blue-600 mx-auto mb-4"
          ></motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="text-lg md:text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto"
          >
            {t.solutionText}
          </motion.p>
        </motion.div>

        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8"
        >
          {t.values.map((item, index) => (
            <motion.div 
              key={index}
              variants={slideIn}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
            >
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className="text-blue-600 dark:text-blue-400 mb-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {item.icon}
                </svg>
              </motion.div>
              <motion.h3 
                whileHover={{ scale: 1.05 }}
                className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center"
              >
                {item.title}
              </motion.h3>
              <p className="text-gray-700 dark:text-gray-300 text-center">
                {item.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={popUp}
          className="bg-blue-50 dark:bg-gray-700 p-6 md:p-8 rounded-lg shadow-md max-w-4xl mx-auto mt-8"
        >
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            viewport={{ once: true }}
            className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center"
          >
            {t.servicesTitle}
          </motion.h2>
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {t.services.map((service, index) => (
              <motion.div 
                key={index}
                variants={slideIn}
                className="flex items-start"
              >
                <motion.div 
                  className="flex-shrink-0 mr-3"
                  whileHover={{ rotate: 360, scale: 1.2 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="h-6 w-6 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </motion.div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm md:text-base">{service.title}</h3>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">{service.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Directors Section
const DirectorsSection = () => {
  const { language } = useLanguage();

  // Content translations (same as before)
  const content = {
    en: {
      directorsTitle: "Board of Directors",
      directorsSubtitle: "Led by experienced professionals committed to providing the best service",
      directors: [
        {
          name: "Andy Natanael Manik",
          position: "",
          description: "Leading our company with strategic vision and extensive expertise in legal consultation and foreign worker management. Committed to maintaining the highest standards of service excellence and client satisfaction.",
          image: "/images/direktur/direktur-3.jpg"
        },
        {
          name: "Indra Jaya Sembiring",
          position: "",
          description: "With over 27 years of experience in company legality and foreign worker consulting. Has extensive networks with various government agencies to ensure fast and accurate document processing.",
          image: "/images/direktur/direktur-1.jpg"
        },
        {
          name: "Donny Frisky Perangin Angin",
          position: "",
          description: "Expert in operations and legal document management systems. With 25 years of experience, he has built an efficient work system that is the key to the company's success in providing fast and accurate services.",
          image: "/images/direktur/direktur-2.jpg"
        }
      ]
    },
    id: {
      directorsTitle: "Jajaran Direksi",
      directorsSubtitle: "Dipimpin oleh profesional berpengalaman yang berkomitmen memberikan layanan terbaik",
      directors: [
        {
          name: "Andy Natanael Manik",
          position: "",
          description: "Memimpin perusahaan kami dengan visi strategis dan keahlian luas dalam konsultasi hukum dan pengelolaan tenaga kerja asing. Berkomitmen untuk menjaga standar tertinggi dalam pelayanan dan kepuasan klien.",
          image: "/images/direktur/direktur-3.jpg" 
        },
        {
          name: "Indra Jaya Sembiring",
          position: "",
          description: "Berpengalaman lebih dari 27 tahun dalam bidang konsultasi legalitas perusahaan dan TKA. Memiliki jaringan luas dengan berbagai instansi pemerintahan untuk memastikan proses pengurusan dokumen yang cepat dan akurat.",
          image: "/images/direktur/direktur-1.jpg"
        },
        {
          name: "Donny Frisky Perangin Angin",
          position: "",
          description: "Ahli dalam operasional dan manajemen sistem pengurusan dokumen legal. Dengan pengalaman 25 tahun, beliau telah membangun sistem kerja efisien yang menjadi kunci kesuksesan perusahaan dalam memberikan layanan cepat dan tepat.",
          image: "/images/direktur/direktur-2.jpg"
        }
      ]
    }
  };

  // Current language content
  const t = content[language];

  return (
    <section className="py-8 md:py-14 lg:py-20 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeIn}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            {t.directorsTitle}
          </h2>
          <motion.div 
            initial={{ width: 0 }}
            whileInView={{ width: "6rem" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="h-1 bg-blue-600 mx-auto mb-4"
          ></motion.div>
          <p className="text-base md:text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto text-center">
            {t.directorsSubtitle}
          </p>
        </motion.div>

        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
        >
          {t.directors.map((director, index) => (
            <motion.div 
              key={index}
              variants={slideIn}
              className="bg-gray-50 dark:bg-gray-700 rounded-lg shadow-lg overflow-hidden group"
            >
              <div className="relative h-64 overflow-hidden">
                <Image
                  src={director.image}
                  alt={director.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                <motion.div 
                  initial={{ y: 10, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  viewport={{ once: true }}
                  className="absolute bottom-0 left-0 p-4 md:p-6 text-white"
                >
                  <h3 className="text-lg md:text-xl font-bold mb-1">{director.name}</h3>
                  <p className="text-blue-300">{director.position}</p>
                </motion.div>
              </div>
              <div className="p-4 md:p-6">
                <p className="text-gray-700 dark:text-gray-300 text-sm md:text-base text-justify">
                  {director.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// Main About Component - Now split into separate sections with their own animations
const About = () => {
  return (
    <div className="">
      {/* Each section now handles its own animations */}
      <CompanyInfo />
      <DirectorsSection />
    </div>
  );
};

export default About;