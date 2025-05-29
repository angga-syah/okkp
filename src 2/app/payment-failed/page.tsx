// app/payment-failed/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Loading component
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Memuat informasi...</p>
      </div>
    </div>
  );
}

// Main failed content component
function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const [externalId, setExternalId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const external_id = searchParams.get('external_id');
    setExternalId(external_id);

    // Try to fetch order details if external_id is available
    if (external_id) {
      fetchOrderDetails(external_id);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchOrderDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/payment-status?id=${encodeURIComponent(id)}`);
      if (response.ok) {
        const data = await response.json();
        setOrderDetails(data);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 py-12 px-4 pt-24">
      <div className="max-w-2xl mx-auto">
        {/* Failed Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pembayaran Gagal</h1>
          <p className="text-lg text-gray-600">Pembayaran Anda tidak dapat diproses</p>
        </div>

        {/* Error Information Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L2.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Informasi Pesanan
          </h2>

          {orderDetails ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Layanan</label>
                <p className="text-lg font-semibold text-gray-900">{orderDetails.serviceName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Status Pesanan</label>
                <p className="text-lg font-semibold text-orange-600">Menunggu Pembayaran</p>
              </div>
              {externalId && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">ID Pesanan</label>
                  <p className="text-sm font-mono bg-gray-100 px-3 py-2 rounded border">{externalId}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600">Tidak dapat memuat informasi pesanan.</p>
            </div>
          )}
        </div>

        {/* Common Reasons Card */}
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-orange-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Penyebab Umum Pembayaran Gagal
          </h3>
          <div className="space-y-2 text-orange-800">
            <div className="flex items-start">
              <div className="w-2 h-2 bg-orange-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Saldo tidak mencukupi atau limit kartu tercapai</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-orange-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Koneksi internet terputus saat proses pembayaran</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-orange-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Kartu kredit/debit diblokir oleh bank</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-orange-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Sesi pembayaran telah berakhir (timeout)</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {orderDetails?.customerEmail && (
            <Link
              href={`/track?email=${encodeURIComponent(orderDetails.customerEmail)}&invoiceId=${encodeURIComponent(orderDetails.invoiceId || '')}`}
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Lacak Pesanan & Coba Lagi
            </Link>
          )}
          
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Kembali ke Beranda
          </Link>
        </div>

        {/* Contact Support */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75A9.75 9.75 0 0012 2.25z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800">Butuh Bantuan?</p>
              <p className="text-sm text-blue-700 mt-1">
                Jika masalah terus berlanjut, silakan hubungi tim dukungan kami untuk mendapatkan bantuan lebih lanjut.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense wrapper
export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PaymentFailedContent />
    </Suspense>
  );
}