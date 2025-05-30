"use client";
import { motion } from "framer-motion";
import { useLanguage } from "../Header/Bahasa";

const Intro = () => {
  const { language } = useLanguage();
  
  // Content translations
  const content = {
    en: {
      title: "Regulations and Latest News",
      text1: "Discover a variety of informative writings and interesting articles.",
      text2: ""
    },
    id: {
      title: "Peraturan dan Berita Terbaru",
      text1: "Temukan beragam tulisan informatif dan artikel menarik seputar topik terkini.",
      text2: ""
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
          className="text-base text-gray-600 dark:text-gray-400 mb-4 text-center"
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

export default Intro;