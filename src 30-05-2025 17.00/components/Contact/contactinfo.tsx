"use client";

import { useTheme } from "next-themes";
import { useState, useEffect, useRef, useMemo } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { useLanguage } from "../Header/Bahasa"

const ContactInfo = () => {
  const { theme } = useTheme();
  const [, setIsHovering] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { language } = useLanguage();
  
  // Fix: wrap location in useMemo to prevent it from changing on every render
  const location = useMemo(() => ({ lat: -6.302407196885168, lng: 106.83639146995553 }), []);
  
  // Environment variables should be used in production
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
  
  const googleMapsUrl = "https://www.google.com/maps/place/PT.+Fortuna+Sada+Nioga/@-6.3024697,106.8360252,20z/data=!4m6!3m5!1s0x2e69ed072f38c71f:0xa567f17a3e2db9b4!8m2!3d-6.3024463!4d106.8362979!16s%2Fg%2F11pyc1vw3h?entry=ttu";
  
  // Content translations
  const content = {
    en: {
      companyName: "PT. FORTUNA SADA NIOGA",
      officeLabel: "Office:",
      telpLabel: "Telp:",
      emailLabel: "Email:",
      loadingMap: "Loading map...",
      mapError: "Unable to load map. Please check your internet connection.",
      locationNote: "We're located at JI. TB Simatupang Kav. 89G, Jakarta Selatan",
      openInGoogleMaps: "Open in Google Maps"
    },
    id: {
      companyName: "PT. FORTUNA SADA NIOGA",
      officeLabel: "Kantor:",
      telpLabel: "Telp:",
      emailLabel: "Email:",
      loadingMap: "Memuat peta...",
      mapError: "Tidak dapat memuat peta. Silakan periksa koneksi internet Anda.",
      locationNote: "Kami berada di JI. TB Simatupang Kav. 89G, Jakarta Selatan",
      openInGoogleMaps: "Buka di Google Maps"
    }
  };
  
  // Animation effect for SVG elements
  useEffect(() => {
    const interval = setInterval(() => {
      setIsHovering(prev => !prev);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Google Maps
  useEffect(() => {
    if (!mapRef.current || mapLoaded || !apiKey || !mapId) return;

    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: apiKey,
          version: "weekly",
          libraries: ["maps", "marker"],
        });
        
        await loader.load();
        
        // Fix for TypeScript error: cast window to any type for Google Maps API access
        const { Map } = await (window as any).google.maps.importLibrary("maps");
        const { AdvancedMarkerElement } = await (window as any).google.maps.importLibrary("marker");
        
        const mapInstance = new Map(mapRef.current, {
          center: location,
          zoom: 16,
          mapId: mapId,
        });
        
        new AdvancedMarkerElement({
          map: mapInstance,
          position: location,
          title: "PT Fortuna Sada Nioga"
        });
        
        setMapLoaded(true);
      } catch (error) {
        console.error("Error initializing map:", error);
        setMapError(true);
      }
    };
    
    initMap();
  }, [apiKey, mapId, location, mapLoaded]);

  // Current language content
  const t = content[language];

  return (
    <div className="relative z-10 rounded-sm bg-white p-8 shadow-three dark:bg-gray-dark sm:p-11 lg:p-8 xl:p-11 overflow-hidden">
      <h3 className="mb-4 text-2xl font-bold leading-tight text-black dark:text-white">
        {t.companyName}
      </h3>
      
      {/* SVG icons for contact details */}
      <div className="mb-8 text-base leading-relaxed text-body-color dark:text-body-color-dark">
        <div className="mb-4 flex items-start">
          <svg 
            className="mr-3 mt-1 flex-shrink-0" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill={theme === 'dark' ? "#ffffff" : "#000000"}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" 
            />
          </svg>
          <p>
            <strong>{t.officeLabel}</strong><br />
            GKM Green Tower Lt. 20<br />
            JI. TB Simatupang Kav. 89G<br />
            Jakarta Selatan 12520
          </p>
        </div>
        
        <div className="mb-4 flex items-center">
          <svg 
            className="mr-3 flex-shrink-0" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill={theme === 'dark' ? "#ffffff" : "#000000"}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M6.62 10.79C8.06 13.62 10.38 15.94 13.21 17.38L15.41 15.18C15.69 14.9 16.08 14.82 16.43 14.93C17.55 15.3 18.75 15.5 20 15.5C20.55 15.5 21 15.95 21 16.5V20C21 20.55 20.55 21 20 21C10.61 21 3 13.39 3 4C3 3.45 3.45 3 4 3H7.5C8.05 3 8.5 3.45 8.5 4C8.5 5.25 8.7 6.45 9.07 7.57C9.18 7.92 9.1 8.31 8.82 8.59L6.62 10.79Z" 
            />
          </svg>
          <p><strong>{t.telpLabel}</strong> 021-2960 1520</p>
        </div>
        
        <div className="mb-6 flex items-center">
          <svg 
            className="mr-3 flex-shrink-0" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill={theme === 'dark' ? "#ffffff" : "#000000"}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" 
            />
          </svg>
          <p><strong>{t.emailLabel}</strong> info@fortunasadanioga.com</p>
        </div>
      </div>
      
      {/* Map container with loading state, fallback and link to Google Maps */}
      <div className="w-full h-96 rounded-sm overflow-hidden relative">
        {mapError ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="text-center p-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t.mapError}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t.locationNote}
              </p>
            </div>
          </div>
        ) : !mapLoaded ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="text-center p-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                {t.loadingMap}
              </p>
            </div>
          </div>
        ) : null}
        <div 
          id="google-map" 
          ref={mapRef} 
          className="w-full h-full"
          style={{ display: mapError ? 'none' : 'block' }}
        ></div>
        
        {/* Link to open Google Maps in a new tab */}
        <a 
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 right-13 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md shadow-md transition-colors duration-200 flex items-center"
        >
          <svg className="mr-2" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 19H5V5H12V3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V12H19V19ZM14 3V5H17.59L7.76 14.83L9.17 16.24L19 6.41V10H21V3H14Z" />
          </svg>
          {t.openInGoogleMaps}
        </a>
      </div>
    </div>
  );
};

export default ContactInfo;