import { useState, useEffect } from "react";

type ColumnSettings = {
  number: boolean;
  id: boolean;
  date: boolean;
  customer: boolean;
  service: boolean;
  status: boolean;
  note: boolean;
  invoice: boolean;
  result: boolean;
  actions: boolean;
};

interface ColumnSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibleColumns: ColumnSettings;
  toggleColumnVisibility: (columnKey: string) => void;
  updateMultipleColumns?: (columnsSettings: ColumnSettings) => void;
}

export default function ColumnSettingsModal({ 
  isOpen, 
  onClose,
  visibleColumns,
  toggleColumnVisibility,
  updateMultipleColumns
}: ColumnSettingsModalProps) {
  // Change type from Record<string, boolean> to ColumnSettings
  const [tempSettings, setTempSettings] = useState<ColumnSettings>({
    number: false,
    id: false,
    date: false,
    customer: false,
    service: false,
    status: false,
    note: false,
    invoice: false,
    result: false,
    actions: false
  });
  
  // Reset tempSettings when the modal opens
  useEffect(() => {
    if (isOpen) {
      setTempSettings({...visibleColumns});
    }
  }, [isOpen, visibleColumns]);

  const handleToggle = (columnKey: keyof ColumnSettings) => {
    setTempSettings(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };
  
  const handleSelectAll = (selected: boolean) => {
    const updatedSettings: ColumnSettings = {
      number: selected,
      id: selected,
      date: selected,
      customer: selected,
      service: selected,
      status: selected,
      note: selected,
      invoice: selected,
      result: selected,
      actions: selected
    };
    setTempSettings(updatedSettings);
  };

  const areAllSelected = () => {
    return Object.values(tempSettings).every(value => value === true);
  };
  
  const saveSettings = () => {
    // Cek apakah ada perubahan yang perlu dilakukan
    let hasChanges = false;
    for (const key in tempSettings) {
      if (tempSettings[key as keyof ColumnSettings] !== visibleColumns[key as keyof ColumnSettings]) {
        hasChanges = true;
        break;
      }
    }
    
    if (hasChanges) {
      if (updateMultipleColumns) {
        // Jika prop updateMultipleColumns tersedia, gunakan untuk memperbarui semua kolom sekaligus
        updateMultipleColumns(tempSettings);
      } else {
        // Fallback ke metode asli, memperbarui satu per satu
        // Hitung perubahan yang akan dilakukan
        const columnsToToggle: Array<keyof ColumnSettings> = [];
        
        // Identifikasi kolom yang perlu diubah
        for (const key in tempSettings) {
          const typedKey = key as keyof ColumnSettings;
          if (tempSettings[typedKey] !== visibleColumns[typedKey]) {
            columnsToToggle.push(typedKey);
          }
        }
        
        // Aplikasikan semua perubahan
        columnsToToggle.forEach(key => {
          toggleColumnVisibility(key);
        });
      }
    }
    
    // Tutup modal setelah perubahan diaplikasikan
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
        <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
          Pengaturan Kolom
        </h3>
        
        {/* Select All Option */}
        <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 mb-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 font-bold">
            {areAllSelected() ? "Batal Pilih Semua" : "Pilih Semua"}
          </label>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={areAllSelected()}
              onChange={() => handleSelectAll(!areAllSelected())}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
          </div>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              No.
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={tempSettings.number}
                onChange={() => handleToggle('number')}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              ID Pesanan
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={tempSettings.id}
                onChange={() => handleToggle('id')}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tanggal
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={tempSettings.date}
                onChange={() => handleToggle('date')}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pelanggan
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={tempSettings.customer}
                onChange={() => handleToggle('customer')}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Layanan
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={tempSettings.service}
                onChange={() => handleToggle('service')}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={tempSettings.status}
                onChange={() => handleToggle('status')}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Catatan
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={tempSettings.note}
                onChange={() => handleToggle('note')}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Invoice
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={tempSettings.invoice}
                onChange={() => handleToggle('invoice')}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Hasil Layanan
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={tempSettings.result}
                onChange={() => handleToggle('result')}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Aksi
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={tempSettings.actions}
                onChange={() => handleToggle('actions')}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded text-sm"
          >
            Batal
          </button>
          <button
            onClick={saveSettings}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}