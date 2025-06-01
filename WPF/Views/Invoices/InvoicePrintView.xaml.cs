using System.Windows.Controls;
using InvoiceApp.WPF.ViewModels;

namespace InvoiceApp.WPF.Views.Invoices
{
    /// <summary>
    /// Invoice Print Preview and Print Management View
    /// Features: Print preview, page setup, printer selection, print options
    /// </summary>
    public partial class InvoicePrintView : UserControl
    {
        public InvoicePrintView()
        {
            InitializeComponent();
        }

        public InvoicePrintView(InvoicePrintViewModel viewModel) : this()
        {
            DataContext = viewModel;
        }
    }
}