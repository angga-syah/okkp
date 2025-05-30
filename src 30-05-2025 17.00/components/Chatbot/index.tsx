//chatbot
"use client";

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from "../Header/Bahasa";
import DOMPurify from 'dompurify';

// Definisikan tipe untuk pesan chat
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

// Security utility functions
const securityUtils = {
  // Generate a secure random ID
  generateId: () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  },
  
  // Sanitize content to prevent XSS
  sanitizeContent: (content: string): string => {
    return DOMPurify.sanitize(content);
  },
  
  // Validate input content
  validateInput: (input: string): boolean => {
    // Basic validation - not empty and not too long
    return input.trim().length > 0 && input.trim().length <= 500;
  }
};

export default function Chatbot() {
  const { language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevLanguageRef = useRef(language);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Rate limiting constants
  const RATE_LIMIT_MS = 1000; // 1 second between messages
  const MAX_MESSAGES_PER_MINUTE = 10;
  const messageCountRef = useRef<{timestamp: number, count: number}[]>([]);

  // Translations
  const translations = {
    en: {
      welcomeMessage: "Hello! How can I assist you?",
      placeholderText: "Type your message...",
      errorMessage: "Sorry, an error occurred. Please try again or contact us through the available contacts.",
      rateLimitMessage: "You're sending messages too quickly. Please wait a moment before sending another message.",
      securityErrorMessage: "Your message couldn't be processed. Please try again with different content.",
      assistantTitle: "Forsa AI Assistant",
      modelDescription: "generative AI model - responses may vary",
      clearChatTitle: "Clear chat history",
    },
    id: {
      welcomeMessage: "Halo! Ada yang bisa saya bantu?",
      placeholderText: "Ketik pesan anda...",
      errorMessage: "Maaf, terjadi kesalahan. Silakan coba lagi atau hubungi kami melalui kontak yang tersedia.",
      rateLimitMessage: "Anda mengirim pesan terlalu cepat. Harap tunggu sebentar sebelum mengirim pesan lain.",
      securityErrorMessage: "Pesan Anda tidak dapat diproses. Silakan coba lagi dengan konten yang berbeda.",
      assistantTitle: "Forsa AI Assistant",
      modelDescription: "model AI generatif - respon dapat bervariasi",
      clearChatTitle: "Hapus riwayat chat",
    }
  };

  // Current language content
  const t = translations[language as keyof typeof translations] || translations.en;

  // Check if user is sending messages too quickly
  const checkRateLimit = (): boolean => {
    const now = Date.now();
    
    // Simple time-based throttling
    if (now - lastMessageTime < RATE_LIMIT_MS) {
      return true;
    }
    
    // More complex rate limiting (messages per minute)
    const oneMinuteAgo = now - 60000;
    messageCountRef.current = messageCountRef.current.filter(entry => entry.timestamp > oneMinuteAgo);
    
    if (messageCountRef.current.length >= MAX_MESSAGES_PER_MINUTE) {
      return true;
    }
    
    // Update counters
    messageCountRef.current.push({ timestamp: now, count: 1 });
    setLastMessageTime(now);
    
    return false;
  };

  // efek mengetik
  const createTypingEffect = (text: string) => {
    const typedMessages: ChatMessage[] = [];
    const baseId = securityUtils.generateId();
    
    for (let i = 1; i <= text.length; i++) {
      typedMessages.push({
        id: `${baseId}-${i}`,
        role: 'assistant',
        content: securityUtils.sanitizeContent(text.slice(0, i)),
        timestamp: new Date(),
        isTyping: i < text.length
      });
    }
    return typedMessages;
  };

  // Handle language change
  useEffect(() => {
    // Only clear and reset welcome message when language actually changes
    if (prevLanguageRef.current !== language && messages.length > 0) {
      setMessages([]);
    }
    prevLanguageRef.current = language;
  }, [language, messages.length]);

  // Welcome message when chat is first opened
  useEffect(() => {
    if (isChatOpen && messages.length === 0) {
      const welcomeText = t.welcomeMessage;
      const typingMessages = createTypingEffect(welcomeText);
      
      // Tambahkan pesan bertahap dengan delay
      typingMessages.forEach((msg, index) => {
        setTimeout(() => {
          setMessages(prev => {
            // Hapus pesan sebelumnya jika ada
            const filteredPrev = prev.filter(m => !m.isTyping);
            return [...filteredPrev, msg];
          });
        }, index * 65); // Delay 65ms antara setiap karakter
      });
    }
  }, [isChatOpen, messages.length, t.welcomeMessage]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus on input when chat opens
  useEffect(() => {
    if (isChatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isChatOpen]);

  // Close chat when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (chatContainerRef.current && !chatContainerRef.current.contains(event.target as Node) && isChatOpen) {
        const chatButton = document.getElementById('chat-toggle-button');
        if (chatButton && !chatButton.contains(event.target as Node)) {
          setIsChatOpen(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isChatOpen]);

  // Handle input height automatically
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Reset rate limit status
  useEffect(() => {
    if (rateLimited) {
      const timer = setTimeout(() => {
        setRateLimited(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [rateLimited]);

  // Send message to OpenAI API
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Check input validity before proceeding
    if (!input.trim() || isLoading || !securityUtils.validateInput(input)) {
      if (!securityUtils.validateInput(input) && input.trim()) {
        setMessages(prev => [...prev, { 
          id: securityUtils.generateId(),
          role: 'system', 
          content: t.securityErrorMessage,
          timestamp: new Date()
        }]);
        setInput('');
      }
      return;
    }
    
    // Check rate limiting
    if (checkRateLimit()) {
      setRateLimited(true);
      setMessages(prev => [...prev, { 
        id: securityUtils.generateId(),
        role: 'system', 
        content: t.rateLimitMessage,
        timestamp: new Date()
      }]);
      return;
    }

    const sanitizedInput = securityUtils.sanitizeContent(input.trim());
    const userMessage: ChatMessage = { 
      id: securityUtils.generateId(),
      role: 'user', 
      content: sanitizedInput,
      timestamp: new Date()
    };
    
    // Add user message to conversation
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
      
      // Show typing indicator
      const loadingMsgId = securityUtils.generateId();
      setMessages(prev => [...prev, { 
        id: loadingMsgId,
        role: 'assistant', 
        content: '...',
        timestamp: new Date()
      }]);
      
      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController();
    
      // Send messages to API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout
      
      // Only send essential data in a more secure format
      const secureMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Coba temukan CSRF token jika tersedia
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? {'X-CSRF-Token': csrfToken} : {})
        },
        body: JSON.stringify({ 
          messages: [...secureMessages, {role: userMessage.role, content: userMessage.content}],
          language
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Network response error: ${response.status}`);
      }

      const data = await response.json();
      
      // Validate response data
      if (!data || typeof data.response !== 'string') {
        throw new Error('Invalid response format');
      }
      
      // Remove typing indicator and add actual response
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => msg.id !== loadingMsgId);
        return [...withoutTyping, { 
          id: securityUtils.generateId(),
          role: 'assistant', 
          content: securityUtils.sanitizeContent(data.response),
          timestamp: new Date()
        }];
      });
    } catch (error) {
      // Check if this is an abort error (timeout or user cancelled)
      const errorMessage = error instanceof Error && error.name === 'AbortError' 
        ? 'Request timed out. Please try again.' 
        : t.errorMessage;
      
      // Log error safely without exposing details to console
      if (process.env.NODE_ENV === 'development') {
        console.error('Chat error:', error instanceof Error ? error.message : 'Unknown error');
      }
      
      // Remove typing indicator and add error message
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => !msg.content.includes('...'));
        return [...withoutTyping, { 
          id: securityUtils.generateId(),
          role: 'assistant', 
          content: errorMessage,
          timestamp: new Date()
        }];
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Handle keyboard input (Enter to send)
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  // Format timestamp
  function formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Clear chat history
  function clearChat() {
    setMessages([]);
    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }

  // Safely render message content
  const renderMessageContent = (content: string) => {
    return { __html: DOMPurify.sanitize(content) };
  };

  return (
    <>
      {/* Chat toggle button */}
      <button
        id="chat-toggle-button"
        onClick={() => setIsChatOpen(prev => !prev)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-blue-600 text-white rounded-full p-3 sm:p-4 shadow-lg hover:bg-blue-700 transition-all z-50 flex items-center justify-center"
        aria-label="Toggle chat"
      >
        {isChatOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Chat window */}
      <div 
        ref={chatContainerRef}
        className={`fixed bottom-16 sm:bottom-20 right-2 sm:right-6 w-[85vw] sm:w-80 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden z-40 transition-all duration-300 ${
          isChatOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
        }`}
        style={{ maxHeight: 'calc(100vh - 120px)' }}
      >
        {/* Chat header */}
        <div className="bg-blue-600 text-white p-3 sm:p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center mr-2 sm:mr-3">
              <svg fill="#000" width="20" height="20" className="sm:w-7 sm:h-7" viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">{t.assistantTitle}</h3>
              <p className="text-[10px] sm:text-xs text-blue-100">{t.modelDescription}</p>
            </div>
          </div>
          <div className="flex items-center">
            <button 
              onClick={clearChat}
              className="text-white hover:text-blue-200 mr-1 sm:mr-3"
              title={t.clearChatTitle}
              aria-label={t.clearChatTitle}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Chat messages */}
        <div className="h-64 sm:h-80 md:h-96 overflow-y-auto p-3 sm:p-4 bg-gray-50 dark:bg-gray-900">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`mb-3 sm:mb-4 ${
                msg.role === 'user' ? 'ml-auto max-w-[80%] flex flex-col items-end' : 'max-w-[80%]'
              }`}
            >
              <div className={`rounded-lg p-2 sm:p-3 text-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : msg.role === 'system'
                    ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 rounded-bl-none'
                  : msg.isTyping 
                    ? 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm rounded-bl-none animate-pulse' 
                    : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm rounded-bl-none'
              }`}>
                <span dangerouslySetInnerHTML={renderMessageContent(msg.content)} />
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatTime(msg.timestamp)}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat input */}
        <form onSubmit={handleSubmit} className="border-t bg-white dark:bg-gray-800">
          <div className="flex items-end border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent m-2 sm:m-3">
            <textarea
              id="chat-input"
              name="chat-message"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.placeholderText}
              rows={1}
              maxLength={500} // Limit input length
              className="flex-1 p-2 sm:p-3 focus:outline-none bg-transparent resize-none max-h-24 sm:max-h-32 text-sm sm:text-base text-gray-900 dark:text-white"
              disabled={isLoading || rateLimited}
              aria-label={t.placeholderText}
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim() || rateLimited}
              className={`p-2 sm:p-3 ${
                isLoading || !input.trim() || rateLimited
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
              }`}
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          
          {/* Footer */}
          <div className="border-t py-1 sm:py-2 px-2 sm:px-3 text-[10px] sm:text-xs text-center text-gray-500 dark:text-gray-400 flex items-center justify-center">
            {/* Footer content can be added here if needed */}
          </div>
        </form>
      </div>
    </>
  );
}