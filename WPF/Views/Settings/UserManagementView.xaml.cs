using System.Windows.Controls;
using InvoiceApp.WPF.ViewModels;

namespace InvoiceApp.WPF.Views.Settings
{
    /// <summary>
    /// User Management View
    /// Features: User CRUD operations, role management, permission settings
    /// </summary>
    public partial class UserManagementView : UserControl
    {
        public UserManagementView()
        {
            InitializeComponent();
        }

        public UserManagementView(UserManagementViewModel viewModel) : this()
        {
            DataContext = viewModel;
        }
    }
}