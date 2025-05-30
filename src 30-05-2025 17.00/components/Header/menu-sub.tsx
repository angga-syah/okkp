"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "@/types/menu";

interface MenuItemProps {
  item: Menu;
  depth: number;
  pathname: string;
  isMobile?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ 
  item, 
  depth, 
  pathname, 
  isMobile = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // Track open state of nested submenus for mobile
  const [openNestedMenus, setOpenNestedMenus] = useState<{[key: number]: boolean}>({});
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasSubmenu = item.submenu && item.submenu.length > 0;
  const isActive = pathname === item.path;
  
  // Check if any child or grandchild is active
  const hasActiveChild = hasSubmenu && item.submenu?.some(subItem => {
    if (subItem.path && pathname === subItem.path) return true;
    return subItem.submenu?.some(nestedItem => nestedItem.path && pathname === nestedItem.path);
  });

  // For mobile: toggle submenu on click
  const toggleSubmenu = (e: React.MouseEvent) => {
    if (hasSubmenu && isMobile) {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };
  
  // For mobile: toggle nested submenu
  const toggleNestedSubmenu = (e: React.MouseEvent, id: number) => {
    if (isMobile) {
      e.preventDefault();
      setOpenNestedMenus(prev => ({
        ...prev,
        [id]: !prev[id]
      }));
    }
  };
  
  // Close dropdown when clicking outside (for mobile)
  useEffect(() => {
    if (isMobile) {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setOpenNestedMenus({});
        }
      };
  
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isMobile]);

