// src/components/Wali/components/OrderCards.tsx - ENHANCED UI VERSION
import { formatDate } from '../utils/formatters';
import { StatusBadge } from '../status';
import { StatusSelector , OrderStatus} from '@/lib/order';
import ResultFileUploader from './ResultFileUploader';
import { Order } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface OrderCardsProps {
  paginatedOrders: Order[];
  startIndex: number;
  expandedCardId: string | null;
  toggleCardExpansion: (orderId: string) => void;
  editingOrder: string | null;
  editFormData: {
    name: string;
    email: string;
    service_name: string;
    note: string;
  };
  handleEditFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  saveOrderChanges: (orderId: string) => Promise<void>;
  cancelEditing: () => void;
  editingNote: string | null;
  noteText: string;
  setNoteText: (text: string) => void;
  saveNote: (orderId: string) => Promise<void>;
  cancelEditingNote: () => void;
  startEditingNote: (order: Order) => void;
  uploadingResultFor: string | null;
  startUploadingResultFileOnly: (orderId: string) => void;
  cancelUploadingResult: () => void;
  handleResultFileUpload: (orderId: string, filePath: string) => void;
  viewResultFile: (orderId: string) => Promise<void>;
  handleDeleteResultFile: (orderId: string) => void;
  handleStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  startEditing: (order: Order) => void;
  handleDeleteOrder: (orderId: string) => void;
  viewDocument: (orderId: string) => void;
  requestDocumentRevision: (orderId: string) => void;
}

