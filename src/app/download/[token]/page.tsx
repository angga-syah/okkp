// app/download/[token]/page.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Download, Lock, AlertTriangle, CheckCircle, Shield, Clock, RefreshCw } from 'lucide-react';

interface OrderInfo {
  id: string;
  name: string;
  service_name: string;
  language: string;
}

interface SecurityState {
  attempts: number;
  maxAttempts: number;
  lockoutEnd?: Date;
  nextAttemptDelay?: number;
}

export default function DownloadPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [validatingToken, setValidatingToken] = useState(true);
  const [securityState, setSecurityState] = useState<SecurityState>({
    attempts: 0,
    maxAttempts: 5
  });
  const [countdown, setCountdown] = useState<number>(0);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  // Language content
  const content = {
    en: {
      title: "Download Your Document",
      subtitle: "Enter your download password to access your document",
      passwordLabel: "Download Password",
      passwordPlaceholder: "Enter your download password (e.g., ABCD-1234)",
      downloadButton: "Download Document",
      downloading: "Downloading...",
      validatingToken: "Validating download link...",
      retryIn: "Retry in",
      seconds: "seconds",
      errors: {
        invalidToken: "Invalid or expired download link",
        invalidPassword: "Invalid password. Please check your email for the correct password.",
        networkError: "Network error. Please try again.",
        expired: "Download link has expired",
        notFound: "Document not found",
        rateLimited: "Too many attempts. Please wait before trying again.",
        serverError: "Server error. Please try again later.",
        securityViolation: "Security violation detected. Access denied."
      },
      instructions: {
        title: "How to download:",
        step1: "Enter the download password from your email",
        step2: "Click the Download button",
        step3: "Your document will download automatically"
      },
      security: {
        title: "Security Notice",
        message: "This is a secure download link. Your document is protected with a unique password sent to your email.",
        attemptsRemaining: "Attempts remaining:",
        lockedOut: "Access temporarily locked due to security."
      }
    },
    id: {
      title: "Unduh Dokumen Anda",
      subtitle: "Masukkan password download untuk mengakses dokumen Anda",
      passwordLabel: "Password Download",
      passwordPlaceholder: "Masukkan password download Anda (contoh: ABCD-1234)",
      downloadButton: "Unduh Dokumen",
      downloading: "Mengunduh...",
      validatingToken: "Memvalidasi tautan download...",
      retryIn: "Coba lagi dalam",
      seconds: "detik",
      errors: {
        invalidToken: "Tautan download tidak valid atau telah kedaluwarsa",
        invalidPassword: "Password salah. Silakan periksa email Anda untuk password yang benar.",
        networkError: "Kesalahan jaringan. Silakan coba lagi.",
        expired: "Tautan download telah kedaluwarsa",
        notFound: "Dokumen tidak ditemukan",
        rateLimited: "Terlalu banyak percobaan. Harap tunggu sebelum mencoba lagi.",
        serverError: "Kesalahan server. Silakan coba lagi nanti.",
        securityViolation: "Pelanggaran keamanan terdeteksi. Akses ditolak."
      },
      instructions: {
        title: "Cara mengunduh:",
        step1: "Masukkan password download dari email Anda",
        step2: "Klik tombol Unduh",
        step3: "Dokumen Anda akan terunduh secara otomatis"
      },
      security: {
        title: "Pemberitahuan Keamanan",
        message: "Ini adalah tautan download yang aman. Dokumen Anda dilindungi dengan password unik yang dikirim ke email Anda.",
        attemptsRemaining: "Percobaan tersisa:",
        lockedOut: "Akses dikunci sementara karena keamanan."
      }
    }
  };

  // Determine language based on order info, default to Indonesian
  const lang = orderInfo?.language === 'en' ? 'en' : 'id';
  const t = content[lang];

  // Input sanitization function
  const sanitizeInput = (input: string): string => {
    return input
      .replace(/[<>\"']/g, '') // Remove potential XSS characters
      .replace(/[^\w\s\-]/g, '') // Only allow alphanumeric, spaces, and hyphens
      .toUpperCase()
      .substring(0, 10); // Limit length
  };

  // Countdown effect for retry delay
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Security lockout effect
  useEffect(() => {
    if (securityState.lockoutEnd) {
      const now = new Date();
      const timeLeft = Math.ceil((securityState.lockoutEnd.getTime() - now.getTime()) / 1000);
      
      if (timeLeft > 0) {
        setCountdown(timeLeft);
        const timer = setTimeout(() => {
          setSecurityState(prev => ({
            ...prev,
            lockoutEnd: undefined
          }));
          setError('');
        }, timeLeft * 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [securityState.lockoutEnd]);

  // Validate token on component mount
  useEffect(() => {
    if (!token) {
      setError(t.errors.invalidToken);
      setValidatingToken(false);
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch('/api/validate-download-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.status === 429) {
          setError(data.message || t.errors.rateLimited);
          if (data.lockoutDuration) {
            setSecurityState(prev => ({
              ...prev,
              lockoutEnd: new Date(Date.now() + data.lockoutDuration * 1000)
            }));
          }
        } else if (data.success) {
          setOrderInfo(data.orderInfo);
        } else {
          setError(data.message || t.errors.invalidToken);
        }
      } catch (err) {
        setError(t.errors.networkError);
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token, t.errors.invalidToken, t.errors.networkError, t.errors.rateLimited]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = sanitizeInput(e.target.value);
    setPassword(value);
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if locked out
    if (securityState.lockoutEnd && new Date() < securityState.lockoutEnd) {
      setError(t.security.lockedOut);
      return;
    }

    // Check if in delay period
    if (countdown > 0) {
      return;
    }
    
    const cleanPassword = password.trim();
    if (!cleanPassword) {
      setError(t.errors.invalidPassword);
      return;
    }

    // Basic client-side password format validation
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanPassword)) {
      setError(t.errors.invalidPassword);
      setSecurityState(prev => ({
        ...prev,
        attempts: prev.attempts + 1
      }));
      return;
    }

    setLoading(true);
    setError('');
    setDownloadProgress(0);

    try {
      const response = await fetch('/api/download-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: cleanPassword
        }),
      });

      if (response.status === 429) {
        const errorData = await response.json();
        setError(errorData.message || t.errors.rateLimited);
        
        if (errorData.lockoutDuration) {
          setSecurityState(prev => ({
            ...prev,
            lockoutEnd: new Date(Date.now() + errorData.lockoutDuration * 1000)
          }));
        } else if (errorData.retryAfter) {
          setCountdown(errorData.retryAfter);
        }
        
        return;
      }

      if (response.ok) {
        // Simulate download progress
        const progressInterval = setInterval(() => {
          setDownloadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 100);

        // Handle file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // Get filename from response headers or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'document.pdf';
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          if (match) {
            filename = match[1];
          }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setDownloadProgress(100);
        clearInterval(progressInterval);
        
        // Reset security state on success
        setSecurityState(prev => ({
          ...prev,
          attempts: 0
        }));

        // Show success message briefly
        setTimeout(() => {
          setDownloadProgress(0);
        }, 2000);

      } else {
        const errorData = await response.json();
        setError(errorData.message || t.errors.invalidPassword);
        
        // Update security state
        setSecurityState(prev => {
          const newAttempts = prev.attempts + 1;
          const newState = { ...prev, attempts: newAttempts };
          
          // Lock out after max attempts
          if (newAttempts >= prev.maxAttempts) {
            newState.lockoutEnd = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
          }
          
          return newState;
        });
      }
    } catch (err) {
      setError(t.errors.networkError);
      setSecurityState(prev => ({
        ...prev,
        attempts: prev.attempts + 1
      }));
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(prev => !prev);
  };

  const getPasswordInputType = () => {
    return showPassword ? "text" : "password";
  };

  const getRemainingAttempts = () => {
    return Math.max(0, securityState.maxAttempts - securityState.attempts);
  };

  const isLocked = securityState.lockoutEnd && new Date() < securityState.lockoutEnd;

  if (validatingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-300">{t.validatingToken}</p>
        </motion.div>
      </div>
    );
  }

  if (error && !orderInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
          >
            Go Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-4 sm:pt-8 md:pt-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 max-w-lg w-full"
      >
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3">
              <Lock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t.title}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            {t.subtitle}
          </p>
        </div>

        {/* Security Status */}
        {securityState.attempts > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4 mb-4"
          >
            <div className="flex items-center">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
              <span className="text-sm text-yellow-700 dark:text-yellow-400">
                {t.security.attemptsRemaining} {getRemainingAttempts()}
              </span>
            </div>
          </motion.div>
        )}

        {/* Lockout Status */}
        {isLocked && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4 mb-4"
          >
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400 mr-2" />
              <span className="text-sm text-red-700 dark:text-red-400">
                {t.security.lockedOut}
              </span>
            </div>
            {countdown > 0 && (
              <div className="mt-2 flex items-center text-sm text-red-600 dark:text-red-400">
                <Clock className="h-4 w-4 mr-1" />
                {t.retryIn} {countdown} {t.seconds}
              </div>
            )}
          </motion.div>
        )}

        {/* Order Information */}
        {orderInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6"
          >
            <h3 className="font-medium text-gray-900 dark:text-white mb-1 text-sm sm:text-base">
              {orderInfo.service_name}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {lang === 'en' ? 'For:' : 'Untuk:'} {orderInfo.name}
            </p>
          </motion.div>
        )}

        {/* Download Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.passwordLabel}
            </label>
            <div className="relative">
              <input
                id="password"
                type={getPasswordInputType()}
                value={password}
                onChange={handlePasswordChange}
                placeholder={t.passwordPlaceholder}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-center tracking-wider text-sm sm:text-base"
                required
                maxLength={9}
                disabled={loading || isLocked}
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="button"
                onClick={toggleShowPassword}
                className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center"
                disabled={loading || isLocked}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 sm:px-4 py-2 sm:py-3 rounded-lg flex items-start"
            >
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-xs sm:text-sm">{error}</span>
            </motion.div>
          )}

          {/* Download Progress */}
          {downloadProgress > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-green-700 dark:text-green-400">
                  {downloadProgress === 100 ? 'Download Complete!' : 'Downloading...'}
                </span>
                <span className="text-sm text-green-700 dark:text-green-400">
                  {downloadProgress}%
                </span>
              </div>
              <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2">
                <div 
                  className="bg-green-600 dark:bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                ></div>
              </div>
            </motion.div>
          )}

          {/* Download Button */}
          <button
            type="submit"
            disabled={loading || !password.trim() || isLocked || countdown > 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 sm:py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border-2 border-white rounded-full border-t-transparent"></div>
                <span>{t.downloading}</span>
              </>
            ) : countdown > 0 ? (
              <>
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>{countdown} {t.seconds}</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>{t.downloadButton}</span>
              </>
            )}
          </button>
        </form>

        {/* Instructions */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 sm:mt-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4"
        >
          <h4 className="font-medium text-gray-900 dark:text-white mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-green-500" />
            {t.instructions.title}
          </h4>
          <ol className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <li>1. {t.instructions.step1}</li>
            <li>2. {t.instructions.step2}</li>
            <li>3. {t.instructions.step3}</li>
          </ol>
        </motion.div>

        {/* Security Notice */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 sm:mt-6 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4"
        >
          <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2 flex items-center text-sm sm:text-base">
            <Lock className="h-4 w-4 mr-2" />
            {t.security.title}
          </h4>
          <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-400">
            {t.security.message}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}