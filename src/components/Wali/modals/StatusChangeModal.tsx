// E:\kp\New folder\src\components\Wali\components\modals\StatusChangeModal.tsx
interface StatusChangeModalProps {
    pendingStatus: string;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
  }
  
  export default function StatusChangeModal({ pendingStatus, onConfirm, onCancel }: StatusChangeModalProps) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full">
          <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
            Konfirmasi Perubahan Status
          </h3>
          <p className="mb-4 text-gray-600 dark:text-gray-300 text-sm">
            Apakah Anda yakin ingin mengubah status pesanan menjadi &quot;{pendingStatus.replace(/_/g, ' ')}&quot;?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded text-sm flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Tidak
            </button>
            <button
              onClick={onConfirm}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Ya
            </button>
          </div>
        </div>
      </div>
    );
  }