export default function OrderCards({
  paginatedOrders,
  startIndex,
  expandedCardId,
  toggleCardExpansion,
  editingOrder,
  editFormData,
  handleEditFormChange,
  saveOrderChanges,
  cancelEditing,
  editingNote,
  noteText,
  setNoteText,
  saveNote,
  cancelEditingNote,
  startEditingNote,
  uploadingResultFor,
  startUploadingResultFileOnly,
  cancelUploadingResult,
  handleResultFileUpload,
  viewResultFile,
  handleDeleteResultFile,
  handleStatusChange,
  startEditing,
  handleDeleteOrder,
  viewDocument,
  requestDocumentRevision
}: OrderCardsProps) {
  
  // Function to copy text to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Optional: You can add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Enhanced status color function
  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      'pending_payment': 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg shadow-yellow-200',
      'payment_verified': 'bg-gradient-to-r from-green-400 to-green-500 text-white shadow-lg shadow-green-200',
      'completed': 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-lg shadow-emerald-200',
      'cancelled': 'bg-gradient-to-r from-red-400 to-red-500 text-white shadow-lg shadow-red-200',
      'processing': 'bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-lg shadow-blue-200',
      'document_verification': 'bg-gradient-to-r from-indigo-400 to-indigo-500 text-white shadow-lg shadow-indigo-200',
      'pending_document': 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-200',
      'payment_expired': 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg shadow-gray-200',
    };
    return statusColors[status] || 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg shadow-gray-200';
  };

  return (
    <div className="space-y-6">
      {paginatedOrders.map((order, index) => {
        const isExpanded = expandedCardId === order.id;
        
        return (
          <motion.div 
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-600"
          >
            <div 
              className="flex justify-between items-center cursor-pointer group"
              onClick={() => toggleCardExpansion(order.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-bold rounded-full shadow-lg">
                    #{startIndex + index + 1}
                  </span>
                  <span className="inline-flex items-center justify-center px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-mono rounded-full">
                    {order.id.slice(0, 8)}...
                  </span>
                  <div className="w-1 h-6 bg-gradient-to-b from-indigo-400 to-purple-500 rounded-full"></div>
                </div>
                
                <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100 mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {order.name}
                </h3>
                
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 12V11m0 0l-3-3m3 3l3-3" />
                  </svg>
                  {formatDate(order.created_at)}
                </div>
                
                {/* Show download password in summary if result file exists */}
                {order.result_file_path && order.download_password && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className="font-medium">Password: {order.download_password}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-end gap-3">
                <span className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full ${getStatusColor(order.status)}`}>
                  <StatusBadge status={order.status} />
                </span>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-6 w-6 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </motion.div>
              </div>
            </div>
            
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                    {editingOrder === order.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Nama
                              </label>
                              <input
                                type="text"
                                name="name"
                                value={editFormData.name}
                                onChange={handleEditFormChange}
                                className="w-full border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all duration-300"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Email
                              </label>
                              <input
                                type="email"
                                name="email"
                                value={editFormData.email}
                                onChange={handleEditFormChange}
                                className="w-full border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all duration-300"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Layanan
                              </label>
                              <select
                                name="service_name"
                                value={editFormData.service_name}
                                onChange={handleEditFormChange}
                                className="w-full border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all duration-300"
                              >
                                <option value="E-Visa Business Single Entry">E-Visa Business Single Entry</option>
                                <option value="E-Visa Business Multiple Entry">E-Visa Business Multiple Entry</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Catatan
                              </label>
                              <textarea
                                name="note"
                                value={editFormData.note}
                                onChange={handleEditFormChange}
                                className="w-full border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl p-3 h-24 resize-none focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all duration-300"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3 mt-6">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => saveOrderChanges(order.id)}
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl px-6 py-2 font-medium shadow-lg transition-all duration-300"
                          >
                            💾 Simpan
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={cancelEditing}
                            className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl px-6 py-2 font-medium shadow-lg transition-all duration-300"
                          >
                            ❌ Batal
                          </motion.button>
                        </div>
                      </div>
                    ) : editingNote === order.id ? (
                      <div className="space-y-4">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Catatan
                        </label>
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          className="w-full border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl p-3 h-24 resize-none focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all duration-300"
                        />
                        <div className="flex justify-end space-x-3">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => saveNote(order.id)}
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl px-6 py-2 font-medium shadow-lg transition-all duration-300"
                          >
                            💾 Simpan
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={cancelEditingNote}
                            className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl px-6 py-2 font-medium shadow-lg transition-all duration-300"
                          >
                            ❌ Batal
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                              </svg>
                              Email
                            </label>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{order.email}</div>
                          </div>
                          
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                            <label className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                              </svg>
                              Layanan
                            </label>
                            <div className="text-sm font-medium text-blue-900 dark:text-blue-100">{order.service_name}</div>
                          </div>
                          
                          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                            <label className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-300 mb-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Invoice
                            </label>
                            <div className="text-sm">
                              {order.invoice_id ? (
                                <div className="space-y-2">
                                  <span className="font-mono text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-800 px-2 py-1 rounded">
                                    {order.invoice_id}
                                  </span>
                                  {order.payment_url && (
                                    <div>
                                      <a 
                                        href={order.payment_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 text-xs font-medium hover:underline"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        Tautan Pembayaran
                                      </a>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                                  Belum Ada Invoice
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                            <label className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Catatan
                            </label>
                            <div 
                              onClick={() => startEditingNote(order)} 
                              className="min-h-[60px] cursor-pointer border-2 border-purple-200 dark:border-purple-700 rounded-lg p-3 text-sm hover:bg-purple-100 dark:hover:bg-purple-800/30 transition-colors"
                            >
                              {order.note || <span className="text-gray-400 italic">Klik untuk menambah catatan...</span>}
                            </div>
                          </div>
                          
                          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4">
                            <label className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-300 mb-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Hasil Layanan
                            </label>
                            <div>
                              {uploadingResultFor === order.id ? (
                                <div className="space-y-3">
                                  <ResultFileUploader 
                                    orderId={order.id} 
                                    onUploadComplete={(orderId, filePath) => {
                                      handleResultFileUpload(orderId, filePath);
                                      cancelUploadingResult();
                                    }} 
                                  />
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={cancelUploadingResult}
                                    className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all duration-300"
                                  >
                                    ❌ Batal
                                  </motion.button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {order.result_file_path ? (
                                    <>
                                      <span className="inline-flex items-center gap-1 text-sm text-green-700 dark:text-green-300 font-medium">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        File tersedia
                                      </span>
                                      <div className="flex flex-wrap gap-2">
                                        <motion.button
                                          whileHover={{ scale: 1.05 }}
                                          whileTap={{ scale: 0.95 }}
                                          onClick={() => viewResultFile(order.id)}
                                          className="bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-lg px-3 py-1 text-xs font-medium transition-all duration-300"
                                        >
                                          👁️ Lihat
                                        </motion.button>
                                        <motion.button
                                          whileHover={{ scale: 1.05 }}
                                          whileTap={{ scale: 0.95 }}
                                          onClick={() => startUploadingResultFileOnly(order.id)}
                                          className="bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 text-green-800 dark:text-green-200 rounded-lg px-3 py-1 text-xs font-medium transition-all duration-300"
                                        >
                                          🔄 Ganti
                                        </motion.button>
                                        <motion.button
                                          whileHover={{ scale: 1.05 }}
                                          whileTap={{ scale: 0.95 }}
                                          onClick={() => handleDeleteResultFile(order.id)}
                                          className="bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-800 dark:text-red-200 rounded-lg px-3 py-1 text-xs font-medium transition-all duration-300"
                                        >
                                          🗑️ Hapus
                                        </motion.button>
                                      </div>
                                    </>
                                  ) : (
                                    order.status === 'completed' && (
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => startUploadingResultFileOnly(order.id)}
                                        className="bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300"
                                      >
                                        📤 Unggah Hasil
                                      </motion.button>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Enhanced Download Password Section */}
                    {order.download_password && !editingOrder && !editingNote && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800"
                      >
                        <label className="flex items-center gap-2 text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Password Download Customer
                        </label>
                        <div className="flex items-center justify-between">
                          <code className="bg-white dark:bg-gray-800 px-4 py-3 rounded-lg text-sm font-mono border border-yellow-300 dark:border-yellow-700 flex-1 mr-3 shadow-inner">
                            {order.download_password}
                          </code>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => copyToClipboard(order.download_password || '')}
                            className="p-3 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-800/30 rounded-lg transition-all duration-300 shadow-lg"
                            title="Copy password"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2v8a2 2 0 002 2z" />
                            </svg>
                          </motion.button>
                        </div>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">
                          💡 Password ini akan dikirim ke email customer untuk mengunduh file hasil
                        </p>
                      </motion.div>
                    )}
                    
                    {!editingOrder && !editingNote && (
                      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Status
                            </label>
                            <StatusSelector 
                              order={order} 
                              onChange={handleStatusChange}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Aksi
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => startEditing(order)}
                              className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all duration-300"
                            >
                              ✏️ Edit
                            </motion.button>
                            
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDeleteOrder(order.id)}
                              className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all duration-300"
                            >
                              🗑️ Hapus
                            </motion.button>
                            
                            {order.document_path && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => viewDocument(order.id)}
                                  className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all duration-300"
                                >
                                  📄 Lihat Dokumen
                                </motion.button>
                              )}
                              
                              {(order.status === 'document_verification') && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => requestDocumentRevision(order.id)}
                                  className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all duration-300"
                                >
                                  📝 Request Revision
                                </motion.button>
                              )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}