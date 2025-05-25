// app/download/[token]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Download, Lock, AlertTriangle, CheckCircle } from 'lucide-react';

interface OrderInfo {
  id: string;
  name: string;
  service_name: string;
  language: string;
}

export default function DownloadPage() {
  const params = useParams();
  const token = params?.token as string;
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [validatingToken, setValidatingToken] = useState(true);

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
      errors: {
        invalidToken: "Invalid or expired download link",
        invalidPassword: "Invalid password. Please check your email for the correct password.",
        networkError: "Network error. Please try again.",
        expired: "Download link has expired",
        notFound: "Document not found"
      },
      instructions: {
        title: "How to download:",
        step1: "Enter the download password from your email",
        step2: "Click the Download button",
        step3: "Your document will download automatically"
      },
      security: {
        title: "Security Notice",
        message: "This is a secure download link. Your document is protected with a unique password sent to your email."
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
      errors: {
        invalidToken: "Tautan download tidak valid atau telah kedaluwarsa",
        invalidPassword: "Password salah. Silakan periksa email Anda untuk password yang benar.",
        networkError: "Kesalahan jaringan. Silakan coba lagi.",
        expired: "Tautan download telah kedaluwarsa",
        notFound: "Dokumen tidak ditemukan"
      },
      instructions: {
        title: "Cara mengunduh:",
        step1: "Masukkan password download dari email Anda",
        step2: "Klik tombol Unduh",
        step3: "Dokumen Anda akan terunduh secara otomatis"
      },
      security: {
        title: "Pemberitahuan Keamanan",
        message: "Ini adalah tautan download yang aman. Dokumen Anda dilindungi dengan password unik yang dikirim ke email Anda."
      }
    }
  };

  // Determine language based on order info, default to Indonesian
  const lang = orderInfo?.language === 'en' ? 'en' : 'id';
  const t = content[lang];

  // Validate token on component mount
  useEffect(() => {
    if (!token) return;

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

        if (data.success) {
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
  }, [token, t.errors.invalidToken, t.errors.networkError]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setPassword(value);
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError(t.errors.invalidPassword);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/download-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: password.trim()
        }),
      });

      if (response.ok) {
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
      } else {
        const errorData = await response.json();
        setError(errorData.message || t.errors.invalidPassword);
      }
    } catch (err) {
      setError(t.errors.networkError);
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(prev => !prev);
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-300">Validating download link...</p>
        </motion.div>
      </div>
    );
  }

  if (error && !orderInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
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
            onClick={() => window.close()}
            className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
          >
            Close
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-lg w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3">
              <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {t.subtitle}
          </p>
        </div>

        {/* Order Information */}
        {orderInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 mb-6"
          >
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
              {orderInfo.service_name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {lang === 'en' ? 'For:' : 'Untuk:'} {orderInfo.name}
            </p>
          </motion.div>
        )}

        {/* Download Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.passwordLabel}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={handlePasswordChange}
                placeholder={t.passwordPlaceholder}
                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-center tracking-wider"
                required
                maxLength={9}
                disabled={loading}
              />
              <button
                type="button"
                onClick={toggleShowPassword}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-start"
            >
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          {/* Download Button */}
          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div>
                <span>{t.downloading}</span>
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
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
          className="mt-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
        >
          <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
            {t.instructions.title}
          </h4>
          <ol className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
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
          className="mt-6 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
        >
          <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2 flex items-center">
            <Lock className="h-4 w-4 mr-2" />
            {t.security.title}
          </h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            {t.security.message}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}