using System.Windows.Controls;
using InvoiceApp.WPF.ViewModels;

namespace InvoiceApp.WPF.Views.Settings
{
    /// <summary>
    /// Bank Account Management View
    /// Features: Add/edit/delete bank accounts, set default, manage payment info
    /// </summary>
    public partial class BankAccountsView : UserControl
    {
        public BankAccountsView()
        {
            InitializeComponent();
        }

        public BankAccountsView(BankAccountsViewModel viewModel) : this()
        {
            DataContext = viewModel;
        }
    }
}