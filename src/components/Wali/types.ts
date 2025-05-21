// E:\kp\New folder\src\components\Wali\types.ts
import { OrderStatus } from '@/lib/order';
  
export interface Order {
  id: string;
  name: string;
  email: string;
  service_name: string;
  invoice_id: string | null;
  payment_url: string | null;
  document_path: string | null;
  result_file_path?: string | null;
  status: OrderStatus;
  created_at: string;
  revision_message?: string | null;
  note?: string | null;
  language?: string | null;
}

export interface StatusChangeRequest {
  orderId: string;
  newStatus: OrderStatus;
}