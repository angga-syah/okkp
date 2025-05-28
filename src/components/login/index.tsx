// src/components/login/index.tsx
"use client";

import { useState, Suspense, useEffect, useCallback, useRef } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, AlertTriangle, CheckCircle, Shield, Clock, Lock } from 'lucide-react';
import { SecurityValidator } from '@/lib/enhanced-security';

interface SecurityAttempt {
  timestamp: number;
  success: boolean;
  identifier: string;
}

interface RateLimitInfo {
  blocked: boolean;
  remaining: number;
  resetTime: number;
  isLocked: boolean;
  lockoutDuration?: number;
  nextAttemptDelay?: number;
  progressiveDelay?: number;
}

// Honeypot component to catch bots
const HoneypotField = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <input
    type="text"
    name="website"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      position: 'absolute',
      left: '-9999px',
      width: '1px',
      height: '1px',
      opacity: 0,
      pointerEvents: 'none'
    }}
    tabIndex={-1}
    autoComplete="off"
  />
);

// Enhanced password strength indicator
const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const validation = SecurityValidator.validatePassword(password);
  
  const getStrengthColor = (score: number) => {
    if (score < 3) return 'bg-red-500';
    if (score < 6) return 'bg-yellow-500';
    if (score < 8) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = (score: number) => {
    if (score < 3) return 'Sangat Lemah';
    if (score < 6) return 'Lemah';
    if (score < 8) return 'Sedang';
    return 'Kuat';
  };

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600 dark:text-gray-400">Kekuatan Password:</span>
        <span className={`text-xs font-medium ${
          validation.score < 6 ? 'text-red-600' : 'text-green-600'
        }`}>
          {getStrengthText(validation.score)}
        </span>
      </div>
      
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${getStrengthColor(validation.score)}`}
          style={{ width: `${(validation.score / 10) * 100}%` }}
        />
      </div>
      
      {validation.feedback.length > 0 && (
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <ul className="list-disc list-inside space-y-1">
            {validation.feedback.slice(0, 3).map((feedback, index) => (
              <li key={index}>{feedback}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Enhanced CAPTCHA-like verification
const SecurityChallenge = ({ onComplete }: { onComplete: (success: boolean) => void }) => {
  const [challenge, setChallenge] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');
  const [userAnswer, setUserAnswer] = useState<string>('');

  useEffect(() => {
    generateChallenge();
  }, []);

  const generateChallenge = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operation = Math.random() > 0.5 ? '+' : '-';
    
    if (operation === '+') {
      setChallenge(`${num1} + ${num2}`);
      setAnswer((num1 + num2).toString());
    } else {
      // Ensure no negative results
      const larger = Math.max(num1, num2);
      const smaller = Math.min(num1, num2);
      setChallenge(`${larger} - ${smaller}`);
      setAnswer((larger - smaller).toString());
    }
    
    setUserAnswer('');
  };

  const handleAnswerChange = (value: string) => {
    const validation = SecurityValidator.validateAndSanitize(value, {
      maxLength: 3,
      checkSQLInjection: true,
      checkXSS: true
    });
    
    setUserAnswer(validation.sanitized);
    
    if (validation.sanitized === answer) {
      onComplete(true);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Verifikasi Keamanan: {challenge} = ?
      </label>
      <div className="flex space-x-2">
        <input
          type="text"
          value={userAnswer}
          onChange={(e) => handleAnswerChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
          placeholder="Jawaban"
          maxLength={3}
        />
        <button
          type="button"
          onClick={generateChallenge}
          className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title="Generate new challenge"
        >
          🔄
        </button>
      </div>
    </div>
  );
};

function EnhancedLoginForm() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [securityChallengeComplete, setSecurityChallengeComplete] = useState(false);
  const [showSecurityChallenge, setShowSecurityChallenge] = useState(false);
  
  // Enhanced rate limiting state
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  
  // Security tracking
  const [clientFingerprint, setClientFingerprint] = useState('');
  const [sessionAttempts, setSessionAttempts] = useState<SecurityAttempt[]>([]);
  
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/wali';
  const reason = searchParams?.get('reason');
  const { status } = useSession();
  
  const formRef = useRef<HTMLFormElement>(null);
  const identifierRef = useRef<HTMLInputElement>(null);

  // Generate client fingerprint for tracking
  useEffect(() => {
    const generateFingerprint = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Security fingerprint', 2, 2);
      }
      
      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL()
      ].join('|');
      
      // Simple hash
      let hash = 0;
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      return Math.abs(hash).toString(36);
    };

    setClientFingerprint(generateFingerprint());
  }, []);

  // Handle countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle success/error messages from URL params
  useEffect(() => {
    // Clear any logout flags
    localStorage.removeItem('logout-in-progress');
    
    if (reason === 'manual_logout') {
      setSuccessMessage('Anda telah berhasil logout.');
      setError('');
    } else if (reason === 'error_logout') {
      setSuccessMessage('Berhasil Logout');
      setError('');
    } else if (reason === 'session_expired') {
      setError('Sesi anda telah berakhir karena tidak aktif. Silakan login kembali.');
      setSuccessMessage('');
    } else if (reason === 'security_violation') {
      setError('Akses ditolak karena aktivitas mencurigakan terdeteksi.');
      setSuccessMessage('');
    }
  }, [reason]);

  // Auto-redirect if authenticated
  useEffect(() => {
    if (status === 'authenticated' && reason !== 'session_expired') {
      window.location.href = '/wali';
    }
  }, [status, reason]);

  // Enhanced input validation
  const validateInput = useCallback((value: string, type: 'identifier' | 'password') => {
    const validation = SecurityValidator.validateAndSanitize(value, {
      maxLength: type === 'identifier' ? 100 : 200,
      checkSQLInjection: true,
      checkXSS: true,
      checkPathTraversal: true
    });

    if (!validation.isValid) {
      setError(`Input tidak valid: ${validation.violations.join(', ')}`);
      return { isValid: false, sanitized: validation.sanitized };
    }

    return { isValid: true, sanitized: validation.sanitized };
  }, []);

  // Handle form submission with enhanced security
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Security checks
    if (honeypot) {
      // Bot detected
      setError('Request tidak valid. Silakan refresh halaman dan coba lagi.');
      return;
    }

    if (countdown > 0) {
      setError(`Tunggu ${countdown} detik sebelum mencoba lagi.`);
      return;
    }

    // Show security challenge after 2 failed attempts
    if (attemptCount >= 2 && !securityChallengeComplete) {
      setShowSecurityChallenge(true);
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      // Validate inputs
      const identifierValidation = validateInput(identifier, 'identifier');
      const passwordValidation = validateInput(password, 'password');

      if (!identifierValidation.isValid || !passwordValidation.isValid) {
        setIsLoading(false);
        return;
      }

      // Additional validation for identifier
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifierValidation.sanitized);
      if (!isEmail) {
        const usernameValidation = SecurityValidator.validateUsername(identifierValidation.sanitized);
        if (!usernameValidation.isValid) {
          setError(usernameValidation.message || 'Username tidak valid');
          setIsLoading(false);
          return;
        }
      } else if (!SecurityValidator.validateEmail(identifierValidation.sanitized)) {
        setError('Format email tidak valid');
        setIsLoading(false);
        return;
      }

      // Track attempt
      const attemptData = {
        timestamp: Date.now(),
        success: false,
        identifier: identifierValidation.sanitized
      };

      // Make login request
      const result = await signIn('credentials', {
        redirect: false,
        identifier: identifierValidation.sanitized,
        password: passwordValidation.sanitized,
        fingerprint: clientFingerprint
      });

      if (result?.error) {
        attemptData.success = false;
        setSessionAttempts(prev => [...prev, attemptData]);
        setAttemptCount(prev => prev + 1);

        // Handle different error types
        if (result.error.startsWith('TOO_MANY_REQUESTS')) {
          const resetTime = parseInt(result.error.split(':')[1], 10);
          const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
          
          setRateLimitInfo({
            blocked: true,
            remaining: 0,
            resetTime,
            isLocked: true,
            lockoutDuration: retryAfter
          });
          
          setCountdown(retryAfter);
          setError(`Terlalu banyak upaya login. Coba lagi dalam ${retryAfter} detik.`);
        } else if (result.error.startsWith('ACCOUNT_LOCKED')) {
          const lockoutData = result.error.split(':');
          const lockoutDuration = parseInt(lockoutData[1], 10);
          
          setRateLimitInfo({
            blocked: true,
            remaining: 0,
            resetTime: Date.now() + (lockoutDuration * 1000),
            isLocked: true,
            lockoutDuration
          });
          
          setCountdown(lockoutDuration);
          setError(`Akun terkunci karena terlalu banyak percobaan gagal. Coba lagi dalam ${Math.ceil(lockoutDuration / 60)} menit.`);
        } else if (result.error.startsWith('PROGRESSIVE_DELAY')) {
          const delay = parseInt(result.error.split(':')[1], 10);
          setCountdown(delay);
          setError(`Tunggu ${delay} detik sebelum mencoba lagi.`);
        } else {
          setError('Username/Email atau password salah');
          
          // Progressive delay for failed attempts
          if (attemptCount >= 1) {
            const delay = Math.min(Math.pow(2, attemptCount), 30);
            setCountdown(delay);
          }
        }

        // Show security challenge after multiple failures
        if (attemptCount >= 2) {
          setShowSecurityChallenge(true);
          setSecurityChallengeComplete(false);
        }
      } else if (result?.ok) {
        attemptData.success = true;
        setSessionAttempts(prev => [...prev, attemptData]);
        
        // Clear all error states
        setError('');
        setAttemptCount(0);
        setRateLimitInfo(null);
        setCountdown(0);
        
        // Redirect
        window.location.href = callbackUrl;
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Terjadi kesalahan saat login. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(prev => !prev);
  };

  const handleSecurityChallengeComplete = (success: boolean) => {
    if (success) {
      setSecurityChallengeComplete(true);
      setShowSecurityChallenge(false);
    }
  };

  // Format countdown display
  const formatCountdown = (seconds: number) => {
    if (seconds < 60) return `${seconds} detik`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="w-full max-w-md p-8 text-center bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-800 dark:text-gray-200">Loading...</p>
        </div>
      </div>
    );
  }

  // Already authenticated
  if (status === 'authenticated' && reason !== 'session_expired') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sudah Login</h1>
            <p className="text-gray-700 dark:text-gray-300 mt-2">
              Anda sudah login. Silahkan klik tombol di bawah jika tidak dialihkan otomatis.
            </p>
          </div>
          <div className="flex justify-center">
            <Link 
              href="/wali" 
              className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 flex items-center"
            >
              <Shield className="h-4 w-4 mr-2" />
              Buka Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Login Admin</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Masuk ke sistem administrasi
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
                          width: `${rateLimitInfo?.lockoutDuration ? 
                            ((rateLimitInfo.lockoutDuration - countdown) / rateLimitInfo.lockoutDuration) * 100 : 
                            0}%` 
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Security Information */}
                {attemptCount > 0 && (
                  <div className="mt-2 text-sm">
                    <p>Percobaan gagal: {attemptCount}/5</p>
                    {attemptCount >= 2 && (
                      <p className="text-yellow-600 dark:text-yellow-400">
                        ⚠️ Verifikasi keamanan akan muncul setelah ini
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Account Locked Warning */}
        {rateLimitInfo?.isLocked && (
          <div className="bg-orange-100 dark:bg-orange-900/30 border border-orange-400 dark:border-orange-800 text-orange-700 dark:text-orange-400 px-4 py-3 rounded-lg">
            <div className="flex items-start">
              <Lock className="h-5 w-5 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">Akun Terkunci Sementara</p>
                <p className="text-sm mt-1">
                  Akun terkunci karena terlalu banyak percobaan login yang gagal. 
                  Ini adalah tindakan keamanan untuk melindungi akun Anda.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Security Challenge */}
        {showSecurityChallenge && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-800 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-3">
              Verifikasi Keamanan Diperlukan
            </h3>
            <SecurityChallenge onComplete={handleSecurityChallengeComplete} />
          </div>
        )}

        {/* Login Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot Field */}
          <HoneypotField value={honeypot} onChange={setHoneypot} />
          
          {/* Identifier Field */}
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email atau Username
            </label>
            <input
              ref={identifierRef}
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => {
                const validation = validateInput(e.target.value, 'identifier');
                setIdentifier(validation.sanitized);
              }}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={isLoading || countdown > 0}
              autoComplete="username"
              maxLength={100}
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  const validation = validateInput(e.target.value, 'password');
                  setPassword(validation.sanitized);
                }}
                className="block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                minLength={1} //pajang password allowed
                maxLength={200}
                disabled={isLoading || countdown > 0}
                autoComplete="current-password"
              />
              <button 
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={toggleShowPassword}
                disabled={isLoading || countdown > 0}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                )}
              </button>
            </div>
            
            {/* Password Strength Indicator (when creating/changing password) */} 
            {password.length > 0 && password.length < 12 && (
              <PasswordStrengthIndicator password={password} />
            )}
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <Link 
              href="/lupa" 
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              Lupa Password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              isLoading || 
              countdown > 0 || 
              !identifier.trim() || 
              !password.trim() ||
              (showSecurityChallenge && !securityChallengeComplete)
            }
            className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-blue-400 dark:disabled:bg-blue-500/50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isLoading ? (
              <>
                <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Memproses...
              </>
            ) : countdown > 0 ? (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Tunggu {formatCountdown(countdown)}
              </>
            ) : showSecurityChallenge && !securityChallengeComplete ? (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Selesaikan Verifikasi
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Login
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>🔒 Koneksi aman dengan enkripsi end-to-end</p>
          <p>Aktivitas login dipantau untuk keamanan</p>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function EnhancedLogin() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="w-full max-w-md p-8 text-center bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-800 dark:text-gray-200">Loading...</p>
        </div>
      </div>
    }>
      <EnhancedLoginForm />
    </Suspense>
  );
}