using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Threading;
using InvoiceApp.WPF.ViewModels;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.WPF.Views.Companies
{
    public partial class CompanyListView : UserControl
    {
        private DispatcherTimer _searchDelayTimer;

        public CompanyListView()
        {
            InitializeComponent();
            
            // Set the DataContext using DI container
            DataContext = App.ServiceProvider.GetRequiredService<CompanyListViewModel>();
            
            // Initialize event handlers
            Loaded += CompanyListView_Loaded;
            Unloaded += CompanyListView_Unloaded;
            
            // Set up search delay timer
            SetupSearchDelayTimer();
        }

        private async void CompanyListView_Loaded(object sender, RoutedEventArgs e)
        {
            if (DataContext is CompanyListViewModel viewModel)
            {
                // Load initial data when view is loaded
                if (viewModel.LoadDataCommand.CanExecute(null))
                {
                    await ((AsyncRelayCommand)viewModel.LoadDataCommand).ExecuteAsync(null);
                }
            }
        }

        private void CompanyListView_Unloaded(object sender, RoutedEventArgs e)
        {
            // Stop search timer
            _searchDelayTimer?.Stop();
            
            // Cleanup when view is unloaded
            if (DataContext is IDisposable disposableViewModel)
            {
                disposableViewModel.Dispose();
            }
        }

        private void SetupSearchDelayTimer()
        {
            // Delay search execution to avoid too many API calls while typing
            _searchDelayTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromMilliseconds(300)
            };
            
            _searchDelayTimer.Tick += async (s, e) =>
            {
                _searchDelayTimer.Stop();
                
                if (DataContext is CompanyListViewModel viewModel &&
                    viewModel.ApplyFiltersCommand.CanExecute(null))
                {
                    await ((AsyncRelayCommand)viewModel.ApplyFiltersCommand).ExecuteAsync(null);
                }
            };
        }

        // Handle keyboard shortcuts
        private void OnKeyDown(object sender, KeyEventArgs e)
        {
            if (DataContext is CompanyListViewModel viewModel)
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
                        // Ctrl+N to add new company
                        if (viewModel.AddCompanyCommand.CanExecute(null))
                        {
                            viewModel.AddCompanyCommand.Execute(null);
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
                        
                    case Key.I when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+I to import
                        if (viewModel.ImportCommand.CanExecute(null))
                        {
                            viewModel.ImportCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.V when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+V to toggle view mode
                        if (viewModel.ToggleViewModeCommand.CanExecute(null))
                        {
                            viewModel.ToggleViewModeCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.Delete:
                        // Delete selected company
                        if (viewModel.SelectedCompany != null && 
                            viewModel.DeleteCompanyCommand.CanExecute(viewModel.SelectedCompany))
                        {
                            viewModel.DeleteCompanyCommand.Execute(viewModel.SelectedCompany);
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
            searchBox?.SelectAll();
        }

        // Handle search text changes with delay
        private void OnSearchTextChanged(object sender, TextChangedEventArgs e)
        {
            if (sender is TextBox textBox && DataContext is CompanyListViewModel viewModel)
            {
                // Reset the timer on each text change
                _searchDelayTimer.Stop();
                _searchDelayTimer.Start();
            }
        }

        // Handle view mode toggle
        private void OnViewModeToggle(object sender, RoutedEventArgs e)
        {
            if (DataContext is CompanyListViewModel viewModel && sender is ToggleButton toggleButton)
            {
                // Animate the transition
                AnimateViewModeChange(toggleButton.IsChecked == true);
                
                // Execute the command
                if (viewModel.ToggleViewModeCommand.CanExecute(null))
                {
                    viewModel.ToggleViewModeCommand.Execute(null);
                }
            }
        }

        private void AnimateViewModeChange(bool toCardView)
        {
            // Find the content containers
            var cardView = FindName("CardViewContainer") as ScrollViewer;
            var listView = FindName("ListViewContainer") as ScrollViewer;
            
            if (cardView != null && listView != null)
            {
                // Create fade transition
                var duration = TimeSpan.FromMilliseconds(200);
                
                var fadeOut = new System.Windows.Media.Animation.DoubleAnimation(1, 0, duration);
                var fadeIn = new System.Windows.Media.Animation.DoubleAnimation(0, 1, duration);
                
                if (toCardView)
                {
                    listView.BeginAnimation(UIElement.OpacityProperty, fadeOut);
                    fadeOut.Completed += (s, e) =>
                    {
                        listView.Visibility = Visibility.Collapsed;
                        cardView.Visibility = Visibility.Visible;
                        cardView.BeginAnimation(UIElement.OpacityProperty, fadeIn);
                    };
                }
                else
                {
                    cardView.BeginAnimation(UIElement.OpacityProperty, fadeOut);
                    fadeOut.Completed += (s, e) =>
                    {
                        cardView.Visibility = Visibility.Collapsed;
                        listView.Visibility = Visibility.Visible;
                        listView.BeginAnimation(UIElement.OpacityProperty, fadeIn);
                    };
                }
            }
        }

        // Handle company card double-click
        private void OnCompanyCardDoubleClick(object sender, MouseButtonEventArgs e)
        {
            if (sender is FrameworkElement element && 
                element.DataContext != null && 
                DataContext is CompanyListViewModel viewModel)
            {
                if (viewModel.ViewCompanyCommand.CanExecute(element.DataContext))
                {
                    viewModel.ViewCompanyCommand.Execute(element.DataContext);
                }
            }
        }

        // Handle company selection
        private void OnCompanySelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (DataContext is CompanyListViewModel viewModel)
            {
                // Update the selected company in the view model
                // This is usually handled by binding, but can be used for additional logic
                if (e.AddedItems.Count > 0)
                {
                    viewModel.SelectedCompany = e.AddedItems[0] as CompanyDto;
                }
            }
        }

        // Handle context menu opening
        private void OnContextMenuOpening(object sender, ContextMenuEventArgs e)
        {
            if (sender is FrameworkElement element && 
                element.DataContext != null && 
                DataContext is CompanyListViewModel viewModel)
            {
                // Set the selected company for context menu actions
                viewModel.SelectedCompany = element.DataContext as CompanyDto;
                
                // Update context menu item states based on company status
                UpdateContextMenuItems(element.ContextMenu, viewModel.SelectedCompany);
            }
        }

        private void UpdateContextMenuItems(ContextMenu contextMenu, CompanyDto company)
        {
            if (contextMenu == null || company == null) return;
            
            foreach (var item in contextMenu.Items)
            {
                if (item is MenuItem menuItem)
                {
                    switch (menuItem.Header?.ToString())
                    {
                        case "Edit":
                            menuItem.IsEnabled = company.CanEdit;
                            break;
                        case "Delete":
                            menuItem.IsEnabled = company.CanDelete;
                            break;
                        case "Create Invoice":
                            menuItem.IsEnabled = company.IsActive && company.TkaWorkerCount > 0;
                            break;
                        case "Activate":
                            menuItem.IsEnabled = !company.IsActive;
                            menuItem.Visibility = company.IsActive ? Visibility.Collapsed : Visibility.Visible;
                            break;
                        case "Deactivate":
                            menuItem.IsEnabled = company.IsActive;
                            menuItem.Visibility = !company.IsActive ? Visibility.Collapsed : Visibility.Visible;
                            break;
                    }
                }
            }
        }

        // Handle pagination
        private void OnPageSizeChanged(object sender, SelectionChangedEventArgs e)
        {
            if (DataContext is CompanyListViewModel viewModel && sender is ComboBox comboBox)
            {
                if (int.TryParse(comboBox.SelectedItem?.ToString(), out var pageSize))
                {
                    viewModel.PageSize = pageSize;
                    
                    // Refresh data with new page size
                    if (viewModel.ApplyFiltersCommand.CanExecute(null))
                    {
                        viewModel.ApplyFiltersCommand.Execute(null);
                    }
                }
            }
        }

        // Handle filter changes
        private void OnFilterChanged(object sender, SelectionChangedEventArgs e)
        {
            if (DataContext is CompanyListViewModel viewModel)
            {
                // Apply filters with delay to avoid too many requests
                _searchDelayTimer.Stop();
                _searchDelayTimer.Start();
            }
        }

        // Handle export button with file dialog
        private async void OnExportButtonClick(object sender, RoutedEventArgs e)
        {
            if (DataContext is CompanyListViewModel viewModel && sender is Button button)
            {
                var saveFileDialog = new Microsoft.Win32.SaveFileDialog
                {
                    Title = "Export Companies",
                    Filter = "Excel Files (*.xlsx)|*.xlsx|CSV Files (*.csv)|*.csv|PDF Files (*.pdf)|*.pdf",
                    FileName = $"Companies_{DateTime.Now:yyyyMMdd_HHmmss}"
                };

                if (saveFileDialog.ShowDialog() == true)
                {
                    button.IsEnabled = false;
                    
                    try
                    {
                        var exportPath = saveFileDialog.FileName;
                        await viewModel.ExportToFileAsync(exportPath);
                    }
                    finally
                    {
                        button.IsEnabled = true;
                    }
                }
            }
        }

        // Handle import button with file dialog
        private async void OnImportButtonClick(object sender, RoutedEventArgs e)
        {
            if (DataContext is CompanyListViewModel viewModel && sender is Button button)
            {
                var openFileDialog = new Microsoft.Win32.OpenFileDialog
                {
                    Title = "Import Companies",
                    Filter = "Excel Files (*.xlsx;*.xls)|*.xlsx;*.xls|CSV Files (*.csv)|*.csv",
                    Multiselect = false
                };

                if (openFileDialog.ShowDialog() == true)
                {
                    button.IsEnabled = false;
                    
                    try
                    {
                        var importPath = openFileDialog.FileName;
                        await viewModel.ImportFromFileAsync(importPath);
                    }
                    finally
                    {
                        button.IsEnabled = true;
                    }
                }
            }
        }

        // Handle drag and drop for importing
        private void OnDragOver(object sender, DragEventArgs e)
        {
            // Check if the dragged data contains files
            if (e.Data.GetDataPresent(DataFormats.FileDrop))
            {
                var files = (string[])e.Data.GetData(DataFormats.FileDrop);
                
                // Check if any file has a valid extension
                var hasValidFile = false;
                foreach (var file in files)
                {
                    var extension = System.IO.Path.GetExtension(file).ToLowerInvariant();
                    if (extension == ".xlsx" || extension == ".xls" || extension == ".csv")
                    {
                        hasValidFile = true;
                        break;
                    }
                }
                
                e.Effects = hasValidFile ? DragDropEffects.Copy : DragDropEffects.None;
            }
            else
            {
                e.Effects = DragDropEffects.None;
            }
            
            e.Handled = true;
        }

        private async void OnDrop(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(DataFormats.FileDrop) && DataContext is CompanyListViewModel viewModel)
            {
                var files = (string[])e.Data.GetData(DataFormats.FileDrop);
                
                foreach (var file in files)
                {
                    var extension = System.IO.Path.GetExtension(file).ToLowerInvariant();
                    if (extension == ".xlsx" || extension == ".xls" || extension == ".csv")
                    {
                        await viewModel.ImportFromFileAsync(file);
                        break; // Import only the first valid file
                    }
                }
            }
        }

        // Handle scroll for virtual scrolling
        private void OnScrollChanged(object sender, ScrollChangedEventArgs e)
        {
            if (sender is ScrollViewer scrollViewer && 
                DataContext is CompanyListViewModel viewModel)
            {
                // Check if we're near the bottom for potential lazy loading
                var isNearBottom = scrollViewer.VerticalOffset >= scrollViewer.ScrollableHeight - 100;
                
                if (isNearBottom && !viewModel.IsLoading && viewModel.CanLoadMore)
                {
                    // Load more data
                    viewModel.LoadMoreCommand?.Execute(null);
                }
            }
        }

        // Handle refresh with visual feedback
        private async void OnRefreshButtonClick(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && DataContext is CompanyListViewModel viewModel)
            {
                // Add rotation animation to refresh button
                AnimateRefreshButton(button);
                
                button.IsEnabled = false;
                
                try
                {
                    if (viewModel.RefreshCommand.CanExecute(null))
                    {
                        await ((AsyncRelayCommand)viewModel.RefreshCommand).ExecuteAsync(null);
                    }
                }
                finally
                {
                    button.IsEnabled = true;
                }
            }
        }

        private void AnimateRefreshButton(Button button)
        {
            var rotateTransform = new System.Windows.Media.RotateTransform();
            button.RenderTransform = rotateTransform;
            button.RenderTransformOrigin = new Point(0.5, 0.5);

            var animation = new System.Windows.Media.Animation.DoubleAnimation(0, 360, TimeSpan.FromMilliseconds(500));
            rotateTransform.BeginAnimation(System.Windows.Media.RotateTransform.AngleProperty, animation);
        }

        // Handle window resize for responsive layout
        private void OnSizeChanged(object sender, SizeChangedEventArgs e)
        {
            if (DataContext is CompanyListViewModel viewModel)
            {
                var width = e.NewSize.Width;
                
                // Adjust card width based on available space
                var cardContainer = FindName("CardViewContainer") as ItemsControl;
                if (cardContainer != null)
                {
                    var itemsPanel = cardContainer.ItemsPanel.LoadContent() as WrapPanel;
                    if (itemsPanel != null)
                    {
                        // Calculate optimal card width
                        var cardWidth = Math.Max(280, (width - 60) / Math.Floor(width / 320));
                        itemsPanel.ItemWidth = cardWidth;
                    }
                }
                
                // Update view model with new dimensions
                viewModel.ViewportWidth = width;
            }
        }

        // Handle status filter quick buttons
        private void OnStatusFilterClick(object sender, RoutedEventArgs e)
        {
            if (sender is ToggleButton toggleButton && 
                DataContext is CompanyListViewModel viewModel)
            {
                var status = toggleButton.Tag?.ToString();
                
                if (toggleButton.IsChecked == true)
                {
                    viewModel.SelectedStatus = status;
                }
                else
                {
                    viewModel.SelectedStatus = null;
                }
                
                // Apply filters
                if (viewModel.ApplyFiltersCommand.CanExecute(null))
                {
                    viewModel.ApplyFiltersCommand.Execute(null);
                }
            }
        }
    }
}