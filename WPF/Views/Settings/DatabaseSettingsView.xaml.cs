using System.Windows.Controls;
using InvoiceApp.WPF.ViewModels;

namespace InvoiceApp.WPF.Views.Settings
{
    /// <summary>
    /// Database Configuration and Management View
    /// Features: Connection settings, performance tuning, backup/restore
    /// </summary>
    public partial class DatabaseSettingsView : UserControl
    {
        public DatabaseSettingsView()
        {
            InitializeComponent();
        }

        public DatabaseSettingsView(DatabaseSettingsViewModel viewModel) : this()
        {
            DataContext = viewModel;
        }
    }
}