  // For the main "Services" menu item at depth 0
  if (depth === 0 && item.title.toLowerCase().includes("services") || item.title.toLowerCase().includes("layanan")) {
    const linkClasses = `flex py-2 text-base lg:mr-0 lg:inline-flex lg:px-0 lg:py-6 ${
      (isActive || hasActiveChild)
        ? "text-primary dark:text-white"
        : "text-dark hover:text-primary dark:text-white/70 dark:hover:text-white"
    }`;

    return (
      <div ref={dropdownRef} className="group relative">
        <div
          onClick={isMobile ? toggleSubmenu : undefined}
          className={linkClasses + " cursor-pointer"}
        >
          {item.title}
          <span className="pl-3">
            <svg width="25" height="24" viewBox="0 0 25 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.29289 8.8427C6.68342 8.45217 7.31658 8.45217 7.70711 8.8427L12 13.1356L16.2929 8.8427C16.6834 8.45217 17.3166 8.45217 17.7071 8.8427C18.0976 9.23322 18.0976 9.86639 17.7071 10.2569L12 15.964L6.29289 10.2569C5.90237 9.86639 5.90237 9.23322 6.29289 8.8427Z"
                fill="currentColor"
              />
            </svg>
          </span>
        </div>
        
        <div className={isMobile 
          ? `submenu relative bg-white transition-all duration-300 dark:bg-dark pl-4 ${isOpen ? "block" : "hidden"}`
          : "submenu absolute left-0 top-full rounded-sm bg-white transition-[top] duration-300 dark:bg-dark lg:w-[250px] lg:p-4 lg:shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:top-full z-50"
        }>
          {/* "All Services" link first */}
          {item.submenu?.find(subItem => 
            subItem.title.toLowerCase().includes("all") || 
            subItem.title.toLowerCase().includes("semua")
          ) && (
            <Link 
              href={item.submenu.find(subItem => 
                subItem.title.toLowerCase().includes("all") || 
                subItem.title.toLowerCase().includes("semua")
              )?.path || "#"}
              className={`block rounded py-2.5 text-sm lg:px-3 ${
                pathname === item.submenu.find(subItem => 
                  subItem.title.toLowerCase().includes("all") || 
                  subItem.title.toLowerCase().includes("semua")
                )?.path
                  ? "text-primary dark:text-white"
                  : "text-dark hover:text-primary dark:text-white/70 dark:hover:text-white"
              }`}
            >
              {item.submenu.find(subItem => 
                subItem.title.toLowerCase().includes("all") || 
                subItem.title.toLowerCase().includes("semua")
              )?.title}
            </Link>
          )}
          
          {/* Only show category items (depth 1 items) */}
          {item.submenu?.filter(subItem => 
            subItem.submenu && 
            !(subItem.title.toLowerCase().includes("all") || 
              subItem.title.toLowerCase().includes("semua"))
          ).map((subItem, idx) => (
            <div key={idx} className="group/sub relative">
              <div 
                className={`block rounded py-2.5 text-sm lg:px-3 flex justify-between items-center cursor-pointer ${
                  pathname === subItem.path
                    ? "text-primary dark:text-white"
                    : "text-dark hover:text-primary dark:text-white/70 dark:hover:text-white"
                }`}
                onClick={isMobile ? (e) => toggleNestedSubmenu(e, subItem.id) : undefined}
              >
                {subItem.title}
                <span className="pl-3">
                  {!isMobile ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                    </svg>
                  ) : (
                    <svg width="25" height="24" viewBox="0 0 25 24">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M6.29289 8.8427C6.68342 8.45217 7.31658 8.45217 7.70711 8.8427L12 13.1356L16.2929 8.8427C16.6834 8.45217 17.3166 8.45217 17.7071 8.8427C18.0976 9.23322 18.0976 9.86639 17.7071 10.2569L12 15.964L6.29289 10.2569C5.90237 9.86639 5.90237 9.23322 6.29289 8.8427Z"
                        fill="currentColor"
                      />
                    </svg>
                  )}
                </span>
              </div>
              
              {/* Third level (individual services) */}
              <div className={isMobile 
                ? `pl-4 ${openNestedMenus[subItem.id] ? "block" : "hidden"}` // Toggle based on state
                : "submenu absolute left-full top-0 rounded-sm bg-white transition-all duration-300 dark:bg-dark lg:w-[250px] lg:p-4 lg:shadow-lg opacity-0 invisible group-hover/sub:opacity-100 group-hover/sub:visible z-50"
              }>
                {subItem.submenu?.map((serviceItem, serviceIdx) => (
                  <Link
                    key={serviceIdx}
                    href={serviceItem.path || "#"}
                    className={`block rounded py-2.5 text-sm lg:px-3 ${
                      pathname === serviceItem.path
                        ? "text-primary dark:text-white"
                        : "text-dark hover:text-primary dark:text-white/70 dark:hover:text-white"
                    }`}
                  >
                    {serviceItem.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // For regular menu items at depth 0
  if (depth === 0) {
    const linkClasses = `flex py-2 text-base lg:mr-0 lg:inline-flex lg:px-0 lg:py-6 ${
      (isActive || hasActiveChild)
        ? "text-primary dark:text-white"
        : "text-dark hover:text-primary dark:text-white/70 dark:hover:text-white"
    }`;
    
    return (
      <div ref={dropdownRef} className="relative">
        {item.path ? (
          <Link
            href={item.path}
            className={linkClasses}
            target={item.newTab ? "_blank" : undefined}
            rel={item.newTab ? "noopener noreferrer" : undefined}
          >
            {item.title}
          </Link>
        ) : (
          <div className={linkClasses}>
            {item.title}
          </div>
        )}
      </div>
    );
  }

  return null; // We handle all cases above, this is just for TypeScript
};

interface RecursiveMenuNavProps {
  menuItems: Menu[];
  isMobile?: boolean;
}

const RecursiveMenuNav: React.FC<RecursiveMenuNavProps> = ({ menuItems, isMobile = false }) => {
  const pathname = usePathname();

  return (
    <div className={isMobile ? "" : "block lg:flex lg:space-x-12"}>
      {menuItems.map((item, index) => (
        <MenuItem 
          key={index}
          item={item}
          depth={0}
          pathname={pathname}
          isMobile={isMobile}
        />
      ))}
    </div>
  );
};

export default RecursiveMenuNav;