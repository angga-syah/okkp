using System.Windows.Controls;
using InvoiceApp.WPF.ViewModels;

namespace InvoiceApp.WPF.Views.Reports
{
    /// <summary>
    /// Main Reports Dashboard View
    /// Features: Report categories, quick stats, navigation to detailed reports
    /// </summary>
    public partial class ReportsView : UserControl
    {
        public ReportsView()
        {
            InitializeComponent();
        }

        public ReportsView(ReportsViewModel viewModel) : this()
        {
            DataContext = viewModel;
        }
    }
}