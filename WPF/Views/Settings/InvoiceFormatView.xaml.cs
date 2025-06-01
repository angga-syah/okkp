using System.Windows.Controls;
using InvoiceApp.WPF.ViewModels;

namespace InvoiceApp.WPF.Views.Settings
{
    /// <summary>
    /// Invoice Format Customization View
    /// Features: Template selection, header/footer config, table customization
    /// </summary>
    public partial class InvoiceFormatView : UserControl
    {
        public InvoiceFormatView()
        {
            InitializeComponent();
        }

        public InvoiceFormatView(InvoiceFormatViewModel viewModel) : this()
        {
            DataContext = viewModel;
        }
    }
}