// src/components/forgot-password/index.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Shield, AlertTriangle, CheckCircle, Clock, Eye, EyeOff, Info } from 'lucide-react';
import { SecurityValidator } from '@/lib/enhanced-security';

interface RateLimitInfo {
  blocked: boolean;
  remaining: number;
  resetTime: number;
  nextRequestDelay?: number;
}

// Enhanced password strength indicator with better feedback
const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  if (!password) return null;
  
  const validation = SecurityValidator.validatePassword(password);
  
  const getStrengthColor = (score: number) => {
    if (score < 3) return 'bg-red-500';
    if (score < 5) return 'bg-orange-500';
    if (score < 7) return 'bg-yellow-500';
    if (score < 9) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = (score: number) => {
    if (score < 3) return 'Sangat Lemah';
    if (score < 5) return 'Lemah';
    if (score < 7) return 'Sedang';
    if (score < 9) return 'Kuat';
    return 'Sangat Kuat';
  };

  const getStrengthBgColor = (score: number) => {
    if (score < 3) return 'bg-red-50 border-red-200';
    if (score < 5) return 'bg-orange-50 border-orange-200';
    if (score < 7) return 'bg-yellow-50 border-yellow-200';
    if (score < 9) return 'bg-blue-50 border-blue-200';
    return 'bg-green-50 border-green-200';
  };

  return (
    <div className={`mt-3 p-3 rounded-lg border ${getStrengthBgColor(validation.score)}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Kekuatan Password:</span>
        <span className={`text-sm font-bold ${
          validation.score < 7 ? 'text-red-600' : 'text-green-600'
        }`}>
          {getStrengthText(validation.score)} ({validation.score}/10)
        </span>
      </div>
      
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
        <div 
          className={`h-full transition-all duration-500 ease-out ${getStrengthColor(validation.score)}`}
          style={{ width: `${(validation.score / 10) * 100}%` }}
        />
      </div>
      
      {/* Requirements checklist */}
      <div className="space-y-1">
        <div className="grid grid-cols-1 gap-1 text-xs">
          <div className={`flex items-center ${validation.requirements.length ? 'text-green-600' : 'text-gray-400'}`}>
            <span className="mr-2 font-mono">{validation.requirements.length ? '✓' : '○'}</span>
            Minimal 8 karakter
          </div>
          <div className={`flex items-center ${validation.requirements.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
            <span className="mr-2 font-mono">{validation.requirements.uppercase ? '✓' : '○'}</span>
            Huruf besar (A-Z)
          </div>
          <div className={`flex items-center ${validation.requirements.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
            <span className="mr-2 font-mono">{validation.requirements.lowercase ? '✓' : '○'}</span>
            Huruf kecil (a-z)
          </div>
          <div className={`flex items-center ${validation.requirements.numbers ? 'text-green-600' : 'text-gray-400'}`}>
            <span className="mr-2 font-mono">{validation.requirements.numbers ? '✓' : '○'}</span>
            Angka (0-9)
          </div>
          <div className={`flex items-center ${validation.requirements.symbols ? 'text-green-600' : 'text-gray-400'}`}>
            <span className="mr-2 font-mono">{validation.requirements.symbols ? '✓' : '○'}</span>
            Simbol (!@#$%^&*)
          </div>
          <div className={`flex items-center ${validation.requirements.noCommon ? 'text-green-600' : 'text-gray-400'}`}>
            <span className="mr-2 font-mono">{validation.requirements.noCommon ? '✓' : '○'}</span>
            Tidak umum/mudah ditebak
          </div>
        </div>
      </div>
      
      {/* Show specific feedback if password is weak */}
      {validation.feedback.length > 0 && validation.score < 8 && (
        <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
          <div className="font-medium text-yellow-800 mb-1">Tips untuk memperkuat password:</div>
          <ul className="list-disc list-inside text-yellow-700 space-y-0.5">
            {validation.feedback.slice(0, 3).map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default function EnhancedForgotPassword() {
  // Step management
  const [currentStep, setCurrentStep] = useState<'request' | 'verify' | 'reset' | 'success'>('request');
  
  // Form states
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  // Security states
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const [clientFingerprint, setClientFingerprint] = useState('');
  const [passwordValidation, setPasswordValidation] = useState<any>(null);
  
  const emailRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<HTMLInputElement>(null);

  // Generate client fingerprint
  useEffect(() => {
    const generateFingerprint = () => {
      const data = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset()
      ].join('|');
      
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      return Math.abs(hash).toString(36);
    };

    setClientFingerprint(generateFingerprint());
  }, []);

  // Update password validation in real-time
  useEffect(() => {
    if (newPassword) {
      const validation = SecurityValidator.validatePassword(newPassword);
      setPasswordValidation(validation);
    } else {
      setPasswordValidation(null);
    }
  }, [newPassword]);

  // Handle countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Focus management
  useEffect(() => {
    if (currentStep === 'request' && emailRef.current) {
      emailRef.current.focus();
    } else if (currentStep === 'verify' && tokenRef.current) {
      tokenRef.current.focus();
    }
  }, [currentStep]);

  // Enhanced input validation with better error messages
  const validateInput = (value: string, type: 'email' | 'token' | 'password') => {
    const validation = SecurityValidator.validateAndSanitize(value, {
      maxLength: type === 'email' ? 254 : type === 'token' ? 100 : 200,
      checkSQLInjection: true,
      checkXSS: true,
      checkPathTraversal: true
    });

    if (!validation.isValid) {
      const message = validation.violations.includes('Potential SQL injection detected') ? 
        'Input mengandung karakter yang tidak diizinkan' :
        validation.violations.includes('Potential XSS attack detected') ? 
        'Input mengandung script yang tidak diizinkan' :
        `Input tidak valid: ${validation.violations.join(', ')}`;
      
      setError(message);
      return { isValid: false, sanitized: validation.sanitized };
    }

    return { isValid: true, sanitized: validation.sanitized };
  };

  // Request password reset
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (countdown > 0) {
      setError(`Tunggu ${countdown} detik sebelum mengirim permintaan lagi.`);
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      // Validate email
      const emailValidation = validateInput(email, 'email');
      if (!emailValidation.isValid) {
        setIsLoading(false);
        return;
      }

      if (!SecurityValidator.validateEmail(emailValidation.sanitized)) {
        setError('Format email tidak valid');
        setIsLoading(false);
        return;
      }

      // Make request with enhanced security headers
      const response = await fetch('/api/auth/lupapw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Fingerprint': clientFingerprint,
          'X-Request-Source': 'password-reset'
        },
        body: JSON.stringify({ 
          email: emailValidation.sanitized,
          fingerprint: clientFingerprint,
          timestamp: Date.now()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
          setCountdown(retryAfter);
          setRateLimitInfo({
            blocked: true,
            remaining: 0,
            resetTime: Date.now() + (retryAfter * 1000),
            nextRequestDelay: retryAfter
          });
          setError(`Terlalu banyak permintaan. Tunggu ${Math.ceil(retryAfter / 60)} menit.`);
        } else {
          setError(data.message || 'Terjadi kesalahan');
        }
        setIsLoading(false);
        return;
      }

      // Success - always show the same message for security
      setRequestCount(prev => prev + 1);
      setSuccessMessage('Jika email terdaftar, link reset password akan dikirim.');
      setCurrentStep('verify');
      
      // Set progressive delay for next request
      const delay = Math.min(Math.pow(2, requestCount) * 30, 300); // Max 5 minutes
      setCountdown(delay);

    } catch (err) {
      console.error('Password reset request error:', err);
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

// Verify reset token - PERBAIKAN untuk handle kode verifikasi DAN token lengkap
  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError('');
    setIsLoading(true);

    try {
      const tokenValidation = validateInput(token, 'token');
      if (!tokenValidation.isValid) {
        setIsLoading(false);
        return;
      }

      let tokenToValidate = tokenValidation.sanitized;

      // Jika input hanya 8 karakter (kode verifikasi), cari token lengkap
      if (tokenToValidate.length === 8) {
        try {
          // Cari token yang dimulai dengan kode verifikasi ini
          const response = await fetch('/api/auth/find-token-by-code', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Client-Fingerprint': clientFingerprint,
            },
            body: JSON.stringify({ 
              verificationCode: tokenToValidate.toUpperCase(),
              fingerprint: clientFingerprint 
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.token) {
              tokenToValidate = data.token;
              setSuccessMessage('Kode verifikasi ditemukan. Melanjutkan validasi token...');
            }
          }
        } catch (err) {
          console.warn('Could not find token by verification code:', err);
          // Fallback: gunakan input asli
        }
      }

      // Validasi token (lengkap atau dari kode verifikasi)
      const response = await fetch(`/api/auth/resetpw?token=${encodeURIComponent(tokenToValidate)}`, {
        method: 'GET',
        headers: {
          'X-Client-Fingerprint': clientFingerprint,
        }
      });

      const data = await response.json();

      if (!response.ok) {
        if (tokenValidation.sanitized.length === 8) {
          setError('Kode verifikasi tidak valid atau sudah kedaluwarsa. Coba masukkan token lengkap dari email.');
        } else {
          setError(data.message || 'Token tidak valid atau sudah kedaluwarsa');
        }
        setIsLoading(false);
        return;
      }

      if (data.valid) {
        // Simpan token lengkap untuk reset password
        setToken(tokenToValidate);
        setCurrentStep('reset');
        setSuccessMessage('Token valid. Silakan buat password baru.');
      } else {
        setError('Token tidak valid atau sudah kedaluwarsa');
      }

    } catch (err) {
      console.error('Token verification error:', err);
      setError('Terjadi kesalahan saat memverifikasi token.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password with improved validation
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError('');
    setIsLoading(true);

    try {
      // Validate passwords
      const passwordValidation = validateInput(newPassword, 'password');
      const confirmValidation = validateInput(confirmPassword, 'password');
      
      if (!passwordValidation.isValid || !confirmValidation.isValid) {
        setIsLoading(false);
        return;
      }

      // Check password match first
      if (passwordValidation.sanitized !== confirmValidation.sanitized) {
        setError('Password dan konfirmasi password tidak cocok');
        setIsLoading(false);
        return;
      }

// Check password strength with detailed feedback
      const strengthCheck = SecurityValidator.validatePassword(passwordValidation.sanitized);
      console.log('Password strength check:', strengthCheck); // Debug log
      
      if (!strengthCheck.isValid) {
        const missingRequirements: string[] = []; // Explicitly declare as string array
        if (!strengthCheck.requirements.length) missingRequirements.push('minimal 8 karakter');
        if (!strengthCheck.requirements.uppercase) missingRequirements.push('huruf besar');
        if (!strengthCheck.requirements.lowercase) missingRequirements.push('huruf kecil');
        if (!strengthCheck.requirements.numbers) missingRequirements.push('angka');
        if (!strengthCheck.requirements.symbols) missingRequirements.push('simbol');
        if (!strengthCheck.requirements.noCommon) missingRequirements.push('password tidak boleh umum');
        
        setError(`Password kurang kuat. Diperlukan: ${missingRequirements.join(', ')}`);
        setIsLoading(false);
        return;
      }
      const response = await fetch('/api/auth/resetpw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Fingerprint': clientFingerprint,
        },
        body: JSON.stringify({
          token: token,
          password: passwordValidation.sanitized,
          fingerprint: clientFingerprint,
          timestamp: Date.now()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError('Terlalu banyak percobaan reset password. Tunggu beberapa menit.');
        } else {
          setError(data.message || 'Gagal mereset password');
        }
        setIsLoading(false);
        return;
      }

      setCurrentStep('success');
      setSuccessMessage('Password berhasil direset. Anda akan dialihkan ke halaman login.');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        window.location.href = '/wall-e?reason=password_reset_success';
      }, 3000);

    } catch (err) {
      console.error('Password reset error:', err);
      setError('Terjadi kesalahan saat mereset password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format countdown display
  const formatCountdown = (seconds: number) => {
    if (seconds < 60) return `${seconds} detik`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Check if password is strong enough to submit
  const isPasswordStrongEnough = () => {
    if (!newPassword || !passwordValidation) return false;
    return passwordValidation.isValid && passwordValidation.score >= 8;
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        {/* Header */}
        <div className="text-center">
          <Mail className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentStep === 'request' && 'Lupa Password'}
            {currentStep === 'verify' && 'Verifikasi Token'}
            {currentStep === 'reset' && 'Reset Password'}
            {currentStep === 'success' && 'Berhasil'}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {currentStep === 'request' && 'Masukkan email Anda untuk menerima link reset password'}
            {currentStep === 'verify' && 'Masukkan token yang dikirim ke email Anda'}
            {currentStep === 'reset' && 'Buat password baru yang kuat dan aman'}
            {currentStep === 'success' && 'Password Anda berhasil direset'}
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span>{error}</span>
                
                {/* Countdown Display */}
                {countdown > 0 && (
                  <div className="mt-2 text-sm">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>Tunggu: {formatCountdown(countdown)}</span>
                    </div>
                    <div className="w-full bg-red-200 dark:bg-red-800 rounded-full h-2 mt-1">
                      <div 
                        className="bg-red-600 dark:bg-red-500 h-2 rounded-full transition-all duration-1000" 
                        style={{ 
                          width: `${rateLimitInfo?.nextRequestDelay ? 
                            ((rateLimitInfo.nextRequestDelay - countdown) / rateLimitInfo.nextRequestDelay) * 100 : 
                            0}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Request Reset Form */}
        {currentStep === 'request' && (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                ref={emailRef}
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  const validation = validateInput(e.target.value, 'email');
                  setEmail(validation.sanitized);
                  if (error) setError(''); // Clear error on input change
                }}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isLoading || countdown > 0}
                autoComplete="email"
                maxLength={254}
                placeholder="masukkan@email.anda"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || countdown > 0 || !email.trim()}
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-blue-400 dark:disabled:bg-blue-500/50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Mengirim...
                </>
              ) : countdown > 0 ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Tunggu {formatCountdown(countdown)}
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Kirim Link Reset
                </>
              )}
            </button>
          </form>
        )}

