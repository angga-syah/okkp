//E:\kp\New folder\src\components\Wali\index.tsx
"use client"
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from './wali';
import FinanceDashboard from './finance';
import ContentEditorDashboard from '../News/content';
import { UserRole } from '@/lib/roles';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/wall-e');
    } else if (status === 'authenticated') {
      setIsLoading(false);
    }
  }, [status, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  // Render appropriate dashboard based on role
  const userRole = (session?.user?.role as UserRole) || 'finance';

  if (userRole === 'admin') {
    return (
      <>
        <AdminDashboard />
      </>
    );
  } else if (userRole === 'finance') {
    return (
      <>
        <FinanceDashboard />
      </>
    );
  } else if (userRole === 'content_editor') {
    return (
      <>
        <ContentEditorDashboard />
      </>
    );
  }

  // Fallback for undefined roles
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Error</h1>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Your user account ({session?.user?.email}) doesn&apos;t have a valid role assigned.
          Please contact an administrator.
        </p>
        <button
          onClick={() => router.push('/wall-e')}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
}