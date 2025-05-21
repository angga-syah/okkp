// E:\kp\New folder\src\components\Wali\components\OrderCards.tsx
import { formatDate } from '../utils/formatters';
import { StatusBadge } from '../status';
import { StatusSelector , OrderStatus} from '@/lib/order';
import ResultFileUploader from './ResultFileUploader';
import { Order } from '../types';
import { motion } from 'framer-motion';

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
  return (
    <div className="space-y-4">
      {paginatedOrders.map((order, index) => {
        const isExpanded = expandedCardId === order.id;
        
        return (
          <motion.div 
            key={order.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4"
          >
            <div 
              className="flex justify-between items-center cursor-pointer"
              onClick={() => toggleCardExpansion(order.id)}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    #{startIndex + index + 1}
                  </span>
                  <span className="font-mono text-xs">
                    {order.id.slice(0, 6)}...
                  </span>
                </div>
                <h3 className="font-medium mt-1">{order.name}</h3>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatDate(order.created_at)}
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <StatusBadge status={order.status} />
                <div className="mt-2">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : 'rotate-0'}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            {isExpanded && (
              <div className="mt-4 border-t pt-4">
                {editingOrder === order.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nama
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={editFormData.name}
                        onChange={handleEditFormChange}
                        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={editFormData.email}
                        onChange={handleEditFormChange}
                        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Layanan
                      </label>
                      <select
                        name="service_name"
                        value={editFormData.service_name}
                        onChange={handleEditFormChange}
                        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm"
                      >
                        <option value="E-Visa Business Single Entry">E-Visa Business Single Entry</option>
                        <option value="E-Visa Business Multiple Entry">E-Visa Business Multiple Entry</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Catatan
                      </label>
                      <textarea
                        name="note"
                        value={editFormData.note}
                        onChange={handleEditFormChange}
                        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm h-20 resize-none"
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2 mt-3">
                      <button
                        onClick={() => saveOrderChanges(order.id)}
                        className="bg-green-500 hover:bg-green-600 text-white rounded px-3 py-1 text-xs"
                      >
                        Simpan
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="bg-gray-500 hover:bg-gray-600 text-white rounded px-3 py-1 text-xs"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : editingNote === order.id ? (
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Catatan
                    </label>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm h-20 resize-none"
                    />
                    <div className="flex justify-end space-x-2 mt-3">
                      <button
                        onClick={() => saveNote(order.id)}
                        className="bg-green-500 hover:bg-green-600 text-white rounded px-3 py-1 text-xs"
                      >
                        Simpan
                      </button>
                      <button
                        onClick={cancelEditingNote}
                        className="bg-gray-500 hover:bg-gray-600 text-white rounded px-3 py-1 text-xs"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <div className="text-sm">{order.email}</div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Layanan
                      </label>
                      <div className="text-sm">{order.service_name}</div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Invoice
                      </label>
                      <div className="text-sm">
                        {order.invoice_id ? (
                          <div className="flex flex-col">
                            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                              {order.invoice_id}
                            </span>
                            {order.payment_url && (
                              <a 
                                href={order.payment_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Tautan Pembayaran
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Belum Ada Invoice
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Catatan
                      </label>
                      <div 
                        onClick={() => startEditingNote(order)} 
                        className="min-h-[40px] cursor-pointer border border-gray-200 dark:border-gray-700 rounded p-2 text-sm"
                      >
                        {order.note || ''}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Hasil Layanan
                      </label>
                      <div>
                        {uploadingResultFor === order.id ? (
                          <div className="flex flex-col gap-2">
                            <ResultFileUploader 
                              orderId={order.id} 
                              onUploadComplete={(orderId, filePath) => {
                                handleResultFileUpload(orderId, filePath);
                                cancelUploadingResult();
                              }} 
                            />
                            <button
                              onClick={cancelUploadingResult}
                              className="bg-gray-500 hover:bg-gray-600 text-white rounded px-3 py-1 text-xs"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            {order.result_file_path ? (
                              <>
                                <span className="text-xs text-gray-700 dark:text-gray-300">
                                  File tersedia
                                </span>
                                <div className="flex space-x-1 mt-1">
                                  <button
                                    onClick={() => viewResultFile(order.id)}
                                    className="bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 rounded px-2 py-1 text-xs"
                                  >
                                    Lihat
                                  </button>
                                  <button
                                    onClick={() => startUploadingResultFileOnly(order.id)}
                                    className="bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 text-green-800 dark:text-green-200 rounded px-2 py-1 text-xs"
                                  >
                                    Ganti
                                  </button>
                                  <button
                                    onClick={() => handleDeleteResultFile(order.id)}
                                    className="bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-800 dark:text-red-200 rounded px-2 py-1 text-xs"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </>
                            ) : (
                              order.status === 'completed' && (
                                <button
                                  onClick={() => startUploadingResultFileOnly(order.id)}
                                  className="bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-800 dark:text-amber-200 rounded px-2 py-1 text-xs"
                                >
                                  Unggah Hasil
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status
                      </label>
                      <StatusSelector 
                        order={order} 
                        onChange={handleStatusChange}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Aksi
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => startEditing(order)}
                          className="bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-1 text-xs"
                        >
                          Edit
                        </button>
                        
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="bg-red-500 hover:bg-red-600 text-white rounded px-3 py-1 text-xs"
                        >
                          Hapus
                        </button>
                        
                        {order.document_path && (
                            <button
                              onClick={() => viewDocument(order.id)}
                              className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded px-3 py-1 text-xs"
                            >
                              Lihat Dokumen
                            </button>
                          )}
                          
                          {(order.status === 'document_verification') && (
                            <button
                              onClick={() => requestDocumentRevision(order.id)}
                              className="bg-amber-500 hover:bg-amber-600 text-white rounded px-3 py-1 text-xs"
                            >
                              Request Revision
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}