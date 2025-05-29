// E:\kp\New folder\src\components\Wali\hooks\useFilteredOrders.ts
import { useMemo } from 'react';
import { Order } from '../types';

export function useFilteredOrders(
  orders: Order[],
  statusFilter: string,
  serviceFilter: string,
  dayFilter: string,
  monthFilter: string,
  yearFilter: string,
  searchQuery: string,
  sortOrdersFunction: (orders: Order[]) => Order[]
) {
  return useMemo(() => {
    let result = [...orders];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(order => order.status === statusFilter);
    }
    
    // Apply service filter
    if (serviceFilter !== 'all') {
      result = result.filter(order => 
        order.service_name === serviceFilter
      );
    }
    
    // Apply date filters
    if (dayFilter || monthFilter || yearFilter) {
      result = result.filter(order => {
        const orderDate = new Date(order.created_at);
        const orderDay = orderDate.getDate().toString().padStart(2, '0');
        const orderMonth = (orderDate.getMonth() + 1).toString().padStart(2, '0');
        const orderYear = orderDate.getFullYear().toString();
        
        return (!dayFilter || orderDay === dayFilter) &&
              (!monthFilter || orderMonth === monthFilter) &&
              (!yearFilter || orderYear === yearFilter);
      });
    }
    
    // Apply search query (search in all fields)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(order => 
        order.id.toLowerCase().includes(query) ||
        order.name.toLowerCase().includes(query) ||
        order.email.toLowerCase().includes(query) ||
        order.service_name.toLowerCase().includes(query) ||
        (order.invoice_id && order.invoice_id.toLowerCase().includes(query)) ||
        order.status.toLowerCase().includes(query) ||
        (order.note && order.note.toLowerCase().includes(query))
      );
    }
    
    // Apply sorting
    return sortOrdersFunction(result);
  }, [orders, statusFilter, serviceFilter, dayFilter, monthFilter, yearFilter, searchQuery, sortOrdersFunction]);
}


