// E:\kp\New folder\src\components\Wali\components\OrdersTable.tsx
import { formatDate } from '../utils/formatters';
import { StatusBadge } from '../status';
import { OrderStatus,StatusSelector } from '@/lib/order';
import ResultFileUploader from './ResultFileUploader';
import { Order } from '../types';
import { motion } from 'framer-motion';

interface OrdersTableProps {
  paginatedOrders: Order[];
  startIndex: number;
  visibleColumns: Record<string, boolean>;
  handleSort: (field: string) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
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

// SortIndicator component
const SortIndicator = ({ field, sortField, sortDirection }: { field: string; sortField: string; sortDirection: 'asc' | 'desc' }) => {
  if (sortField !== field) {
    return (
      <span className="ml-1 inline-block text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      </span>
    );
  }
  
  if (sortDirection === 'asc') {
    return (
      <span className="ml-1 inline-block text-blue-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </span>
    );
  } else {
    return (
      <span className="ml-1 inline-block text-blue-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    );
  }
};

export default function OrdersTable({
  paginatedOrders,
  startIndex,
  visibleColumns,
  handleSort,
  sortField,
  sortDirection,
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
}: OrdersTableProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {/* Dynamic columns based on visibility settings */}
              {visibleColumns.number && (
                <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">No.</th>
              )}
              
              {visibleColumns.id && (
                <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-16">ID Pesanan</th>
              )}
              
              {visibleColumns.date && (
                <th 
                  scope="col" 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 w-10"
                  onClick={() => handleSort('created_at')}
                >
                  Tanggal
                  <SortIndicator field="created_at" sortField={sortField} sortDirection={sortDirection} />
                </th>
              )}
              
              {visibleColumns.customer && (
                <th 
                  scope="col" 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 w-10"
                  onClick={() => handleSort('name')}
                >
                  Pelanggan
                  <SortIndicator field="name" sortField={sortField} sortDirection={sortDirection} />
                </th>
              )}
              
              {visibleColumns.service && (
                <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20">Layanan</th>
              )}
              
              {visibleColumns.status && (
                <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-10">Status</th>
              )}
              
              {visibleColumns.note && (
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">Catatan</th>
              )}
              
              {visibleColumns.invoice && (
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">Invoice</th>
              )}
              
              {visibleColumns.result && (
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">Hasil Layanan</th>
              )}
              
              {visibleColumns.actions && (
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-52">Aksi</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedOrders.map((order, index) => (
              <motion.tr 
                key={order.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                {/* Dynamic cells based on visibility settings */}
                {visibleColumns.number && (
                  <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {startIndex + index + 1}
                  </td>
                )}
                
                {visibleColumns.id && (
                  <td className="px-2 py-3 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">
                    {order.id.slice(0, 6)}...
                  </td>
                )}
                
                {visibleColumns.date && (
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(order.created_at)}
                  </td>
                )}
                
                {visibleColumns.customer && (
                  <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {editingOrder === order.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          name="name"
                          value={editFormData.name}
                          onChange={handleEditFormChange}
                          placeholder="Nama Pelanggan"
                          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-3 py-2 w-full"
                        />
                        <input
                          type="email"
                          name="email"
                          value={editFormData.email}
                          onChange={handleEditFormChange}
                          placeholder="Email Pelanggan"
                          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-3 py-2 w-full"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{order.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{order.email}</div>
                      </>
                    )}
                  </td>
                )}
                
                {visibleColumns.service && (
                  <td className="px-2 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {editingOrder === order.id ? (
                      <select
                        name="service_name"
                        value={editFormData.service_name}
                        onChange={handleEditFormChange}
                        className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1 w-full"
                      >
                        <option value="E-Visa Business Single Entry">E-Visa Business Single Entry</option>
                        <option value="E-Visa Business Multiple Entry">E-Visa Business Multiple Entry</option>
                      </select>
                    ) : (
                      <div className="max-w-xs truncate text-xs">{order.service_name}</div>
                    )}
                  </td>
                )}
                
                {visibleColumns.status && (
                  <td className="px-2 py-3 whitespace-nowrap text-xs">
                    <StatusBadge status={order.status} />
                  </td>
                )}
                
                {visibleColumns.note && (
                  <td className="px-3 py-3 text-sm">
                    {editingOrder === order.id ? (
                      <textarea
                        name="note"
                        value={editFormData.note}
                        onChange={handleEditFormChange}
                        placeholder=""
                        className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-3 py-2 w-full h-20 resize-none"
                      />
                    ) : editingNote === order.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder=""
                          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-3 py-2 w-full h-20 resize-none"
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => saveNote(order.id)}
                            className="bg-green-500 hover:bg-green-600 text-white rounded px-2 py-1 text-xs"
                          >
                            Simpan
                          </button>
                          <button
                            onClick={cancelEditingNote}
                            className="bg-gray-500 hover:bg-gray-600 text-white rounded px-2 py-1 text-xs"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => startEditingNote(order)} 
                        className="min-h-[40px] cursor-pointer border border-gray-200 dark:border-gray-700 rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        {order.note || ''}
                      </div>
                    )}
                  </td>
                )}
                
                {visibleColumns.invoice && (
                  <td className="px-3 py-3 text-sm">
                    {order.invoice_id ? (
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{order.invoice_id}</span>
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
                      <span className="text-xs text-gray-500 dark:text-gray-400">Belum Ada Invoice</span>
                    )}
                  </td>
                )}
                
                {visibleColumns.result && (
                  <td className="px-3 py-3 text-sm">
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
                              {order.status === 'completed' && (
                                <>
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
                                </>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            {order.status === 'completed' && (
                              <button
                                onClick={() => startUploadingResultFileOnly(order.id)}
                                className="bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-800 dark:text-amber-200 rounded px-2 py-1 text-xs"
                              >
                                Unggah Hasil
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </td>
                )}
                
                {visibleColumns.actions && (
                  <td className="px-3 py-3 text-sm">
                    <div className="flex flex-col gap-2">
                      {editingOrder === order.id ? (
                        <div className="flex space-x-2">
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
                      ) : (
                        <>
                          <StatusSelector 
                            order={order} 
                            onChange={handleStatusChange}
                          />
                          
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
                        </>
                      )}
                    </div>
                  </td>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

