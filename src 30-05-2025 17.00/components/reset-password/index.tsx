"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, Eye, EyeOff, Info, Lock } from 'lucide-react';
import { SecurityValidator } from '@/lib/enhanced-security';

// Enhanced password strength indicator (sama seperti di forgot password)
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

// Create a wrapper component that uses searchParams
function ResetPasswordForm() {
  // States
  const [currentStep, setCurrentStep] = useState<'validating' | 'reset' | 'success' | 'error'>('validating');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Security states
  const [passwordValidation, setPasswordValidation] = useState<any>(null);
  const [clientFingerprint, setClientFingerprint] = useState('');
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordRef = useRef<HTMLInputElement>(null);

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
    if (password) {
      const validation = SecurityValidator.validatePassword(password);
      setPasswordValidation(validation);
    } else {
      setPasswordValidation(null);
    }
  }, [password]);

  // Validate token with enhanced security
  const validateToken = useCallback(async (tokenParam: string) => {
    try {
      const response = await fetch(`/api/auth/resetpw?token=${encodeURIComponent(tokenParam)}`, {
        method: 'GET',
        headers: {
          'X-Client-Fingerprint': clientFingerprint,
        }
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Token tidak valid atau sudah kedaluwarsa');
        setCurrentStep('error');
        return;
      }

      if (data.valid) {
        setCurrentStep('reset');
        if (data.hasSecurityWarnings) {
          setSecurityWarnings(['Terdeteksi akses dari perangkat/lokasi berbeda']);
        }
        setSuccessMessage('Token valid. Silakan buat password baru yang kuat.');
      } else {
        setError('Token tidak valid atau sudah kedaluwarsa');
        setCurrentStep('error');
      }

    } catch (err) {
      console.error('Token validation error:', err);
      setError('Terjadi kesalahan saat memvalidasi token.');
      setCurrentStep('error');
    } finally {
      setIsLoading(false);
    }
  }, [clientFingerprint]);

  // Validate token on component mount
  useEffect(() => {
    const tokenParam = searchParams?.get('token');
    
    if (!tokenParam) {
      setError('Token reset password tidak ditemukan');
      setCurrentStep('error');
      setIsLoading(false);
      return;
    }
    
    setToken(tokenParam);
    validateToken(tokenParam);
  }, [searchParams, validateToken]);

  // Focus management
  useEffect(() => {
    if (currentStep === 'reset' && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [currentStep]);

  // Enhanced input validation
  const validateInput = (value: string, type: 'password') => {
    const validation = SecurityValidator.validateAndSanitize(value, {
      maxLength: 200,
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

  // Check if password is strong enough to submit
  const isPasswordStrongEnough = () => {
    if (!password || !passwordValidation) return false;
    return passwordValidation.isValid && passwordValidation.score >= 8;
  };

  // Handle password reset submission
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError('');
    setIsLoading(true);

    try {
      // Validate passwords
      const passwordValidation = validateInput(password, 'password');
      const confirmValidation = validateInput(confirmPassword, 'password');
      
      if (!passwordValidation.isValid || !confirmValidation.isValid) {
        setIsLoading(false);
        return;
      }

      // Check password match
      if (passwordValidation.sanitized !== confirmValidation.sanitized) {
        setError('Password dan konfirmasi password tidak cocok');
        setIsLoading(false);
        return;
      }

      // Check password strength
      const strengthCheck = SecurityValidator.validatePassword(passwordValidation.sanitized);
      
      if (!strengthCheck.isValid) {
        const missingRequirements: string[] = [];
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

      // Submit password reset
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
        router.push('/wall-e?reason=password_reset_success');
      }, 3000);

    } catch (err) {
      console.error('Password reset error:', err);
      setError('Terjadi kesalahan saat mereset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        {/* Header */}
        <div className="text-center">
          <Lock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentStep === 'validating' && 'Memvalidasi Token'}
            {currentStep === 'reset' && 'Reset Password'}
            {currentStep === 'success' && 'Berhasil'}
            {currentStep === 'error' && 'Error'}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {currentStep === 'validating' && 'Sedang memvalidasi token reset password...'}
            {currentStep === 'reset' && 'Buat password baru yang kuat dan aman'}
            {currentStep === 'success' && 'Password Anda berhasil direset'}
            {currentStep === 'error' && 'Terjadi masalah dengan token reset password'}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && currentStep === 'validating' && (
          <div className="text-center py-8">
            <div className="animate-spin mx-auto h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Memvalidasi token...</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Security Warnings */}
        {securityWarnings.length > 0 && (
          <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Peringatan Keamanan:</p>
                <ul className="mt-1 text-sm">
                  {securityWarnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Reset Password Form */}
        {currentStep === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password Baru
              </label>
              <div className="relative mt-1">
                <input
                  ref={passwordRef}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    const validation = validateInput(e.target.value, 'password');
                    setPassword(validation.sanitized);
                    if (error) setError('');
                  }}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  minLength={8}
                  maxLength={200}
                  disabled={isLoading}
                  placeholder="Masukkan password baru"
                />
                <button 
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              
              {/* Password strength indicator */}
              <PasswordStrengthIndicator password={password} />
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
                  minLength={8}
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
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Password tidak cocok
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={
                isLoading || 
                !password.trim() || 
                !confirmPassword.trim() || 
                password !== confirmPassword ||
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
            {!isPasswordStrongEnough() && password && (
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

        {/* Error State */}
        {currentStep === 'error' && (
          <div className="text-center space-y-4">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" />
            <div className="space-y-2">
              <Link 
                href="/lupa"
                className="inline-flex items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Minta Reset Password Baru
              </Link>
              <p className="text-xs text-gray-500">atau</p>
              <Link 
                href="/wall-e"
                className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Kembali ke Login
              </Link>
            </div>
          </div>
        )}

        {/* Security Notice */}
        {currentStep !== 'success' && currentStep !== 'error' && (
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>🔒 Reset password dilindungi dengan enkripsi</p>
            <p>Token valid selama 1 jam dan hanya dapat digunakan sekali</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main component with Suspense
export default function EnhancedResetPassword() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="w-full max-w-md p-8 text-center bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="animate-spin mx-auto h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-800 dark:text-gray-200">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}