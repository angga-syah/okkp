"use client";

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/components/Header/Bahasa';

interface TimeValidatorProps {
  children: React.ReactNode;
  maxTimeDifference?: number; // in minutes, default 2880 minutes (2 days)
}

interface TimeValidationState {
  isValid: boolean;
  timeDifference: number;
  timeDifferenceHours?: number;
  timeDifferenceDays?: number;
  serverTime: Date | null;
  clientTime: Date;
  error: string | null;
}

const TimeValidator: React.FC<TimeValidatorProps> = ({ 
  children, 
  maxTimeDifference = 2880 // Default 2 days (2880 minutes)
}) => {
  const { language } = useLanguage();
  const [validationState, setValidationState] = useState<TimeValidationState>({
    isValid: true, // Start as valid to show content immediately
    timeDifference: 0,
    serverTime: null,
    clientTime: new Date(),
    error: null
  });

  const translations = {
    id: {
      timeError: "Waktu Sistem Tidak Sinkron",
      timeErrorDesc: "Waktu pada perangkat Anda berbeda lebih dari 2 hari dengan server. Silakan sinkronkan waktu perangkat Anda dan muat ulang halaman.",
      timeDifference: "Selisih waktu",
      minutes: "menit",
      hours: "jam", 
      days: "hari",
      serverTime: "Waktu Server",
      clientTime: "Waktu Perangkat",
      reloadPage: "Muat Ulang Halaman",
      syncTime: "Sinkronkan Waktu",
      networkError: "Gagal memvalidasi waktu. Periksa koneksi internet Anda.",
      continueAnyway: "Lanjutkan Tetap"
    },
    en: {
      timeError: "System Time Not Synchronized",
      timeErrorDesc: "Your device time is more than 2 days different from the server. Please sync your device time and reload the page.",
      timeDifference: "Time difference",
      minutes: "minutes",
      hours: "hours",
      days: "days", 
      serverTime: "Server Time",
      clientTime: "Device Time",
      reloadPage: "Reload Page",
      syncTime: "Sync Time",
      networkError: "Failed to validate time. Please check your internet connection.",
      continueAnyway: "Continue Anyway"
    }
  };

  const t = translations[language];

  const validateTime = async () => {
    try {
      const clientTime = new Date();
      
      // Call your server time endpoint
      const response = await fetch('/api/server-time', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch server time');
      }

      const data = await response.json();
      const serverTime = new Date(data.timestamp);
      
      // Calculate time difference in minutes
      const timeDifferenceMs = Math.abs(clientTime.getTime() - serverTime.getTime());
      const timeDifferenceMinutes = Math.floor(timeDifferenceMs / (1000 * 60));
      const timeDifferenceHours = Math.floor(timeDifferenceMinutes / 60);
      const timeDifferenceDays = Math.floor(timeDifferenceHours / 24);
      
      const isValid = timeDifferenceMinutes <= maxTimeDifference;

      setValidationState({
        isValid,
        timeDifference: timeDifferenceMinutes,
        timeDifferenceHours,
        timeDifferenceDays,
        serverTime,
        clientTime,
        error: null
      });

    } catch (error) {
      setValidationState(prev => ({
        ...prev,
        error: t.networkError
      }));
    }
  };

  const handleContinueAnyway = () => {
    // Store bypass flag in session storage (temporary)
    sessionStorage.setItem('timeValidationBypass', 'true');
    setValidationState(prev => ({ ...prev, isValid: true }));
  };

  // Check for bypass flag on component mount
  useEffect(() => {
    const bypass = sessionStorage.getItem('timeValidationBypass');
    if (bypass === 'true') {
      setValidationState(prev => ({ ...prev, isValid: true }));
      return;
    }
    
    // Validate time in background without blocking UI
    validateTime();
    
    // Re-validate every 30 minutes (less frequent for 2-day threshold)
    const interval = setInterval(validateTime, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [language]);

  const handleReload = () => {
    window.location.reload();
  };

  const handleSyncTime = () => {
    // Open system time settings (works on Windows)
    if (navigator.userAgent.includes('Windows')) {
      window.open('ms-settings:dateandtime', '_blank');
    } else {
      // For other OS, show generic instructions
      alert(language === 'id' 
        ? 'Silakan buka pengaturan sistem untuk menyinkronkan waktu.'
        : 'Please open system settings to synchronize time.'
      );
    }
  };

  // Only show error modal if validation fails
  if (!validationState.isValid || validationState.error) {
    return (
      <>
        {children}
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t.timeError}
                </h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {validationState.error || t.timeErrorDesc}
              </p>
              
              {!validationState.error && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t.timeDifference}:</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {validationState.timeDifferenceDays && validationState.timeDifferenceDays > 0 
                        ? `${validationState.timeDifferenceDays} ${t.days} ${validationState.timeDifferenceHours! % 24} ${t.hours}`
                        : validationState.timeDifferenceHours && validationState.timeDifferenceHours > 0
                        ? `${validationState.timeDifferenceHours} ${t.hours} ${validationState.timeDifference % 60} ${t.minutes}`
                        : `${validationState.timeDifference} ${t.minutes}`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t.serverTime}:</span>
                    <span className="font-mono text-gray-900 dark:text-white">
                      {validationState.serverTime?.toLocaleString(language === 'id' ? 'id-ID' : 'en-US')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t.clientTime}:</span>
                    <span className="font-mono text-gray-900 dark:text-white">
                      {validationState.clientTime.toLocaleString(language === 'id' ? 'id-ID' : 'en-US')}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleContinueAnyway}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
              >
                {t.continueAnyway}
              </button>
              <button
                onClick={handleReload}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
              >
                {t.reloadPage}
              </button>
              {!validationState.error && (
                <button
                  onClick={handleSyncTime}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  {t.syncTime}
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  return <>{children}</>;
};

export default TimeValidator;