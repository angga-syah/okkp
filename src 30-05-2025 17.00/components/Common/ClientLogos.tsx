"use client";

import Marquee from "react-fast-marquee";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useLanguage } from "../Header/Bahasa";
import { motion } from "framer-motion";

const clientLogos = [
  "/images/logo/klien/acset.png",
  "/images/logo/klien/asahi.png",
  "/images/logo/klien/asics.png",
  "/images/logo/klien/asus.png",
  "/images/logo/klien/centratama.png",
  "/images/logo/klien/gsi.png",
  "/images/logo/klien/panasonic.png",
  "/images/logo/klien/yakult.png",
];

const ClientLogos = () => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { language } = useLanguage();

  // Content translations
  const content = {
    en: {
      title: "Our Clients"
    },
    id: {
      title: "Klien Kami"
    }
  };

  // Current language content
  const t = content[language as keyof typeof content];

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fungsi untuk mencegah klik kanan
  const preventRightClick = (e) => {
    e.preventDefault();
    return false;
  };

  // Fungsi untuk mencegah drag/select
  const preventDrag = (e) => {
    e.preventDefault();
    return false;
  };

  useEffect(() => {
    // Disable context menu pada seluruh container
    const container = document.querySelector('.client-logos-container');
    if (container) {
      container.addEventListener('contextmenu', preventRightClick);
      
      // Cleanup effect
      return () => {
        container.removeEventListener('contextmenu', preventRightClick);
      };
    }
  }, [mounted]);

  // Tambahkan CSS global untuk mencegah pemilihan teks dan gambar
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.innerHTML = `
        .client-logos-container img {
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -o-user-select: none;
          user-select: none;
          -webkit-user-drag: none;
          -khtml-user-drag: none;
          -moz-user-drag: none;
          -o-user-drag: none;
          user-drag: none;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  return (
    <div className="client-logos-container relative py-16 overflow-hidden flex flex-col items-center"
         onContextMenu={preventRightClick}>
      {/* Background Full-Screen dengan Image yang Fleksibel */}
      <div className="absolute inset-0 w-full h-full -z-10">
        {/* Background Shape - Removed lazy loading for LCP optimization */}
        <Image
          src="/images/video/shape.svg"
          alt="Background Shape"
          priority={true}
          fill
          style={{ objectFit: "cover" }}
          className="opacity-80"
          unoptimized // Added for SVG to prevent unnecessary processing
          onContextMenu={preventRightClick}
          onDragStart={preventDrag}
          onMouseDown={preventRightClick}
          draggable="false"
        />

        {/* Efek Salju - Menggunakan CSS Animation daripada SVG animation yang kompleks */}
        {theme === "dark" && mounted && <SnowfallEffect />}
      </div>

      {/* Title with motion */}
      <motion.h2 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="text-center text-3xl font-bold text-gray-900 dark:text-white mb-8 relative z-10 mt-[-2rem]"
      >
        {t.title}
      </motion.h2>

      {/* Client Logos Marquee */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        viewport={{ once: true }}
        className="relative z-10 w-full overflow-hidden mt-[-1rem]"
        onContextMenu={preventRightClick}
      >
        <Marquee speed={40} gradient={false} className="flex items-center">
          {clientLogos.map((logo, index) => {
            // Determine if the logo is SVG based on file extension
            const isSvg = logo.toLowerCase().endsWith('.svg');
            
            return (
              <div key={index} className="mx-4 md:mx-8 lg:mx-12 flex items-center justify-center">
                <div className="w-[100px] md:w-[140px] lg:w-[160px] h-[60px] md:h-[80px] lg:h-[90px] relative">
                  <Image 
                    src={logo} 
                    alt={`Client ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 100px, (max-width: 1024px) 140px, 160px"
                    className="drop-shadow-lg object-contain select-none"
                    unoptimized={isSvg}
                    quality={95}
                    onContextMenu={preventRightClick}
                    onDragStart={preventDrag}
                    onMouseDown={preventRightClick}
                    draggable="false"
                    style={{ 
                      userSelect: "none", 
                      WebkitUserSelect: "none",
                      MozUserSelect: "none",
                      msUserSelect: "none",
                      pointerEvents: "none" // Opsi paling kuat untuk mencegah interaksi
                    }}
                  />
                </div>
              </div>
            );
          })}
        </Marquee>
      </motion.div>
    </div>
  );
};

// Komponen terpisah untuk efek salju - menggunakan pendekatan CSS
const SnowfallEffect = () => {
  // Membuat array kepingan salju dengan berbagai karakteristik
  const snowflakes = Array.from({ length: 100 }, (_, index) => {
    const size = Math.random() * 4 + 1;
    const left = Math.random() * 100; // Posisi horizontal (0-100%)
    const animationDuration = Math.random() * 5 + 10; // 10-15s
    const animationDelay = Math.random() * 5; // 0-5s delay
    const opacity = Math.random() * 0.5 + 0.3; // 0.3-0.8 opacity
    
    return (
      <div
        key={index}
        className="snowflake absolute"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          left: `${left}%`,
          opacity,
          backgroundColor: "white",
          borderRadius: "50%",
          animation: `snowfall ${animationDuration}s linear ${animationDelay}s infinite`,
          top: `-${size}px`,
        }}
      />
    );
  });

  return (
    <div className="absolute inset-0 overflow-hidden">
      <style jsx>{`
        @keyframes snowfall {
          0% {
            transform: translateY(-10px) rotate(0deg);
          }
          25% {
            transform: translateY(25vh) translateX(10px) rotate(90deg);
          }
          50% {
            transform: translateY(50vh) translateX(-10px) rotate(180deg);
          }
          75% {
            transform: translateY(75vh) translateX(10px) rotate(270deg);
          }
          100% {
            transform: translateY(100vh) translateX(-10px) rotate(360deg);
          }
        }
      `}</style>
      {snowflakes}
    </div>
  );
};

export default ClientLogos;