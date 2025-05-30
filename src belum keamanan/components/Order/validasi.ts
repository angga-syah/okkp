//E:\kp\New folder\src\components\Order\validasi.ts
export const generateSessionId = () => {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
  };
  
  export const isSuspiciousSubmission = (formStartTime: number) => {
    const completionTime = Date.now() - formStartTime;
    return completionTime < 1500; // Suspicious if completed in less than 1.5 seconds
  };
  
  export const validateName = (name: string): boolean => {
    // Allow multilingual names
    const nameRegex = /^[a-zA-Z\s\u00C0-\u024F\u1E00-\u1EFF'-]+$/;
    return name.trim().length > 0 && nameRegex.test(name);
  };
  
  export const validateEmail = (email: string): boolean => {
    const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return email.trim().length > 0 && emailRegex.test(email.trim());
  };
  
  export const collectBrowserData = () => {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      sessionId: generateSessionId(),
      formCompletionTime: 0 
    };
  };