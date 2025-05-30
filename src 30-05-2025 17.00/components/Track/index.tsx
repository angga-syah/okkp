//track.tsx

"use client"

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Customer from './customer';

export default function CustomerWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CustomerWithSearchParams />
    </Suspense>
  );
}

function CustomerWithSearchParams() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');
  const invoiceIdParam = searchParams.get('invoiceId');
  
  return (
    <Customer
      initialEmail={emailParam || ''} 
      initialInvoiceId={invoiceIdParam || ''} 
    />
  );
}