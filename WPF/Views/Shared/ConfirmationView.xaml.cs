using System.Windows.Controls;
using InvoiceApp.WPF.ViewModels;

namespace InvoiceApp.WPF.Views.Shared
{
    /// <summary>
    /// Confirmation Dialog View
    /// Features: Configurable confirmation dialogs with custom icons and actions
    /// </summary>
    public partial class ConfirmationView : UserControl
    {
        public ConfirmationView()
        {
            InitializeComponent();
        }

        public ConfirmationView(ConfirmationViewModel viewModel) : this()
        {
            DataContext = viewModel;
        }
    }
}