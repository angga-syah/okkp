using System.Windows.Controls;
using InvoiceApp.WPF.ViewModels;

namespace InvoiceApp.WPF.Views.Reports
{
    /// <summary>
    /// Invoice Report Analytics View
    /// Features: Revenue analysis, charts, company performance, TKA utilization
    /// </summary>
    public partial class InvoiceReportView : UserControl
    {
        public InvoiceReportView()
        {
            InitializeComponent();
        }

        public InvoiceReportView(InvoiceReportViewModel viewModel) : this()
        {
            DataContext = viewModel;
        }
    }
}