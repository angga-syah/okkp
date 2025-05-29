// app/payment-success/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface PaymentInfo {
  invoiceId: string;
  externalId?: string;
  paymentMethod: string;
  paidAmount: string;
  customerEmail?: string;
  customerName?: string;
  serviceName?: string;
  orderId?: string;
}

// Loading component
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Memverifikasi pembayaran...</p>
      </div>
    </div>
  );
}

// Main success content component
function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const invoiceId = searchParams.get('invoice_id');
    const externalId = searchParams.get('external_id');
    const paymentMethod = searchParams.get('payment_method');
    const paidAmount = searchParams.get('paid_amount');
    const isDemo = searchParams.get('demo') === 'true';
    const amount = searchParams.get('amount'); // For demo mode

    console.log('URL Parameters:', { invoiceId, externalId, paymentMethod, paidAmount, isDemo, amount });

    // Check if parameters are placeholders (Xendit development issue)
    const isPlaceholder = (value: string | null) => {
      return !value || value.includes('{') || value.includes('}') || value === 'null';
    };

    const cleanInvoiceId = isPlaceholder(invoiceId) ? '' : invoiceId;
    const cleanExternalId = isPlaceholder(externalId) ? '' : externalId;
    const cleanPaymentMethod = isPlaceholder(paymentMethod) ? '' : paymentMethod;
    const cleanPaidAmount = isPlaceholder(paidAmount) ? (amount || '0') : paidAmount;

    // Set basic payment info from URL params (will be overwritten by API if available)
    setPaymentInfo({
      invoiceId: cleanInvoiceId || '',
      externalId: cleanExternalId || undefined,
      paymentMethod: cleanPaymentMethod || (isDemo ? 'Credit Card' : 'Unknown'),
      paidAmount: cleanPaidAmount || '0'
    });

    // Always try to fetch from database for reliable data
    const searchId = cleanInvoiceId || cleanExternalId;
    if (searchId && !isDemo) {
      fetchOrderDetails(searchId);
    } else {
      // For demo mode or no valid ID, try to get latest order
      fetchOrderDetails('latest');
    }
  }, [searchParams]);

  const fetchOrderDetails = async (id: string) => {
    try {
      let apiUrl = `/api/payment-status?id=${encodeURIComponent(id)}`;
      
      // If no valid ID, try to get latest paid order
      if (id === 'latest') {
        apiUrl = `/api/payment-status?latest=true`;
      }

      console.log('Fetching order details from:', apiUrl);
      
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        console.log('Order details received:', data);
        
        // Override payment info with database data if available
        if (data) {
          setOrderDetails(data);
          
          setPaymentInfo(prev => ({
            invoiceId: data.invoiceId || prev?.invoiceId || 'INV-DEMO-' + Date.now(),
            externalId: prev?.externalId,
            paymentMethod: prev?.paymentMethod !== 'Unknown' && prev?.paymentMethod ? prev.paymentMethod : 'Credit Card',
            paidAmount: prev?.paidAmount !== '0' && prev?.paidAmount ? prev.paidAmount : '500000',
            customerEmail: data.customerEmail,
            customerName: data.customerName,
            serviceName: data.serviceName,
            orderId: data.orderId
          }));
        } else {
          // No database data, set reasonable demo values
          setPaymentInfo(prev => ({
            invoiceId: prev?.invoiceId || 'INV-DEMO-' + Date.now(),
            externalId: prev?.externalId,
            paymentMethod: prev?.paymentMethod !== 'Unknown' && prev?.paymentMethod ? prev.paymentMethod : 'Credit Card',
            paidAmount: prev?.paidAmount !== '0' && prev?.paidAmount ? prev.paidAmount : '500000'
          }));
        }
      } else {
        console.error('Failed to fetch order details:', response.status);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: string) => {
    try {
      const numAmount = parseInt(amount);
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(numAmount);
    } catch {
      return amount;
    }
  };

  const formatPaymentMethod = (method: string) => {
    const methods: { [key: string]: string } = {
      'CREDIT_CARD': 'Kartu Kredit',
      'BANK_TRANSFER': 'Transfer Bank',
      'EWALLET': 'E-Wallet',
      'RETAIL_OUTLET': 'Retail',
      'QR_CODE': 'QR Code'
    };
    return methods[method] || method;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-lg shadow-lg border border-red-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Informasi Tidak Valid</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4 pt-24">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pembayaran Berhasil!</h1>
          <p className="text-lg text-gray-600">Terima kasih atas pembayaran Anda</p>
        </div>

        {/* Payment Details Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Detail Pembayaran
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {orderDetails?.serviceName && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Layanan</label>
                <p className="text-lg font-semibold text-gray-900">{orderDetails.serviceName}</p>
              </div>
            )}

            {paymentInfo && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Jumlah Dibayar</label>
                <p className="text-lg font-semibold text-green-600">{formatAmount(paymentInfo.paidAmount)}</p>
              </div>
            )}

            {paymentInfo && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Metode Pembayaran</label>
                <p className="text-lg font-semibold text-gray-900">{formatPaymentMethod(paymentInfo.paymentMethod)}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Waktu Pembayaran</label>
              <p className="text-lg font-semibold text-gray-900">{new Date().toLocaleString('id-ID')}</p>
            </div>

            {paymentInfo?.invoiceId && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">ID Invoice</label>
                <p className="text-sm font-mono bg-gray-100 px-3 py-2 rounded border">{paymentInfo.invoiceId}</p>
              </div>
            )}
          </div>
        </div>

        {/* What's Next Card */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Langkah Selanjutnya
          </h3>
          <div className="space-y-3 text-blue-800">
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Tim kami akan memverifikasi dokumen yang Anda berikan</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Anda akan menerima email konfirmasi dan pembaruan status aplikasi</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Proses e-visa biasanya memakan waktu 3-7 hari kerja</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {orderDetails?.customerEmail && (
            <Link
              href={`/track?email=${encodeURIComponent(orderDetails.customerEmail)}&invoiceId=${encodeURIComponent(paymentInfo?.invoiceId || '')}`}
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Lacak Pesanan
            </Link>
          )}
          
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Kembali ke Beranda
          </Link>
        </div>

        {/* Email Notification */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">Email Konfirmasi</p>
              <p className="text-sm text-yellow-700 mt-1">
                Email konfirmasi pembayaran dan detail lebih lanjut akan dikirim ke alamat email Anda dalam beberapa menit.
              </p>
            </div>
          </div>
        </div>

        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg border text-xs">
            <p><strong>Debug Info:</strong></p>
            <p>URL Params: {JSON.stringify(Object.fromEntries(searchParams.entries()))}</p>
            <p>Payment Info: {JSON.stringify(paymentInfo)}</p>
            <p>Order Details: {JSON.stringify(orderDetails)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main component with Suspense wrapper
export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}