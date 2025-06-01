using System.Windows.Controls;
using InvoiceApp.WPF.ViewModels;

namespace InvoiceApp.WPF.Views.Settings
{
    /// <summary>
    /// Main Settings Dashboard View
    /// Features: Settings navigation, system status, quick settings, import/export
    /// </summary>
    public partial class SettingsView : UserControl
    {
        public SettingsView()
        {
            InitializeComponent();
        }

        public SettingsView(SettingsViewModel viewModel) : this()
        {
            DataContext = viewModel;
        }
    }
}