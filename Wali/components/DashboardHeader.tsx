// E:\kp\New folder\src\components\Wali\components\DashboardHeader.tsx
import { Session } from 'next-auth';
import { RolePermissions } from '@/lib/roles';
import { Order } from '../types';
import { motion } from 'framer-motion';

interface DashboardHeaderProps {
  session: Session | null;
  permissions: RolePermissions;
  handleExport: () => Promise<void>;
  filteredOrders: Order[];
  loading: boolean;
  isCardView: boolean;
  setIsCardView: (isCardView: boolean) => void;
  setShowColumnSettings: (show: boolean) => void;
  setShowAddAdminModal: (show: boolean) => void;
  handleLogout: () => void;
}

export default function DashboardHeader({
  permissions,
  handleExport,
  filteredOrders,
  loading,
  isCardView, // Added this prop to the parameters
  setShowColumnSettings,
  setShowAddAdminModal,
  handleLogout
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
      <div className="w-full sm:w-auto flex flex-wrap justify-center sm:justify-start gap-2">
        {permissions.canExportData && (
          <motion.div 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
          >    
            <button
              onClick={handleExport}
              disabled={filteredOrders.length === 0 || loading}
              className="flex items-center bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Export</span>
            </button>
          </motion.div>
        )}
        
        {/* Column settings button - Hide on mobile (isCardView) */}
        {!isCardView && (
          <motion.div 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
          >    
            <button
              onClick={() => setShowColumnSettings(true)}
              className="flex items-center bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden sm:inline">Pengaturan Kolom</span>
              <span className="sm:hidden">Kolom</span>
            </button>
          </motion.div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {/* Add Admin button */}
        {permissions.canAddAdmin && (
          <motion.div 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
          >    
            <button
              onClick={() => setShowAddAdminModal(true)}
              className="flex items-center bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span className="hidden sm:inline">Tambah User</span>
              <span className="sm:hidden">User+</span>
            </button>
          </motion.div>
        )}
        
        {/* User role badge and logout button */}
        <div className="flex items-center gap-2">          
          <motion.div 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
          > 
            <button
              onClick={handleLogout}
              className="flex items-center bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}