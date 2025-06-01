using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Threading;
using InvoiceApp.WPF.ViewModels;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.WPF.Views.Dashboard
{
    public partial class DashboardView : UserControl
    {
        private DispatcherTimer _refreshTimer;

        public DashboardView()
        {
            InitializeComponent();
            
            // Set the DataContext using DI container
            DataContext = App.ServiceProvider.GetRequiredService<DashboardViewModel>();
            
            // Initialize event handlers
            Loaded += DashboardView_Loaded;
            Unloaded += DashboardView_Unloaded;
            
            // Set up auto-refresh timer
            SetupAutoRefresh();
        }

        private async void DashboardView_Loaded(object sender, RoutedEventArgs e)
        {
            if (DataContext is DashboardViewModel viewModel)
            {
                // Load initial dashboard data
                if (viewModel.LoadDataCommand.CanExecute(null))
                {
                    await ((AsyncRelayCommand)viewModel.LoadDataCommand).ExecuteAsync(null);
                }
                
                // Start auto-refresh timer
                _refreshTimer?.Start();
            }
        }

        private void DashboardView_Unloaded(object sender, RoutedEventArgs e)
        {
            // Stop auto-refresh timer
            _refreshTimer?.Stop();
            
            // Cleanup when view is unloaded
            if (DataContext is IDisposable disposableViewModel)
            {
                disposableViewModel.Dispose();
            }
        }

        private void SetupAutoRefresh()
        {
            // Auto-refresh dashboard every 5 minutes
            _refreshTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromMinutes(5)
            };
            
            _refreshTimer.Tick += async (s, e) =>
            {
                if (DataContext is DashboardViewModel viewModel && 
                    !viewModel.IsLoading && 
                    viewModel.RefreshCommand.CanExecute(null))
                {
                    await ((AsyncRelayCommand)viewModel.RefreshCommand).ExecuteAsync(null);
                }
            };
        }

        // Handle keyboard shortcuts
        private void OnKeyDown(object sender, KeyEventArgs e)
        {
            if (DataContext is DashboardViewModel viewModel)
            {
                switch (e.Key)
                {
                    case Key.F5:
                        // Refresh dashboard
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
                        
                    case Key.C when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+C to add company
                        if (viewModel.AddCompanyCommand.CanExecute(null))
                        {
                            viewModel.AddCompanyCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.T when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+T to add TKA worker
                        if (viewModel.AddTkaWorkerCommand.CanExecute(null))
                        {
                            viewModel.AddTkaWorkerCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.I when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+I to import data
                        if (viewModel.ImportDataCommand.CanExecute(null))
                        {
                            viewModel.ImportDataCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.R when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+R to generate reports
                        if (viewModel.GenerateReportsCommand.CanExecute(null))
                        {
                            viewModel.GenerateReportsCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                }
            }
        }

        // Handle stat card clicks for drill-down
        private void OnStatCardClick(object sender, MouseButtonEventArgs e)
        {
            if (sender is FrameworkElement element && 
                element.DataContext != null && 
                DataContext is DashboardViewModel viewModel)
            {
                if (viewModel.DrillDownCommand.CanExecute(element.DataContext))
                {
                    viewModel.DrillDownCommand.Execute(element.DataContext);
                }
            }
        }

        // Handle recent invoices DataGrid double-click
        private void OnRecentInvoicesDoubleClick(object sender, MouseButtonEventArgs e)
        {
            if (sender is DataGrid dataGrid && 
                dataGrid.SelectedItem != null && 
                DataContext is DashboardViewModel viewModel)
            {
                if (viewModel.ViewInvoiceCommand.CanExecute(dataGrid.SelectedItem))
                {
                    viewModel.ViewInvoiceCommand.Execute(dataGrid.SelectedItem);
                }
            }
        }

        // Handle chart interactions (if using a charting library)
        private void OnChartElementClick(object sender, EventArgs e)
        {
            if (DataContext is DashboardViewModel viewModel)
            {
                // Handle chart element clicks for drill-down functionality
                // This would depend on the specific charting library being used
                // For now, just refresh the related data
                if (viewModel.RefreshCommand.CanExecute(null))
                {
                    viewModel.RefreshCommand.Execute(null);
                }
            }
        }

        // Handle refresh button with visual feedback
        private async void OnRefreshButtonClick(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && DataContext is DashboardViewModel viewModel)
            {
                // Disable button temporarily
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
                    // Re-enable button
                    button.IsEnabled = true;
                }
            }
        }

        // Handle window focus to refresh data
        private void OnWindowGotFocus(object sender, RoutedEventArgs e)
        {
            if (DataContext is DashboardViewModel viewModel && 
                !viewModel.IsLoading)
            {
                // Check if data needs refresh (if it's been more than 2 minutes since last update)
                var timeSinceLastUpdate = DateTime.Now - viewModel.LastUpdated;
                if (timeSinceLastUpdate.TotalMinutes > 2)
                {
                    if (viewModel.RefreshCommand.CanExecute(null))
                    {
                        viewModel.RefreshCommand.Execute(null);
                    }
                }
            }
        }

        // Handle quick action button clicks with animations
        private void OnQuickActionClick(object sender, RoutedEventArgs e)
        {
            if (sender is Button button)
            {
                // Add a subtle click animation
                AnimateButtonClick(button);
            }
        }

        private void AnimateButtonClick(Button button)
        {
            // Simple scale animation for button feedback
            var scaleTransform = new System.Windows.Media.ScaleTransform(1, 1);
            button.RenderTransform = scaleTransform;
            button.RenderTransformOrigin = new Point(0.5, 0.5);

            var scaleDown = new System.Windows.Media.Animation.DoubleAnimation(1, 0.95, TimeSpan.FromMilliseconds(100));
            var scaleUp = new System.Windows.Media.Animation.DoubleAnimation(0.95, 1, TimeSpan.FromMilliseconds(100))
            {
                BeginTime = TimeSpan.FromMilliseconds(100)
            };

            scaleTransform.BeginAnimation(System.Windows.Media.ScaleTransform.ScaleXProperty, scaleDown);
            scaleTransform.BeginAnimation(System.Windows.Media.ScaleTransform.ScaleYProperty, scaleDown);
            
            scaleDown.Completed += (s, e) =>
            {
                scaleTransform.BeginAnimation(System.Windows.Media.ScaleTransform.ScaleXProperty, scaleUp);
                scaleTransform.BeginAnimation(System.Windows.Media.ScaleTransform.ScaleYProperty, scaleUp);
            };
        }

        // Handle scroll viewer for lazy loading if needed
        private void OnScrollViewerScrollChanged(object sender, ScrollChangedEventArgs e)
        {
            if (sender is ScrollViewer scrollViewer && 
                DataContext is DashboardViewModel viewModel)
            {
                // Check if we're near the bottom for potential lazy loading
                var isNearBottom = scrollViewer.VerticalOffset >= scrollViewer.ScrollableHeight - 100;
                
                if (isNearBottom && !viewModel.IsLoading)
                {
                    // Load more data if available
                    viewModel.LoadMoreDataCommand?.Execute(null);
                }
            }
        }

        // Handle theme changes
        public void OnThemeChanged()
        {
            // Refresh any theme-dependent resources
            if (DataContext is DashboardViewModel viewModel)
            {
                // Update chart colors or other theme-dependent elements
                viewModel.RefreshChartsCommand?.Execute(null);
            }
        }

        // Handle window resize for responsive layout
        private void OnSizeChanged(object sender, SizeChangedEventArgs e)
        {
            if (DataContext is DashboardViewModel viewModel)
            {
                // Adjust layout based on available space
                var width = e.NewSize.Width;
                
                // Update view model with new dimensions for responsive charts
                viewModel.ViewportWidth = width;
                viewModel.UpdateLayoutCommand?.Execute(width);
            }
        }

        // Handle error scenarios
        private void OnDataLoadError(object sender, EventArgs e)
        {
            // Show error notification
            if (DataContext is DashboardViewModel viewModel)
            {
                // The view model should handle error display
                // This is just for additional UI feedback if needed
            }
        }

        // Cleanup timer when control is disposed
        protected override void OnRenderSizeChanged(SizeChangedInfo sizeInfo)
        {
            base.OnRenderSizeChanged(sizeInfo);
            
            // Update responsive layout
            OnSizeChanged(this, new SizeChangedEventArgs(sizeInfo.PreviousSize, sizeInfo.NewSize));
        }
    }
}