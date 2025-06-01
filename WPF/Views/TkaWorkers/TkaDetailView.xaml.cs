using System.Windows.Controls;
using InvoiceApp.WPF.ViewModels;

namespace InvoiceApp.WPF.Views.TkaWorkers
{
    /// <summary>
    /// TKA Worker Detail View
    /// Features: Comprehensive worker profile, performance analytics, company assignments, family management
    /// </summary>
    public partial class TkaDetailView : UserControl
    {
        public TkaDetailView()
        {
            InitializeComponent();
        }

        public TkaDetailView(TkaDetailViewModel viewModel) : this()
        {
            DataContext = viewModel;
        }
    }
}