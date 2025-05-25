"use client";

import { useState, Suspense, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';

// Create a wrapper component that uses searchParams
function LoginForm() {
  const [identifier, setIdentifier] = useState(''); // unified field for email or username
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    blocked: boolean;
    retryAfter: number;
    remaining: number;
  } | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/wali';
  const reason = searchParams?.get('reason');
  const { status } = useSession();

  // Countdown timer for rate limit
  useEffect(() => {
    if (rateLimitCountdown > 0) {
      const timer = setTimeout(() => {
        setRateLimitCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [rateLimitCountdown]);

  // Add to your LoginForm component at the beginning of the component
  useEffect(() => {
    // Clean up logout flags
    localStorage.removeItem('logout-in-progress');
    
    // If there was a manual logout, show a success message
    if (searchParams?.get('reason') === 'manual_logout') {
      setSuccessMessage('Anda telah berhasil logout.');
      setError('');
    } else if (searchParams?.get('reason') === 'error_logout') {
      setSuccessMessage('Berhasil Logout');
      setError('');
    }
  }, [searchParams]);

  // Handle session expired reason
  useEffect(() => {
    if (reason === 'session_expired') {
      setError('Sesi anda telah berakhir karena tidak aktif. Silakan login kembali.');
      setSuccessMessage('');
    }
  }, [reason]);

  // Redirect if already authenticated - use window.location for direct navigation
  useEffect(() => {
    if (status === 'authenticated') {
      // Use window.location for hard redirect instead of router.push
      window.location.href = '/wali';
    }
  }, [status]);

  // Function to determine if input is email
  const isEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't submit if rate limited
    if (rateLimitInfo?.blocked && rateLimitCountdown > 0) {
      return;
    }
    
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    // Determine if identifier is email or username
    const isEmailInput = isEmail(identifier);
    
    // Make sure to properly construct the credentials object
    const credentials: { email?: string; username?: string; password: string } = {
      password
    };
    
    if (isEmailInput) {
      credentials.email = identifier;
    } else {
      credentials.username = identifier;
    }
    try {
      // Pass identifier to the backend instead of splitting email/username
      const result = await signIn('credentials', {
        redirect: false,
        identifier: identifier, // Use unified identifier field
        password
      });
      if (result?.error) {
        // Check for rate limiting error
        if (result.error.startsWith('TOO_MANY_REQUESTS')) {
          const resetTime = parseInt(result.error.split(':')[1], 10);
          const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
          
          setRateLimitInfo({
            blocked: true,
            retryAfter,
            remaining: 0
          });
          
          setRateLimitCountdown(retryAfter);
          setError(`Terlalu banyak upaya login. Coba lagi dalam ${retryAfter} detik.`);
        } else {
          setError('Username/Email atau password salah');
        }
      } else if (result?.ok) {
        // Use window.location for a hard redirect
        window.location.href = callbackUrl;
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Terjadi kesalahan saat login');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(prev => !prev);
  };

  // Show appropriate loading state
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="w-full max-w-md p-8 text-center bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <p className="text-gray-800 dark:text-gray-200">Loading...</p>
        </div>
      </div>
    );
  }

  // If already authenticated but still on this page, show a message with manual link
  if (status === 'authenticated') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Sudah Login</h1>
          <p className="text-center text-gray-700 dark:text-gray-300">Anda sudah login. Silahkan klik tombol di bawah jika tidak dialihkan otomatis.</p>
          <div className="flex justify-center">
            <Link href="/wali" className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200">
              Buka Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Login Admin</h1>

        {successMessage && (
          <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded relative">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
            
            {rateLimitInfo?.blocked && rateLimitCountdown > 0 && (
              <div className="mt-2 text-sm">
                <p>Tunggu: {rateLimitCountdown} detik</p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-1">
                  <div 
                    className="bg-red-600 dark:bg-red-500 h-2.5 rounded-full" 
                    style={{ width: `${(rateLimitCountdown / rateLimitInfo.retryAfter) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email atau Username
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
              disabled={rateLimitInfo?.blocked && rateLimitCountdown > 0}
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
                minLength={1}
                disabled={rateLimitInfo?.blocked && rateLimitCountdown > 0}
                autoComplete="current-password"
              />
              <button 
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={toggleShowPassword}
                disabled={rateLimitInfo?.blocked && rateLimitCountdown > 0}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                )}
              </button>
            </div>
          </div>

          <div className="text-right">
            <Link href="/lupa" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
              Lupa Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading || (rateLimitInfo?.blocked && rateLimitCountdown > 0)}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-blue-400 dark:disabled:bg-blue-500/50 transition duration-200"
          >
            {isLoading 
              ? 'Memproses...' 
              : (rateLimitInfo?.blocked && rateLimitCountdown > 0)
                ? `Tunggu ${rateLimitCountdown}s`
                : 'Login'
            }
          </button>
        </form>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function Login() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="w-full max-w-md p-8 text-center bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <p className="text-gray-800 dark:text-gray-200">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}