// E:\kp\New folder\src\components\Wali\hooks\useSortOrders.ts
import { useCallback } from 'react';
import { Order } from '../types';

export function useSortOrders(sortField: string, sortDirection: 'asc' | 'desc') {
  const sortOrders = useCallback((orders: Order[]) => {
    return [...orders].sort((a, b) => {
      if (sortField === 'name') {
        // Case insensitive name comparison
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        return sortDirection === 'asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      } else if (sortField === 'created_at') {
        // Date comparison
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });
  }, [sortField, sortDirection]);

  return { sortOrders };
}
