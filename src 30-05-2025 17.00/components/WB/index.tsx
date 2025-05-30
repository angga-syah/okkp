"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../Header/Bahasa";
import { useTheme } from "next-themes";

const ZINDEX = {
  whatsappButton: 9999,
  mobileMenu: 9998,
  header: 9997,
  modal: 9996,
  toast: 9995,
  dropdown: 9994,
  overlay: 9990
};

const WB: React.FC = () => {
  const [showButton, setShowButton] = useState<boolean>(true);
  const [clickCount, setClickCount] = useState<number>(0);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // language context
  const { language } = useLanguage();
  
  // theme context
  const { theme } = useTheme();
  
  // translation content
  const content = {
    en: {
      confirmTitle: "Confirmation",
      confirmText: "Would you like to contact us via WhatsApp?",
      cancelButton: "Cancel",
      continueButton: "Continue",
      errorMessage: "Sorry, an error occurred. Please try again later.",
      waitMessage: "Please wait a moment before trying again.",
      defaultMessage: "Hello, I'm interested in your services."
    },
    id: {
      confirmTitle: "Konfirmasi",
      confirmText: "Apakah Anda ingin menghubungi kami melalui WhatsApp?",
      cancelButton: "Batal",
      continueButton: "Lanjutkan",
      errorMessage: "Maaf, terjadi kesalahan. Silakan coba lagi nanti.",
      waitMessage: "Mohon tunggu beberapa saat sebelum mencoba kembali.",
      defaultMessage: "Halo, saya tertarik dengan layanan Anda."
    }
  };
  
  // current language content
  const t = content[language as keyof typeof content];
  
  // whatsApp number from env
  const phoneNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCount = sessionStorage.getItem('waClickCount');
      const storedTime = sessionStorage.getItem('waLastClickTime');
      
      if (storedCount) setClickCount(parseInt(storedCount));
      if (storedTime) setLastClickTime(parseInt(storedTime));
    }
  }, []);
  
  // anti-spam timeout
  useEffect(() => {
    if (clickCount > 5) {
      setShowButton(false);
      const timer = setTimeout(() => setShowButton(true), 30000);
      return () => clearTimeout(timer);
    }
  }, [clickCount]);

  // handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showConfirm && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowConfirm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showConfirm]);
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // rate limit
    const now = Date.now();
    if (now - lastClickTime < 5000) {
      setClickCount((prevCount) => {
        const newCount = prevCount + 1;
        sessionStorage.setItem('waClickCount', newCount.toString());
        return newCount;
      });
      
      if (clickCount > 3) {
        alert(t.waitMessage);
        return;
      }
    } else {
      setClickCount(1);
      sessionStorage.setItem('waClickCount', '1');
    }
    
    setLastClickTime(now);
    sessionStorage.setItem('waLastClickTime', now.toString());
    
    setShowConfirm(true);
  };
  
  const confirmNavigation = () => {
    if (!phoneNumber) {
      console.error("WhatsApp number not found in environment variables");
      alert(t.errorMessage);
      return;
    }
    
    const message = encodeURIComponent(t.defaultMessage);
    
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.location.href = `whatsapp://send?phone=${phoneNumber}&text=${message}`;
    } else {
      window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
    }
    
    setShowConfirm(false);
  };
  
  if (!showButton) return null;
  
  const isDarkMode = theme === 'dark';
  
  return (
    <>
      <a
        href="#"
        onClick={handleClick}
        className="fixed bottom-5 left-5 bg-green-500 text-white p-3 rounded-full shadow-lg hover:bg-green-600 transition-all pointer-events-auto"
        style={{ zIndex: ZINDEX.whatsappButton }}
        aria-label="Contact us on WhatsApp"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          fill="currentColor" 
          className="bi bi-whatsapp" 
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path d="M13.6 2.4A7.92 7.92 0 0 0 8 0a8 8 0 0 0-8 8a7.92 7.92 0 0 0 1.2 4.3L0 16l4-1.1A7.92 7.92 0 0 0 8 16a8 8 0 0 0 5.6-13.6ZM8 14.5a6.5 6.5 0 0 1-3.4-1L4.3 13l-2.4.7.7-2.4-.4-.6A6.5 6.5 0 1 1 8 14.5ZM11 10.8c-.2.6-1.3 1.2-1.8 1.2s-.8 0-2.5-.8a9.5 9.5 0 0 1-3-3C3 6.5 3 6.2 3 6c.2-.2.4-.5.6-.5h.5c.2 0 .4 0 .6.3l.8 1c.2.2.2.4.1.6a1.5 1.5 0 0 1-.2.5c-.1.1-.2.2-.1.4 0 .2.3.8.7 1.1s.9.5 1.1.6c.2.1.3.1.4 0s.2-.2.3-.4.3-.3.5-.2l1.2.6c.2.1.4.2.4.3 0 0 .2.4.1.7Z"/>
        </svg>
        <span className="sr-only">WhatsApp</span>
      </a>
      
      {showConfirm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          style={{ zIndex: ZINDEX.modal }}
        >
          <div 
            ref={modalRef}
            className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} p-5 rounded-lg shadow-xl max-w-sm w-full mx-4`}
          >
            <h3 className="text-lg font-semibold mb-2">{t.confirmTitle}</h3>
            <p className="mb-4">{t.confirmText}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowConfirm(false)}
                className={`px-4 py-2 rounded ${isDarkMode ? 'border border-gray-600 hover:bg-gray-700' : 'border border-gray-300 hover:bg-gray-100'}`}
              >
                {t.cancelButton}
              </button>
              <button 
                onClick={confirmNavigation}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                {t.continueButton}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div style={{ opacity: 0, position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
    </>
  );
};

export default WB;