{/* Token Verification Form - IMPROVED */}
        {currentStep === 'verify' && (
          <form onSubmit={handleVerifyToken} className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Token Reset Password atau Kode Verifikasi
              </label>
              <input
                ref={tokenRef}
                id="token"
                type="text"
                value={token}
                onChange={(e) => {
                  const validation = validateInput(e.target.value, 'token');
                  setToken(validation.sanitized);
                  if (error) setError('');
                }}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isLoading}
                maxLength={100}
                placeholder="Masukkan kode 8 digit atau token lengkap"
              />
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>• <strong>Kode Verifikasi:</strong> 8 karakter (contoh: ABC12345)</p>
                <p>• <strong>Token Lengkap:</strong> String panjang dari link email</p>
                <p className="text-blue-600 dark:text-blue-400">
                  💡 Anda bisa menggunakan salah satu dari keduanya
                </p>
              </div>
              
              {/* Visual indicator based on input length */}
              {token && (
                <div className="mt-2 text-xs">
                  {token.length === 8 ? (
                    <span className="text-green-600 dark:text-green-400">
                      ✓ Format kode verifikasi (8 karakter)
                    </span>
                  ) : token.length > 20 ? (
                    <span className="text-green-600 dark:text-green-400">
                      ✓ Format token lengkap
                    </span>
                  ) : (
                    <span className="text-gray-500">
                      Masukkan kode 8 digit atau token lengkap
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setCurrentStep('request');
                  setError('');
                  setSuccessMessage('');
                }}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={isLoading || !token.trim()}
                className="flex-1 flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Memverifikasi...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Verifikasi Token
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Reset Password Form */}
        {currentStep === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password Baru
              </label>
              <div className="relative mt-1">
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    const validation = validateInput(e.target.value, 'password');
                    setNewPassword(validation.sanitized);
                    if (error) setError('');
                  }}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  minLength={8} //panjang password
                  maxLength={200}
                  disabled={isLoading}
                  placeholder="Masukkan password baru"
                />
                <button 
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              
              {/* Password strength indicator */}
              <PasswordStrengthIndicator password={newPassword} />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Konfirmasi Password
              </label>
              <div className="relative mt-1">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    const validation = validateInput(e.target.value, 'password');
                    setConfirmPassword(validation.sanitized);
                    if (error) setError('');
                  }}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  minLength={8} //panjang password
                  maxLength={200}
                  disabled={isLoading}
                  placeholder="Ulangi password baru"
                />
                <button 
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Password tidak cocok
                </p>
              )}
            </div>

            {/* Submit button with enhanced validation */}
            <button
              type="submit"
              disabled={
                isLoading || 
                !newPassword.trim() || 
                !confirmPassword.trim() || 
                newPassword !== confirmPassword ||
                !isPasswordStrongEnough()
              }
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Mereset...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Reset Password
                </>
              )}
            </button>

            {/* Password strength info */}
            {!isPasswordStrongEnough() && newPassword && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Password belum cukup kuat</p>
                    <p>Pastikan semua kriteria terpenuhi sebelum melanjutkan.</p>
                  </div>
                </div>
              </div>
            )}
          </form>
        )}

        {/* Success State */}
        {currentStep === 'success' && (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <p className="text-gray-600 dark:text-gray-400">
              Anda akan dialihkan ke halaman login dalam beberapa detik...
            </p>
            <Link 
              href="/wall-e"
              className="inline-flex items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali ke Login
            </Link>
          </div>
        )}

        {/* Back to Login Link (for request and verify steps) */}
        {(currentStep === 'request' || currentStep === 'verify') && (
          <div className="text-center">
            <Link 
              href="/wall-e" 
              className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Kembali ke Login
            </Link>
          </div>
        )}

        {/* Security Notice */}
        {currentStep !== 'success' && (
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>🔒 Reset password dilindungi dengan enkripsi</p>
            <p>Link reset berlaku selama 1 jam</p>
            {requestCount > 0 && (
              <p>Permintaan ke-{requestCount + 1} • Max 5 per jam</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}