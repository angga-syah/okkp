// E:\kp\New folder\src\components\Wali\components\FiltersPanel.tsx
interface FiltersPanelProps {
    statusFilter: string;
    setStatusFilter: (status: string) => void;
    serviceFilter: string;
    setServiceFilter: (service: string) => void;
    dayFilter: string;
    setDayFilter: (day: string) => void;
    monthFilter: string;
    setMonthFilter: (month: string) => void;
    yearFilter: string;
    setYearFilter: (year: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    resetFilters: () => void;
    rowsPerPage: number;
    setRowsPerPage: (rows: number) => void;
    setCurrentPage: (page: number) => void;
  }
  
  export default function FiltersPanel({
    statusFilter,
    setStatusFilter,
    serviceFilter,
    setServiceFilter,
    dayFilter,
    setDayFilter,
    monthFilter,
    setMonthFilter,
    yearFilter,
    setYearFilter,
    searchQuery,
    setSearchQuery,
    resetFilters,
    rowsPerPage,
    setRowsPerPage,
    setCurrentPage
  }: FiltersPanelProps) {
    // Generate years for filter (last 5 years)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  
    // Generate months for filter
    const months = [
      { value: '01', label: 'Januari' },
      { value: '02', label: 'Februari' },
      { value: '03', label: 'Maret' },
      { value: '04', label: 'April' },
      { value: '05', label: 'Mei' },
      { value: '06', label: 'Juni' },
      { value: '07', label: 'Juli' },
      { value: '08', label: 'Agustus' },
      { value: '09', label: 'September' },
      { value: '10', label: 'Oktober' },
      { value: '11', label: 'November' },
      { value: '12', label: 'Desember' }
    ];
  
    // Generate days for filter
    const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  
    // Available service types
    const serviceTypes = [
      { value: 'all', label: 'Semua Layanan' },
      { value: 'E-Visa Business Single Entry', label: 'E-Visa Business Single Entry' },
      { value: 'E-Visa Business Multiple Entry', label: 'E-Visa Business Multiple Entry' }
    ];
  
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
          {/* Search bar */}
          <div className="relative w-full md:w-1/3 mb-2 md:mb-0">
            <input
              type="text"
              placeholder="Cari pesanan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 pl-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute left-2 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          {/* Reset filters button */}
          <button
            onClick={resetFilters}
            className="flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded text-sm w-full md:w-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset Filter
          </button>
        </div>
        
        {/* Filters grid - Responsive layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status filter */}
          <div className="relative">
            <label htmlFor="status-filter" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filter Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="all">Semua Status</option>
              <option value="pending_payment">Pending Payment</option>
              <option value="payment_verified">Payment Verified</option>
              <option value="document_verification">Document Verification</option>
              <option value="pending_document">Pending Document</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="payment_expired">Payment Expired</option>
            </select>
            <div className="absolute inset-y-0 right-0 top-5 flex items-center pr-2 pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          {/* Service filter */}
          <div className="relative">
            <label htmlFor="service-filter" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filter Layanan
            </label>
            <select
              id="service-filter"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              {serviceTypes.map(service => (
                <option key={service.value} value={service.value}>{service.label}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 top-5 flex items-center pr-2 pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          {/* Date filters */}
          <div className="relative">
            <label htmlFor="day-filter" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filter Tanggal
            </label>
            <div className="flex space-x-1">
              <select
                id="day-filter"
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
                className="w-1/3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tgl</option>
                {days.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              
              <select
                id="month-filter"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-1/3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Bln</option>
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
              
              <select
                id="year-filter"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-1/3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Thn</option>
                {years.map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
            </div>
          </div>
  
          {/* Rows per page selector */}
          <div className="relative">
            <label htmlFor="rows-filter" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Baris per Halaman
            </label>
            <select
              id="rows-filter"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1); // Reset to first page when changing rows per page
              }}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value={5}>5 baris</option>
              <option value={10}>10 baris</option>
              <option value={25}>25 baris</option>
              <option value={50}>50 baris</option>
              <option value={100}>100 baris</option>
            </select>
            <div className="absolute inset-y-0 right-0 top-5 flex items-center pr-2 pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }