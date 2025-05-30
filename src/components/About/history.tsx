"use client";
import { motion } from "framer-motion";
import { useLanguage } from "../Header/Bahasa"

const HistoryContent = () => {
  const { language } = useLanguage();

 // Content translations
 const content = {
    en: {
      historyTitle: "Our History and Vision",
      historyText1: "Established in 1998, PT. Fortuna Sada Nioga is present as a solution for domestic and foreign companies that need services for processing Foreign Worker (TKA) documents and investment permits in Indonesia. Starting from a small office in Jakarta, we continue to grow into one of the leading consultants in this field.",
      historyText2: "We understand the complexity of regulations in Indonesia and are committed to providing professional services that are efficient, accurate, and in accordance with applicable regulations. With an experienced team of experts, we are ready to help clients overcome various administrative and regulatory challenges.",
      historyText3: "Our vision is to be a leading partner in facilitating the administrative needs of companies, so that clients can focus on developing their core business. The values of integrity, professionalism, and commitment to client satisfaction are the foundation of every service we provide."
    },
    id: {
      historyTitle: "Sejarah dan Visi Kami",
      historyText1: "Didirikan pada tahun 1998, PT. Fortuna Sada Nioga hadir sebagai solusi bagi perusahaan domestik maupun asing yang membutuhkan layanan pengurusan dokumen Tenaga Kerja Asing (TKA) dan perizinan investasi di Indonesia. Berawal dari sebuah kantor kecil di Jakarta, kami terus berkembang menjadi salah satu konsultan terkemuka di bidang ini.",
      historyText2: "Kami memahami kompleksitas regulasi di Indonesia dan berkomitmen untuk menyediakan layanan profesional yang efisien, akurat, dan sesuai dengan ketentuan yang berlaku. Dengan tim ahli yang berpengalaman, kami siap membantu klien mengatasi berbagai tantangan administratif dan regulasi.",
      historyText3: "Visi kami adalah menjadi mitra terdepan dalam memfasilitasi kebutuhan administratif perusahaan, sehingga klien dapat fokus pada pengembangan bisnis utama mereka. Nilai-nilai integritas, profesionalisme, dan komitmen terhadap kepuasan klien menjadi landasan dalam setiap layanan yang kami berikan."
    }
  };

  // Current language content
  const t = content[language];

  return (
    <div className="container mx-auto mb-16 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto mb-12"
      >
        <h2 className="text-2xl font-bold text-black dark:text-white mb-4 text-center">
          {t.historyTitle}
        </h2>
        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          viewport={{ once: true }}
          className="text-base text-gray-600 dark:text-gray-400 mb-4 text-justify"
        >
          {t.historyText1}
        </motion.p>
        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          viewport={{ once: true }}
          className="text-base text-gray-600 dark:text-gray-400 mb-4 text-justify"
        >
          {t.historyText2}
        </motion.p>
        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          viewport={{ once: true }}
          className="text-base text-gray-600 dark:text-gray-400 text-justify"
        >
          {t.historyText3}
        </motion.p>
      </motion.div>
    </div>
  );
};
export default HistoryContent;