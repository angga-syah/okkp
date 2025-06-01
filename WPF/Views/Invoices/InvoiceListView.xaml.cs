using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using InvoiceApp.WPF.ViewModels;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.WPF.Views.Invoices
{
    public partial class InvoiceListView : UserControl
    {
        public InvoiceListView()
        {
            InitializeComponent();
            
            // Set the DataContext using DI container
            DataContext = App.ServiceProvider.GetRequiredService<InvoiceListViewModel>();
            
            // Initialize event handlers
            Loaded += InvoiceListView_Loaded;
            Unloaded += InvoiceListView_Unloaded;
        }

        private async void InvoiceListView_Loaded(object sender, RoutedEventArgs e)
        {
            if (DataContext is InvoiceListViewModel viewModel)
            {
                // Load initial data when view is loaded
                if (viewModel.LoadDataCommand.CanExecute(null))
                {
                    await ((AsyncRelayCommand)viewModel.LoadDataCommand).ExecuteAsync(null);
                }
            }
        }

        private void InvoiceListView_Unloaded(object sender, RoutedEventArgs e)
        {
            // Cleanup when view is unloaded
            if (DataContext is IDisposable disposableViewModel)
            {
                disposableViewModel.Dispose();
            }
        }

        // Handle DataGrid double-click to view invoice details
        private void OnDataGridMouseDoubleClick(object sender, MouseButtonEventArgs e)
        {
            if (sender is DataGrid dataGrid && 
                dataGrid.SelectedItem != null && 
                DataContext is InvoiceListViewModel viewModel)
            {
                if (viewModel.ViewInvoiceCommand.CanExecute(dataGrid.SelectedItem))
                {
                    viewModel.ViewInvoiceCommand.Execute(dataGrid.SelectedItem);
                }
            }
        }

        // Handle keyboard shortcuts
        private void OnKeyDown(object sender, KeyEventArgs e)
        {
            if (DataContext is InvoiceListViewModel viewModel)
            {
                switch (e.Key)
                {
                    case Key.F5:
                        // Refresh data
                        if (viewModel.RefreshCommand.CanExecute(null))
                        {
                            viewModel.RefreshCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.N when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+N to create new invoice
                        if (viewModel.CreateInvoiceCommand.CanExecute(null))
                        {
                            viewModel.CreateInvoiceCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.F when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+F to focus search
                        FocusSearchBox();
                        e.Handled = true;
                        break;
                        
                    case Key.E when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+E to export
                        if (viewModel.ExportCommand.CanExecute(null))
                        {
                            viewModel.ExportCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.Delete:
                        // Delete selected invoice
                        if (viewModel.SelectedInvoice != null && 
                            viewModel.DeleteInvoiceCommand.CanExecute(viewModel.SelectedInvoice))
                        {
                            viewModel.DeleteInvoiceCommand.Execute(viewModel.SelectedInvoice);
                        }
                        e.Handled = true;
                        break;
                }
            }
        }

        private void FocusSearchBox()
        {
            // Find and focus the search TextBox
            var searchBox = FindName("SearchTextBox") as TextBox;
            searchBox?.Focus();
        }

        // Handle DataGrid selection changed
        private void OnDataGridSelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (DataContext is InvoiceListViewModel viewModel && sender is DataGrid dataGrid)
            {
                // Update bulk action availability based on selection
                viewModel.UpdateSelectionCommand?.Execute(dataGrid.SelectedItems);
            }
        }

        // Handle column sorting
        private void OnDataGridSorting(object sender, DataGridSortingEventArgs e)
        {
            if (DataContext is InvoiceListViewModel viewModel)
            {
                // Custom sorting logic if needed
                // This allows for server-side sorting for large datasets
                e.Handled = true;
                
                var sortDirection = e.Column.SortDirection != System.ComponentModel.ListSortDirection.Ascending 
                    ? System.ComponentModel.ListSortDirection.Ascending 
                    : System.ComponentModel.ListSortDirection.Descending;
                
                // Update the sort column and direction in the view model
                viewModel.SortColumn = e.Column.SortMemberPath;
                viewModel.SortDirection = sortDirection;
                
                // Refresh data with new sorting
                if (viewModel.ApplyFiltersCommand.CanExecute(null))
                {
                    viewModel.ApplyFiltersCommand.Execute(null);
                }
                
                // Update the column header to show sort direction
                e.Column.SortDirection = sortDirection;
            }
        }

        // Handle row details visibility toggle
        private void OnRowDetailsVisibilityChanged(object sender, DataGridRowDetailsEventArgs e)
        {
            // Animate row expansion if needed
            if (e.Row.DetailsVisibility == Visibility.Visible)
            {
                // Add expand animation
                AnimateRowExpansion(e.DetailsElement);
            }
        }

        private void AnimateRowExpansion(FrameworkElement detailsElement)
        {
            if (detailsElement != null)
            {
                // Simple fade-in animation for row details
                detailsElement.Opacity = 0;
                var fadeIn = new System.Windows.Media.Animation.DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(200));
                detailsElement.BeginAnimation(UIElement.OpacityProperty, fadeIn);
            }
        }

        // Handle filter expander state changes
        private void OnFilterExpanderStateChanged(object sender, RoutedEventArgs e)
        {
            if (DataContext is InvoiceListViewModel viewModel && sender is Expander expander)
            {
                // Save filter panel state to user preferences
                viewModel.SaveFilterPanelStateCommand?.Execute(expander.IsExpanded);
            }
        }

        // Handle bulk actions popup
        private void OnBulkActionsButtonClick(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && DataContext is InvoiceListViewModel viewModel)
            {
                // Show bulk actions menu/popup
                var contextMenu = new ContextMenu();
                
                // Add bulk action menu items
                var exportSelected = new MenuItem
                {
                    Header = "Export Selected",
                    Command = viewModel.ExportSelectedCommand
                };
                exportSelected.Icon = new MaterialDesignThemes.Wpf.PackIcon { Kind = MaterialDesignThemes.Wpf.PackIconKind.Export };
                contextMenu.Items.Add(exportSelected);
                
                var printSelected = new MenuItem
                {
                    Header = "Print Selected",
                    Command = viewModel.PrintSelectedCommand
                };
                printSelected.Icon = new MaterialDesignThemes.Wpf.PackIcon { Kind = MaterialDesignThemes.Wpf.PackIconKind.Printer };
                contextMenu.Items.Add(printSelected);
                
                contextMenu.Items.Add(new Separator());
                
                var deleteSelected = new MenuItem
                {
                    Header = "Delete Selected",
                    Command = viewModel.DeleteSelectedCommand
                };
                deleteSelected.Icon = new MaterialDesignThemes.Wpf.PackIcon { Kind = MaterialDesignThemes.Wpf.PackIconKind.Delete };
                contextMenu.Items.Add(deleteSelected);
                
                // Show the context menu
                button.ContextMenu = contextMenu;
                button.ContextMenu.IsOpen = true;
            }
        }
    }
}