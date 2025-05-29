import { useMemo } from 'react';
import { Order } from '../types';

export function usePagination(
  filteredOrders: Order[],
  currentPage: number,
  rowsPerPage: number,
  setCurrentPage: (page: number) => void
) {
  return useMemo(() => {
    const orders = filteredOrders || [];
    
    const totalPages = Math.ceil(orders.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedOrders = orders.slice(startIndex, startIndex + rowsPerPage);
    // Generate pagination buttons
    const paginationButtons: React.ReactNode[] = [];
    const maxButtons = 5;
    
    // Calculate range of buttons to show
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    const endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    // Add "first page" button if not at the beginning
    if (startPage > 1) {
      paginationButtons.push(
        <button
          key="first"
          onClick={() => setCurrentPage(1)}
          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
          1
        </button>
      );
      
      if (startPage > 2) {
        paginationButtons.push(
          <span key="ellipsis1" className="px-3 py-1">...</span>
        );
      }
    }
    
    // Add page buttons
    for (let i = startPage; i <= endPage; i++) {
      paginationButtons.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`px-3 py-1 rounded border ${
            currentPage === i
              ? 'bg-blue-500 text-white'
              : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {i}
        </button>
      );
    }
    
    // Add "last page" button if not at the end
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationButtons.push(
          <span key="ellipsis2" className="px-3 py-1">...</span>
        );
      }
      
      paginationButtons.push(
        <button
          key="last"
          onClick={() => setCurrentPage(totalPages)}
          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {totalPages}
        </button>
      );
    }
    
    return {
        paginatedOrders,
        totalPages,
        startIndex,
        paginationButtons
      };
    }, [filteredOrders, currentPage, rowsPerPage, setCurrentPage]);
  }