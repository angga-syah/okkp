using System.Windows.Controls;
using InvoiceApp.WPF.ViewModels;

namespace InvoiceApp.WPF.Views.TkaWorkers
{
    /// <summary>
    /// Family Member Management View
    /// Features: Manage TKA worker family members, relationships, CRUD operations
    /// </summary>
    public partial class FamilyMemberView : UserControl
    {
        public FamilyMemberView()
        {
            InitializeComponent();
        }

        public FamilyMemberView(FamilyMemberViewModel viewModel) : this()
        {
            DataContext = viewModel;
        }
    }
}