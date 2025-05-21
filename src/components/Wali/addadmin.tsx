//E:\kp\New folder\src\components\Wali\addadmin.tsx
"use client"
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabaseClient } from '@/lib/sb_client';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

// Password strength checker dengan visual indicator yang diperbaiki
const checkPasswordStrength = (password: string): { strength: number; feedback: string } => {
  let strength = 0;
  let feedback = '';

  if (password.length >= 8) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[a-z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[^A-Za-z0-9]/.test(password)) strength += 1;

  switch (strength) {
    case 0:
    case 1:
      feedback = 'Sangat lemah';
      break;
    case 2:
      feedback = 'Lemah';
      break;
    case 3:
      feedback = 'Sedang';
      break;
    case 4:
      feedback = 'Kuat';
      break;
    case 5:
      feedback = 'Sangat kuat';
      break;
    default:
      feedback = 'Sangat lemah';
  }

  return { strength, feedback };
};

interface AddAdminProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user' | 'system';
  isLoading?: boolean;
}

export const AddAdminModal: React.FC<AddAdminProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uuidv4(),
      text: 'Selamat datang di Asisten Penambahan Admin. Silakan masukkan username admin baru:',
      sender: 'bot'
    }
  ]);
  
  const [currentInput, setCurrentInput] = useState('');
  const [currentStep, setCurrentStep] = useState<'username' | 'email' | 'password' | 'role' | 'confirm' | 'processing' | 'complete'>('username');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: ''
  });
  const [passwordStrength, setPasswordStrength] = useState({ strength: 0, feedback: '' });
  const [isCheckingExisting, setIsCheckingExisting] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages, isOpen]);

  // When modal opens, reset the conversation
  useEffect(() => {
    if (isOpen) {
      setMessages([
        {
          id: uuidv4(),
          text: 'Selamat datang di Asisten Penambahan User. Silakan masukkan username user baru:',
          sender: 'bot'
        }
      ]);
      setCurrentStep('username');
      setFormData({
        username: '',
        email: '',
        password: '',
        role: ''
      });
      setCurrentInput('');
      setPasswordStrength({ strength: 0, feedback: '' });
    }
  }, [isOpen]);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle input submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentInput.trim() || isCheckingExisting) return;
    
    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      text: currentInput,
      sender: 'user'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    
    // Add loading message
    const loadingMsgId = uuidv4();
    setMessages(prev => [...prev, {
      id: loadingMsgId,
      text: 'Thinking...',
      sender: 'bot',
      isLoading: true
    }]);
    
    // Process the input based on current step
    await processInput(currentInput);
    
    // Remove loading message
    setMessages(prev => prev.filter(msg => msg.id !== loadingMsgId));
  };

  // Process user input based on current step
  const processInput = async (input: string) => {
    switch (currentStep) {
      case 'username':
        // Validate username (only alphanumeric and underscore allowed)
        if (!/^[a-zA-Z0-9_]+$/.test(input)) {
          addBotMessage('Username hanya boleh berisi huruf, angka, dan underscore. Silakan coba lagi:');
          return;
        }
        
        // Check if username already exists (case insensitive check)
        try {
          setIsCheckingExisting(true);
          
          // First, check directly with Supabase
          const { data: existingByUsername, error: usernameError } = await supabaseClient
            .from('users')
            .select('username')
            .ilike('username', input) // Case-insensitive search
            .maybeSingle();
            
          if (usernameError && usernameError.code !== 'PGRST116') {
            throw usernameError;
          }
          
          if (existingByUsername) {
            addBotMessage(`Username "${input}" sudah digunakan (username bersifat case-insensitive). Silakan pilih username lain:`);
            setIsCheckingExisting(false);
            return;
          }
          
          // If Supabase direct check passes, double-check with the API
          try {
            const checkResponse = await fetch('/api/check-existing', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'username',
                value: input
              }),
            });
            
            if (checkResponse.ok) {
              const checkResult = await checkResponse.json();
              
              if (checkResult.exists) {
                addBotMessage(`Username "${input}" sudah digunakan (username bersifat case-insensitive). Silakan pilih username lain:`);
                setIsCheckingExisting(false);
                return;
              }
            }
          } catch (apiError) {
            console.error('Error checking username via API:', apiError);
            // Fallback to Supabase check result if API fails
          }
          
          setIsCheckingExisting(false);
        } catch (error) {
          console.error('Error checking username:', error);
          addBotMessage('Terjadi kesalahan saat memeriksa username. Silakan coba lagi:');
          setIsCheckingExisting(false);
          return;
        }
        
        // Username is valid and available
        setFormData(prev => ({ ...prev, username: input }));
        setCurrentStep('email');
        addBotMessage('Bagus! Sekarang masukkan alamat email untuk user baru:');
        break;
        
      case 'email':
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input)) {
          addBotMessage('Format email tidak valid. Silakan masukkan email yang valid:');
          return;
        }
        
        // Check if email already exists (case insensitive check)
        try {
          setIsCheckingExisting(true);
          
          // Convert input to lowercase for case-insensitive comparison
          const lowercaseEmail = input.toLowerCase();
          
          // First, check directly with Supabase
          const { data: existingByEmail, error: emailError } = await supabaseClient
            .from('users')
            .select('email')
            .ilike('email', lowercaseEmail) // Case-insensitive search
            .maybeSingle();
            
          if (emailError && emailError.code !== 'PGRST116') {
            throw emailError;
          }
          
          if (existingByEmail) {
            addBotMessage(`Email "${input}" sudah digunakan (email bersifat case-insensitive). Silakan masukkan email lain:`);
            setIsCheckingExisting(false);
            return;
          }
          
          // If Supabase direct check passes, double-check with the API
          try {
            const checkResponse = await fetch('/api/check-existing', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'email',
                value: lowercaseEmail
              }),
            });
            
            if (checkResponse.ok) {
              const checkResult = await checkResponse.json();
              
              if (checkResult.exists) {
                addBotMessage(`Email "${input}" sudah digunakan (email bersifat case-insensitive). Silakan masukkan email lain:`);
                setIsCheckingExisting(false);
                return;
              }
            }
          } catch (apiError) {
            console.error('Error checking email via API:', apiError);
            // Fallback to Supabase check result if API fails
          }
          
          setIsCheckingExisting(false);
        } catch (error) {
          console.error('Error checking email:', error);
          addBotMessage('Terjadi kesalahan saat memeriksa email. Silakan coba lagi:');
          setIsCheckingExisting(false);
          return;
        }
        
        // Email is valid and available - store as lowercase for consistency
        setFormData(prev => ({ ...prev, email: input.toLowerCase() }));
        setCurrentStep('password');
        addBotMessage('Email valid! Sekarang buat password untuk user (minimal 8 karakter dengan kombinasi huruf besar, kecil, angka, dan simbol):');
        break;
        
      case 'password':
        // Check password strength
        const strength = checkPasswordStrength(input);
        setPasswordStrength(strength);
        
        if (strength.strength < 3) {
          addBotMessage(`Password terlalu lemah (${strength.feedback}). Silakan buat password yang lebih kuat:`);
          return;
        }
        
        // Password is strong enough
        setFormData(prev => ({ ...prev, password: input }));
        setCurrentStep('role');
        addBotMessage('Password kuat! Silakan pilih role untuk user baru:');
        break;
        
      case 'role':
        // Validate role (tidak perlu validasi lagi karena dropdown membatasi pilihan)
        setFormData(prev => ({ ...prev, role: input }));
        setCurrentStep('confirm');
        addBotMessage(`Role user: ${input}\n\nUsername: ${formData.username}\nEmail: ${formData.email}\nRole: ${input}\n\nApakah data sudah benar? (ketik 'ya' untuk melanjutkan atau 'tidak' untuk membatalkan)`);
        break;
        
      case 'confirm':
        if (input.toLowerCase() === 'ya') {
          setCurrentStep('processing');
          addBotMessage('Memproses permintaan...');
          
          // Create user
          try {
            // Generate a UUID for the user
            const userId = uuidv4();
            
            // Final check for existing username/email before creating
            try {
              const preCheckResponse = await fetch('/api/check-existing', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  type: 'both',
                  username: formData.username,
                  email: formData.email.toLowerCase()
                }),
              });
              
              if (preCheckResponse.ok) {
                const preCheckResult = await preCheckResponse.json();
                
                if (preCheckResult.exists) {
                  const existsType = preCheckResult.existsType;
                  if (existsType === 'username') {
                    addBotMessage(`Tidak dapat membuat user: Username "${formData.username}" sudah digunakan. Silakan coba lagi dengan username lain.`);
                    setCurrentStep('username');
                    return;
                  } else if (existsType === 'email') {
                    addBotMessage(`Tidak dapat membuat user: Email "${formData.email}" sudah digunakan. Silakan coba lagi dengan email lain.`);
                    setCurrentStep('email');
                    return;
                  } else {
                    addBotMessage(`Tidak dapat membuat user: Username atau email sudah digunakan. Silakan coba lagi.`);
                    setCurrentStep('username');
                    return;
                  }
                }
              }
            } catch (preCheckError) {
              console.error('Error during pre-check:', preCheckError);
              // Continue with user creation even if pre-check fails
            }
            
            // Create the password hash (in this case we'll delegate to the API)
            const response = await fetch('/api/create-admin', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                id: userId,
                username: formData.username,
                email: formData.email.toLowerCase(), // Ensure email is stored lowercase
                password: formData.password,
                role: formData.role
              }),
            });
            
            if (!response.ok) {
              const errorResult = await response.json();
              
              // Handle specific error messages
              if (errorResult.error && errorResult.error.includes('Username already exists')) {
                addBotMessage(`Tidak dapat membuat user: Username "${formData.username}" sudah digunakan. Silakan coba lagi dengan username lain.`);
                setCurrentStep('username');
                return;
              }
              
              if (errorResult.error && errorResult.error.includes('Email already exists')) {
                addBotMessage(`Tidak dapat membuat user: Email "${formData.email}" sudah digunakan. Silakan coba lagi dengan email lain.`);
                setCurrentStep('email');
                return;
              }
              
              throw new Error(errorResult.error || 'Failed to create user');
            }            
            setCurrentStep('complete');
            
            // Determine the role display text
            let roleDisplayText = 'User';
            if (formData.role === 'admin') roleDisplayText = 'Admin';
            else if (formData.role === 'finance') roleDisplayText = 'Finance user';
            else if (formData.role === 'content_editor') roleDisplayText = 'Content Editor';
            
            addBotMessage(`${roleDisplayText} berhasil ditambahkan! Akun baru dapat langsung digunakan untuk login.`);
            
            // Notify with toast
            toast.success(`${roleDisplayText} berhasil ditambahkan!`);
            
            // Reset form after slight delay
            setTimeout(() => {
              setFormData({
                username: '',
                email: '',
                password: '',
                role: ''
              });
              setMessages([
                {
                  id: uuidv4(),
                  text: 'Selamat datang di Asisten Penambahan User. Silakan masukkan username user baru:',
                  sender: 'bot'
                }
              ]);
              setCurrentStep('username');
              setPasswordStrength({ strength: 0, feedback: '' });
            }, 5000);
            
          } catch (error) {
            console.error('Error creating user:', error);
            setCurrentStep('username');
            addBotMessage('Terjadi kesalahan saat membuat user. Silakan coba lagi dari awal. Masukkan username:');
          }
        } else if (input.toLowerCase() === 'tidak') {
          setCurrentStep('username');
          addBotMessage('Proses dibatalkan. Mari mulai dari awal. Silakan masukkan username user baru:');
          setFormData({
            username: '',
            email: '',
            password: '',
            role: ''
          });
          setPasswordStrength({ strength: 0, feedback: '' });
        } else {
          addBotMessage("Mohon ketik 'ya' untuk melanjutkan atau 'tidak' untuk membatalkan:");
        }
        break;
        
      default:
        break;
    }
  };

  // Add a bot message
  const addBotMessage = (text: string) => {
    setMessages(prev => [...prev, {
      id: uuidv4(),
      text,
      sender: 'bot'
    }]);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: 'spring', 
        damping: 20, 
        stiffness: 100 
      }
    },
    exit: { 
      opacity: 0,
      y: 50,
      transition: { duration: 0.2 }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <motion.div 
            ref={modalRef}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden flex flex-col"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
          >
            {/* Header */}
            <div className="bg-blue-600 dark:bg-blue-800 text-white py-4 px-6 flex justify-between items-center">
              <h3 className="text-lg font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                Tambah User
              </h3>
              <button 
                onClick={onClose} 
                className="text-white hover:text-gray-200 focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Chat messages */}
            <div className="flex-1 p-4 overflow-y-auto max-h-96 bg-gray-50 dark:bg-gray-900">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`mb-4 ${message.sender === 'user' ? 'text-right' : ''}`}
                >
                  <div 
                    className={`inline-block p-3 rounded-lg max-w-xs lg:max-w-md ${
                      message.sender === 'user' 
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : message.sender === 'system'
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                        : 'bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                    }`}
                  >
                    {message.isLoading ? (
                      <div className="flex space-x-1 justify-center items-center h-5">
                        <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-line text-sm">{message.text}</div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input area */}
            <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
              {currentStep === 'role' ? (
                // Tampilkan radio buttons ketika currentStep adalah 'role'
                <div className="relative">
                  <div className="flex flex-col space-y-2 mb-3">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={currentInput === 'admin'}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        className="form-radio h-5 w-5 text-blue-600"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-300">Admin</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="role"
                        value="finance"
                        checked={currentInput === 'finance'}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        className="form-radio h-5 w-5 text-blue-600"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-300">Finance</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="role"
                        value="content_editor"
                        checked={currentInput === 'content_editor'}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        className="form-radio h-5 w-5 text-blue-600"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-300">Content Editor</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={!currentInput || isCheckingExisting}
                    className={`w-full py-2 text-white rounded-full focus:outline-none transition-colors ${
                      currentInput && !isCheckingExisting ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isCheckingExisting ? 'Memeriksa...' : 'Lanjutkan'}
                  </button>
                </div>
              ) : (
                // Tampilkan input biasa untuk langkah lainnya
                <div className="relative">
                  <input
                    ref={inputRef}
                    type={currentStep === 'password' ? 'password' : 'text'}
                    value={currentInput}
                    onChange={(e) => {
                      setCurrentInput(e.target.value);
                      if (currentStep === 'password') {
                        setPasswordStrength(checkPasswordStrength(e.target.value));
                      }
                    }}
                    placeholder={
                      currentStep === 'username' ? 'Masukkan username...' :
                      currentStep === 'email' ? 'Masukkan email...' :
                      currentStep === 'password' ? 'Masukkan password...' :
                      currentStep === 'confirm' ? "Ketik 'ya' atau 'tidak'..." :
                      ''
                    }
                    disabled={currentStep === 'processing' || currentStep === 'complete' || isCheckingExisting}
                    className="w-full py-2 pl-4 pr-10 border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={currentStep === 'processing' || currentStep === 'complete' || !currentInput.trim() || isCheckingExisting}
                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-white p-1 rounded-full focus:outline-none transition-colors ${
                      currentInput.trim() && currentStep !== 'processing' && currentStep !== 'complete' && !isCheckingExisting
                        ? 'bg-blue-500 hover:bg-blue-600' 
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isCheckingExisting ? (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
              
              {/* Password strength indicator yang sudah diperbaiki */}
              {currentStep === 'password' && currentInput && (
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Kekuatan Password:</span>
                    <span 
                      className={`text-xs font-medium ${
                        passwordStrength.strength <= 2 ? 'text-red-500' : 
                        passwordStrength.strength === 3 ? 'text-yellow-500' : 
                        'text-green-500'
                      }`}
                    >
                      {passwordStrength.feedback}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={
                        passwordStrength.strength <= 2 
                          ? 'bg-red-500 h-full' 
                          : passwordStrength.strength === 3 
                            ? 'bg-yellow-500 h-full' 
                            : 'bg-green-500 h-full'
                      }
                      style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddAdminModal;