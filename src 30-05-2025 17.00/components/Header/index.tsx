"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggler from "./ThemeToggler";
import { getTranslatedMenu } from "./menuData";
import Terjemah from "./Terjemah";
import { useLanguage } from "./Bahasa";
import { Menu } from "@/types/menu";
import RecursiveMenuNav from "./menu-sub";

const Header = () => {
  // Get language from context instead of using local state
  const { language } = useLanguage();
  
  const [navbarOpen, setNavbarOpen] = useState(false);
  const navbarToggleHandler = () => setNavbarOpen(!navbarOpen);

  const [sticky, setSticky] = useState(false);
  useEffect(() => {
    const handleStickyNavbar = () => {
      setSticky(window.scrollY >= 80);
    };
    window.addEventListener("scroll", handleStickyNavbar);
    return () => window.removeEventListener("scroll", handleStickyNavbar);
  }, []);

  // Menambahkan event listener untuk mendeteksi perubahan ukuran layar
  useEffect(() => {
    const handleResize = () => {
      // Tutup hamburger menu jika layar di atas breakpoint desktop (lg)
      if (window.innerWidth >= 1024 && navbarOpen) {
        setNavbarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [navbarOpen]);

  const pathname = usePathname();
  
  // State for translated menu
  const [translatedMenu, setTranslatedMenu] = useState<Menu[]>([]);

  // Update menu when language changes
  useEffect(() => {
    // Get translated menu based on current language from context
    const menu = getTranslatedMenu(language);
    setTranslatedMenu(menu);
  }, [language]); // Now depends on language from context

  return (
    <>
      <header
        className={`header left-0 top-0 z-40 flex w-full items-center ${
          sticky
            ? "fixed z-[9999] bg-white !bg-opacity-80 shadow-sticky backdrop-blur-sm transition dark:bg-gray-dark dark:shadow-sticky-dark"
            : "absolute bg-transparent"
        }`}
      >
        <div className="container">
          <div className="relative -mx-4 flex items-center justify-between">
            <div className="w-60 max-w-full px-4 xl:mr-12">
              <Link
                href="/"
                className={`header-logo block w-full ${
                  sticky ? "py-5 lg:py-2" : "py-12"
                }`}
              >
                <Image
                  src="/images/logo/logo-2.svg"
                  alt="logo"
                  width={150}
                  height={50}
                  className="w-full dark:hidden"
                />
                <Image
                  src="/images/logo/logo-2.svg"
                  alt="logo"
                  width={150}
                  height={50}
                  className="hidden w-full dark:block"
                />
              </Link>
            </div>       
            {navbarOpen && (
              <div 
                className="fixed inset-0 bg-black/50 z-[10000] lg:hidden" 
                onClick={navbarToggleHandler}
              ></div>
            )}
            <div className="flex w-full items-center justify-between px-4">

              <nav
                id="navbarCollapse"
                className={`navbar fixed right-4 z-[10001] w-[250px] rounded border-[.5px] border-body-color/50 bg-white px-6 py-4 shadow-xl duration-300 dark:border-body-color/20 dark:bg-dark lg:visible lg:static lg:w-auto lg:border-none lg:!bg-transparent lg:p-0 lg:shadow-none lg:z-40 lg:opacity-100 ${
                  navbarOpen
                    ? "visible top-24 opacity-100"
                    : "invisible top-[120%] opacity-0"
                }`}
              >
                {/* Desktop Navigation */}
                <div className="hidden lg:block">
                  <RecursiveMenuNav menuItems={translatedMenu} />
                </div>
                
                {/* Mobile Navigation */}
                <div className="block lg:hidden">
                  <RecursiveMenuNav menuItems={translatedMenu} isMobile={true} />
                </div>
              </nav>

              {/* Right Side Mobile Controls */}
              <div className="flex items-center justify-end w-auto ml-auto">
                <div className="flex items-center space-x-2 lg:space-x-4">
                  <ThemeToggler />
                  <Terjemah />
                  {/* Hamburger Button for Mobile */}
                  <button
                    onClick={navbarToggleHandler}
                    className="block rounded-lg px-1 py-[6px] ring-primary focus:ring-2 lg:hidden"
                  >
                    <span
                      className={`relative my-1.5 block h-0.5 w-[30px] bg-black transition-all duration-300 dark:bg-white ${
                        navbarOpen ? "top-[7px] rotate-45" : ""
                      }`}
                    />
                    <span
                      className={`relative my-1.5 block h-0.5 w-[30px] bg-black transition-all duration-300 dark:bg-white ${
                        navbarOpen ? "opacity-0" : ""
                      }`}
                    />
                    <span
                      className={`relative my-1.5 block h-0.5 w-[30px] bg-black transition-all duration-300 dark:bg-white ${
                        navbarOpen ? "top-[-8px] -rotate-45" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;