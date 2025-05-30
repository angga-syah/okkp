"use client";
import { motion } from "framer-motion";
import { useLanguage } from "../Header/Bahasa"

const Atas = () => {
  const { language } = useLanguage();
  // Content translations
  const content = {
    en: {
      title: "Contact Us",
      text1: "We are always ready to assist you with foreign worker documentation and investment licensing. Don't hesitate to contact our team for consultation and further information.",
      text2: "Our professional team is ready to provide consultation and assistance to facilitate the processing of the documents you need. We are committed to providing services that are fast, efficient, and in accordance with applicable regulations."
    },
    id: {
      title: "Kontak Kami",
      text1: "Kami selalu siap membantu Anda dalam pengurusan dokumen Tenaga Kerja Asing dan perizinan investasi. Jangan ragu untuk menghubungi tim kami untuk konsultasi dan informasi lebih lanjut.",
      text2: "Tim profesional kami siap memberikan konsultasi dan bantuan untuk mempermudah proses pengurusan dokumen yang Anda perlukan. Kami berkomitmen untuk memberikan layanan yang cepat, efisien, dan sesuai dengan peraturan yang berlaku."
    }
  };

  // Current language content
  const t = content[language as keyof typeof content];

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
          {t.title}
        </h2>
        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          viewport={{ once: true }}
          className="text-base text-gray-600 dark:text-gray-400 mb-4 text-justify"
        >
          {t.text1}
        </motion.p>
        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          viewport={{ once: true }}
          className="text-base text-gray-600 dark:text-gray-400 mb-4 text-justify"
        >
          {t.text2}
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Atas;