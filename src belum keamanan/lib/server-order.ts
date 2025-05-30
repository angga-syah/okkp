// E:\kp\New folder\src\lib\server-order.ts
// Define basic order status types
export type OrderStatus =
  | 'pending_payment'
  | 'payment_verified'
  | 'document_verification'
  | 'pending_document'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'payment_expired';

// Server-side function for updating order status
export async function updateOrderStatus(
  supabaseClient: any,
  orderId: string,
  status: OrderStatus
): Promise<{ success: boolean; error: any }> {
  try {
    const { error } = await supabaseClient
      .from('orders')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
     
    if (error) {
      throw error;
    }
   
    return { success: true, error: null };
  } catch (err) {
    console.error('Error updating order status:', err);
    return { success: false, error: err };
  }
}