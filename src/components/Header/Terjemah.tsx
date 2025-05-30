import React from "react";
import { useLanguage } from "./Bahasa";

const Terjemah: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    const newLang = language === "en" ? "id" : "en";
    setLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  return (
    <button onClick={toggleLanguage} className="px-3 py-1 rounded-md border flex items-center space-x-2">
      {language === "en" ? (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="12" fill="#D7141A"/> 
            <rect y="12" width="24" height="12" fill="#FFFFFF"/> 
          </svg>
          <span>ID</span>
        </>
      ) : (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" fill="#012169"/>
            <path d="M0,0 L24,24 M24,0 L0,24" stroke="white" strokeWidth="4"/>
            <path d="M0,0 L24,24 M24,0 L0,24" stroke="#C8102E" strokeWidth="2"/>
            <rect x="10" width="4" height="24" fill="white"/>
            <rect y="10" width="24" height="4" fill="white"/>
            <rect x="11" width="2" height="24" fill="#C8102E"/>
            <rect y="11" width="24" height="2" fill="#C8102E"/>
          </svg>
          <span>EN</span>
        </>
      )}
    </button>
  );
};

export default Terjemah;