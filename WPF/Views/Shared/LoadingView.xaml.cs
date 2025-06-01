using System.Windows.Controls;
using InvoiceApp.WPF.ViewModels;

namespace InvoiceApp.WPF.Views.Shared
{
    /// <summary>
    /// Loading Overlay View
    /// Features: Multiple loading animation styles, progress tracking, cancellation
    /// </summary>
    public partial class LoadingView : UserControl
    {
        public LoadingView()
        {
            InitializeComponent();
        }

        public LoadingView(LoadingViewModel viewModel) : this()
        {
            DataContext = viewModel;
        }
    }
}