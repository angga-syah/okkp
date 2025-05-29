// E:\kp\New folder\src\components\Wali\components\modals\RevisionRequestModal.tsx
import { useRef, useState, useEffect } from 'react';

interface RevisionRequestModalProps {
  orderId: string;
  orderLanguage?: string; // Add language prop
  onSave: (orderId: string, message: string) => Promise<void>;
  onCancel: () => void;
}

// Translation object
const translations = {
  en: {
    title: "Request Document Revision",
    label: "Revision Message (will be shown to customer)",
    placeholder: "Please describe what needs to be revised...",
    cancelButton: "Cancel",
    sendButton: "Send Revision Request",
    sending: "Sending..."
  },
  id: {
    title: "Permintaan Revisi Dokumen",
    label: "Pesan Revisi (akan ditampilkan kepada pelanggan)",
    placeholder: "Silakan jelaskan apa yang perlu direvisi...",
    cancelButton: "Batal",
    sendButton: "Kirim Permintaan Revisi",
    sending: "Mengirim..."
  }
};

export default function RevisionRequestModal({ 
  orderId, 
  orderLanguage = 'en', // Default to English if not specified
  onSave, 
  onCancel 
}: RevisionRequestModalProps) {
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Get translations based on order language
  const t = translations[orderLanguage as keyof typeof translations] || translations.en;
  
  // Focus textarea when modal opens
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  const handleSave = () => {
    if (isSaving || !message.trim()) return;
    
    setIsSaving(true);
    onSave(orderId, message);
  };
  
  // Stop propagation to prevent interaction with elements behind the modal
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  // Stop propagation on the modal background click and call onCancel
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      onCancel();
    }
  };
  
  // Make sure textarea changes are properly captured
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    setMessage(e.target.value);
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick} // Handle click on backdrop
    >
      <div 
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full"
        onClick={handleModalClick} // Prevent click from reaching backdrop
      >
        <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
          {t.title}
        </h3>
        
        <div className="mb-4">
          <label 
            htmlFor="revision-message" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {t.label}
          </label>
          <textarea
            id="revision-message"
            rows={4}
            value={message}
            onChange={handleTextareaChange}
            placeholder={t.placeholder}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            ref={textareaRef}
            disabled={isSaving}
          />
        </div>
        
        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded text-sm flex items-center disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            {t.cancelButton}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !message.trim()}
            className={`px-4 py-2 rounded text-sm flex items-center ${
              isSaving || !message.trim() 
                ? 'bg-gray-400 text-gray-100 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t.sending}
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {t.sendButton}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}