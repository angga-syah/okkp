using System;
using System.Windows;
using System.Windows.Controls;
using InvoiceApp.WPF.ViewModels;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.WPF.Views.Invoices
{
    public partial class InvoiceCreateView : UserControl
    {
        public InvoiceCreateView()
        {
            InitializeComponent();
            
            // Set the DataContext using DI container
            DataContext = App.ServiceProvider.GetRequiredService<InvoiceCreateViewModel>();
            
            // Initialize any additional event handlers or setup
            Loaded += InvoiceCreateView_Loaded;
            Unloaded += InvoiceCreateView_Unloaded;
        }

        private async void InvoiceCreateView_Loaded(object sender, RoutedEventArgs e)
        {
            if (DataContext is InvoiceCreateViewModel viewModel)
            {
                // Load initial data when view is loaded
                if (viewModel.LoadDataCommand.CanExecute(null))
                {
                    await ((AsyncRelayCommand)viewModel.LoadDataCommand).ExecuteAsync(null);
                }
            }
        }

        private void InvoiceCreateView_Unloaded(object sender, RoutedEventArgs e)
        {
            // Cleanup when view is unloaded
            if (DataContext is IDisposable disposableViewModel)
            {
                disposableViewModel.Dispose();
            }
        }

        // Handle any custom events or interactions that can't be easily bound
        private void OnDataGridSelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            // Handle selection changes if needed
            if (sender is DataGrid dataGrid && DataContext is InvoiceCreateViewModel viewModel)
            {
                // Update selected line in view model if needed
                // This is already handled by binding, but can be used for additional logic
            }
        }

        // Handle drag and drop for reordering lines (if needed)
        private void OnDataGridPreviewMouseMove(object sender, System.Windows.Input.MouseEventArgs e)
        {
            // Implement drag and drop logic for reordering invoice lines if needed
        }

        // Handle keyboard shortcuts
        private void OnKeyDown(object sender, System.Windows.Input.KeyEventArgs e)
        {
            if (DataContext is InvoiceCreateViewModel viewModel)
            {
                switch (e.Key)
                {
                    case System.Windows.Input.Key.F5:
                        // Refresh data
                        if (viewModel.LoadDataCommand.CanExecute(null))
                        {
                            viewModel.LoadDataCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case System.Windows.Input.Key.F9:
                        // Quick preview
                        if (viewModel.PreviewCommand.CanExecute(null))
                        {
                            viewModel.PreviewCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case System.Windows.Input.Key.S when e.KeyboardDevice.Modifiers == System.Windows.Input.ModifierKeys.Control:
                        // Ctrl+S to save
                        if (viewModel.SaveDraftCommand.CanExecute(null))
                        {
                            viewModel.SaveDraftCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                }
            }
        }
    }
}