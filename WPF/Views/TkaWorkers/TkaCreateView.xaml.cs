using System.Windows.Controls;
using InvoiceApp.WPF.ViewModels;

namespace InvoiceApp.WPF.Views.TkaWorkers
{
    /// <summary>
    /// TKA Worker Creation/Edit View
    /// Features: Multi-step wizard, company assignments, photo upload, validation
    /// </summary>
    public partial class TkaCreateView : UserControl
    {
        public TkaCreateView()
        {
            InitializeComponent();
        }

        public TkaCreateView(TkaCreateViewModel viewModel) : this()
        {
            DataContext = viewModel;
        }
    }
}