// src/components/Order/turnstile.ts
import { useState, useRef, useEffect } from 'react';
import { TurnstileInstance } from "@marsidev/react-turnstile";

export const useTurnstile = () => {
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState(false);
  const [turnstileVisible, setTurnstileVisible] = useState(false);
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  const [submissionAttempts, setSubmissionAttempts] = useState(0);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
 
  const handleTurnstileSuccess = (token: string) => {
    setTurnstileToken(token);
    setTurnstileError(false);
   
    // Store the token in a cookie for middleware to access
    document.cookie = `turnstile-token=${token}; path=/; max-age=3600; SameSite=Strict; Secure`;
  };
 
  const handleTurnstileError = () => {
    console.error("Turnstile validation failed");
    setTurnstileError(true);
    setTurnstileToken("");
    // Clear the token cookie
    document.cookie = "turnstile-token=; path=/; max-age=0; SameSite=Strict; Secure";
  };
 
  const handleTurnstileExpire = () => {
    console.warn("Turnstile token expired");
    setTurnstileToken("");
    // Clear the token cookie
    document.cookie = "turnstile-token=; path=/; max-age=0; SameSite=Strict; Secure";
  };

  // Reset Turnstile when too many failed attempts
  useEffect(() => {
    if (submissionAttempts > 3 && turnstileRef.current) {
      // Force Turnstile reset after multiple failures
      turnstileRef.current.reset();
      setTurnstileToken("");
      // Clear the token cookie
      document.cookie = "turnstile-token=; path=/; max-age=0; SameSite=Strict; Secure";
    }
  }, [submissionAttempts]);

  const resetTurnstile = () => {
    if (turnstileRef.current) {
      turnstileRef.current.reset();
    }
    setTurnstileToken("");
    setTurnstileError(false);
    // Clear the token cookie
    document.cookie = "turnstile-token=; path=/; max-age=0; SameSite=Strict; Secure";
  };

  // Helper to add token to API requests
  const withTurnstileToken = (headers: HeadersInit = {}): HeadersInit => {
    return turnstileToken
      ? { ...headers, 'x-turnstile-token': turnstileToken }
      : headers;
  };

  return {
    siteKey,
    turnstileToken,
    turnstileError,
    turnstileVisible,
    turnstileLoaded,
    submissionAttempts,
    turnstileRef,
    setTurnstileVisible,
    setTurnstileLoaded,
    setSubmissionAttempts,
    handleTurnstileSuccess,
    handleTurnstileError,
    handleTurnstileExpire,
    resetTurnstile,
    withTurnstileToken
  };
};