using System.Windows.Controls;
using InvoiceApp.WPF.ViewModels;

namespace InvoiceApp.WPF.Views.Reports
{
    /// <summary>
    /// Export Management View
    /// Features: Export invoices to PDF/Excel/CSV, batch export, filtering
    /// </summary>
    public partial class ExportView : UserControl
    {
        public ExportView()
        {
            InitializeComponent();
        }

        public ExportView(ExportViewModel viewModel) : this()
        {
            DataContext = viewModel;
        }
    }
}