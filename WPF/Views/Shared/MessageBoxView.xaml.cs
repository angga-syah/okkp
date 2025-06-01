using System.Windows.Controls;
using InvoiceApp.WPF.ViewModels;

namespace InvoiceApp.WPF.Views.Shared
{
    /// <summary>
    /// Custom Message Box View
    /// Features: Multiple message types, input dialogs, custom buttons, auto-dismiss
    /// </summary>
    public partial class MessageBoxView : UserControl
    {
        public MessageBoxView()
        {
            InitializeComponent();
        }

        public MessageBoxView(MessageBoxViewModel viewModel) : this()
        {
            DataContext = viewModel;
        }
    }
}