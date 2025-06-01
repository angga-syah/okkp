using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using InvoiceApp.WPF.ViewModels;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.WPF.Views.Companies
{
    public partial class CompanyDetailView : UserControl
    {
        public CompanyDetailView()
        {
            InitializeComponent();
            
            // Set the DataContext using DI container
            DataContext = App.ServiceProvider.GetRequiredService<CompanyDetailViewModel>();
            
            // Initialize event handlers
            Loaded += CompanyDetailView_Loaded;
            Unloaded += CompanyDetailView_Unloaded;
        }

        private async void CompanyDetailView_Loaded(object sender, RoutedEventArgs e)
        {
            if (DataContext is CompanyDetailViewModel viewModel)
            {
                // Load initial data when view is loaded
                if (viewModel.LoadDataCommand.CanExecute(null))
                {
                    await ((AsyncRelayCommand)viewModel.LoadDataCommand).ExecuteAsync(null);
                }
            }
        }

        private void CompanyDetailView_Unloaded(object sender, RoutedEventArgs e)
        {
            // Cleanup when view is unloaded
            if (DataContext is IDisposable disposableViewModel)
            {
                disposableViewModel.Dispose();
            }
        }

        // Handle keyboard shortcuts
        private void OnKeyDown(object sender, KeyEventArgs e)
        {
            if (DataContext is CompanyDetailViewModel viewModel)
            {
                switch (e.Key)
                {
                    case Key.F5:
                        // Refresh data
                        if (viewModel.LoadDataCommand.CanExecute(null))
                        {
                            viewModel.LoadDataCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.E when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+E to edit
                        if (viewModel.EditCommand.CanExecute(null))
                        {
                            viewModel.EditCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.S when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+S to save (when editing)
                        if (viewModel.IsEditing && viewModel.SaveCommand.CanExecute(null))
                        {
                            viewModel.SaveCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.Escape:
                        // Escape to cancel editing
                        if (viewModel.IsEditing && viewModel.CancelCommand.CanExecute(null))
                        {
                            viewModel.CancelCommand.Execute(null);
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
                        
                    case Key.J when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+J to add job description
                        if (viewModel.AddJobDescriptionCommand.CanExecute(null))
                        {
                            viewModel.AddJobDescriptionCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.T when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+T to assign TKA worker
                        if (viewModel.AddTkaAssignmentCommand.CanExecute(null))
                        {
                            viewModel.AddTkaAssignmentCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                }
            }
        }

        // Handle tab selection changes
        private void OnTabSelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (sender is TabControl tabControl && DataContext is CompanyDetailViewModel viewModel)
            {
                var selectedIndex = tabControl.SelectedIndex;
                
                // Load data for the selected tab if needed
                switch (selectedIndex)
                {
                    case 0: // Company Details
                        // Already loaded
                        break;
                    case 1: // Job Descriptions
                        if (viewModel.LoadJobDescriptionsCommand?.CanExecute(null) == true)
                        {
                            viewModel.LoadJobDescriptionsCommand.Execute(null);
                        }
                        break;
                    case 2: // TKA Assignments
                        if (viewModel.LoadTkaAssignmentsCommand?.CanExecute(null) == true)
                        {
                            viewModel.LoadTkaAssignmentsCommand.Execute(null);
                        }
                        break;
                }
            }
        }

        // Handle DataGrid double-click for job descriptions
        private void OnJobDescriptionDoubleClick(object sender, MouseButtonEventArgs e)
        {
            if (sender is DataGrid dataGrid && 
                dataGrid.SelectedItem != null && 
                DataContext is CompanyDetailViewModel viewModel)
            {
                if (viewModel.EditJobDescriptionCommand.CanExecute(dataGrid.SelectedItem))
                {
                    viewModel.EditJobDescriptionCommand.Execute(dataGrid.SelectedItem);
                }
            }
        }

        // Handle DataGrid double-click for TKA assignments
        private void OnTkaAssignmentDoubleClick(object sender, MouseButtonEventArgs e)
        {
            if (sender is DataGrid dataGrid && 
                dataGrid.SelectedItem != null && 
                DataContext is CompanyDetailViewModel viewModel)
            {
                if (viewModel.ViewTkaDetailsCommand.CanExecute(dataGrid.SelectedItem))
                {
                    viewModel.ViewTkaDetailsCommand.Execute(dataGrid.SelectedItem);
                }
            }
        }

        // Handle edit mode changes
        private void OnEditModeChanged(object sender, RoutedEventArgs e)
        {
            if (DataContext is CompanyDetailViewModel viewModel)
            {
                if (viewModel.IsEditing)
                {
                    // Focus on the first editable field when entering edit mode
                    FocusFirstEditableField();
                }
            }
        }

        private void FocusFirstEditableField()
        {
            // Find the first TextBox that's enabled and focus it
            var companyNameTextBox = FindName("CompanyNameTextBox") as TextBox;
            companyNameTextBox?.Focus();
        }

        // Handle validation errors display
        private void OnValidationError(object sender, ValidationErrorEventArgs e)
        {
            if (DataContext is CompanyDetailViewModel viewModel)
            {
                if (e.Action == ValidationErrorEventAction.Added)
                {
                    // Add validation error to view model
                    viewModel.AddValidationError(e.Error.ErrorContent.ToString());
                }
                else
                {
                    // Remove validation error from view model
                    viewModel.RemoveValidationError(e.Error.ErrorContent.ToString());
                }
            }
        }

        // Handle job description drag and drop reordering
        private void OnJobDescriptionDragOver(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(typeof(JobDescriptionDto)))
            {
                e.Effects = DragDropEffects.Move;
            }
            else
            {
                e.Effects = DragDropEffects.None;
            }
            e.Handled = true;
        }

        private void OnJobDescriptionDrop(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(typeof(JobDescriptionDto)) && 
                DataContext is CompanyDetailViewModel viewModel)
            {
                var draggedJob = e.Data.GetData(typeof(JobDescriptionDto)) as JobDescriptionDto;
                var targetRow = GetDataGridRowFromPoint(sender as DataGrid, e.GetPosition(sender as DataGrid));
                
                if (draggedJob != null && targetRow != null && targetRow.DataContext is JobDescriptionDto targetJob)
                {
                    // Reorder job descriptions
                    viewModel.ReorderJobDescriptions(draggedJob, targetJob);
                }
            }
        }

        private DataGridRow GetDataGridRowFromPoint(DataGrid dataGrid, Point point)
        {
            var hitTestResult = VisualTreeHelper.HitTest(dataGrid, point);
            var visualHit = hitTestResult?.VisualHit;
            
            while (visualHit != null)
            {
                if (visualHit is DataGridRow row)
                    return row;
                
                visualHit = VisualTreeHelper.GetParent(visualHit);
            }
            
            return null;
        }

        // Handle context menu for job descriptions
        private void OnJobDescriptionContextMenuOpening(object sender, ContextMenuEventArgs e)
        {
            if (sender is DataGrid dataGrid && 
                dataGrid.SelectedItem is JobDescriptionDto selectedJob &&
                DataContext is CompanyDetailViewModel viewModel)
            {
                // Create context menu dynamically based on job status
                var contextMenu = new ContextMenu();
                
                var editMenuItem = new MenuItem
                {
                    Header = "Edit",
                    Command = viewModel.EditJobDescriptionCommand,
                    CommandParameter = selectedJob
                };
                editMenuItem.Icon = new MaterialDesignThemes.Wpf.PackIcon { Kind = MaterialDesignThemes.Wpf.PackIconKind.Edit };
                contextMenu.Items.Add(editMenuItem);
                
                var duplicateMenuItem = new MenuItem
                {
                    Header = "Duplicate",
                    Command = viewModel.DuplicateJobCommand,
                    CommandParameter = selectedJob
                };
                duplicateMenuItem.Icon = new MaterialDesignThemes.Wpf.PackIcon { Kind = MaterialDesignThemes.Wpf.PackIconKind.ContentCopy };
                contextMenu.Items.Add(duplicateMenuItem);
                
                contextMenu.Items.Add(new Separator());
                
                var moveUpMenuItem = new MenuItem
                {
                    Header = "Move Up",
                    Command = viewModel.MoveJobUpCommand,
                    CommandParameter = selectedJob
                };
                moveUpMenuItem.Icon = new MaterialDesignThemes.Wpf.PackIcon { Kind = MaterialDesignThemes.Wpf.PackIconKind.ArrowUp };
                contextMenu.Items.Add(moveUpMenuItem);
                
                var moveDownMenuItem = new MenuItem
                {
                    Header = "Move Down",
                    Command = viewModel.MoveJobDownCommand,
                    CommandParameter = selectedJob
                };
                moveDownMenuItem.Icon = new MaterialDesignThemes.Wpf.PackIcon { Kind = MaterialDesignThemes.Wpf.PackIconKind.ArrowDown };
                contextMenu.Items.Add(moveDownMenuItem);
                
                contextMenu.Items.Add(new Separator());
                
                var deleteMenuItem = new MenuItem
                {
                    Header = "Delete",
                    Command = viewModel.DeleteJobDescriptionCommand,
                    CommandParameter = selectedJob
                };
                deleteMenuItem.Icon = new MaterialDesignThemes.Wpf.PackIcon { Kind = MaterialDesignThemes.Wpf.PackIconKind.Delete };
                contextMenu.Items.Add(deleteMenuItem);
                
                dataGrid.ContextMenu = contextMenu;
            }
        }

        // Handle context menu for TKA assignments
        private void OnTkaAssignmentContextMenuOpening(object sender, ContextMenuEventArgs e)
        {
            if (sender is DataGrid dataGrid && 
                dataGrid.SelectedItem is CompanyTkaAssignmentDto selectedAssignment &&
                DataContext is CompanyDetailViewModel viewModel)
            {
                var contextMenu = new ContextMenu();
                
                var viewDetailsMenuItem = new MenuItem
                {
                    Header = "View TKA Details",
                    Command = viewModel.ViewTkaDetailsCommand,
                    CommandParameter = selectedAssignment
                };
                viewDetailsMenuItem.Icon = new MaterialDesignThemes.Wpf.PackIcon { Kind = MaterialDesignThemes.Wpf.PackIconKind.Eye };
                contextMenu.Items.Add(viewDetailsMenuItem);
                
                var editAssignmentMenuItem = new MenuItem
                {
                    Header = "Edit Assignment",
                    Command = viewModel.EditTkaAssignmentCommand,
                    CommandParameter = selectedAssignment
                };
                editAssignmentMenuItem.Icon = new MaterialDesignThemes.Wpf.PackIcon { Kind = MaterialDesignThemes.Wpf.PackIconKind.Edit };
                contextMenu.Items.Add(editAssignmentMenuItem);
                
                contextMenu.Items.Add(new Separator());
                
                var createInvoiceMenuItem = new MenuItem
                {
                    Header = "Create Invoice for TKA",
                    Command = viewModel.CreateInvoiceForTkaCommand,
                    CommandParameter = selectedAssignment
                };
                createInvoiceMenuItem.Icon = new MaterialDesignThemes.Wpf.PackIcon { Kind = MaterialDesignThemes.Wpf.PackIconKind.Plus };
                contextMenu.Items.Add(createInvoiceMenuItem);
                
                contextMenu.Items.Add(new Separator());
                
                var removeAssignmentMenuItem = new MenuItem
                {
                    Header = "Remove Assignment",
                    Command = viewModel.RemoveTkaAssignmentCommand,
                    CommandParameter = selectedAssignment
                };
                removeAssignmentMenuItem.Icon = new MaterialDesignThemes.Wpf.PackIcon { Kind = MaterialDesignThemes.Wpf.PackIconKind.AccountMinus };
                contextMenu.Items.Add(removeAssignmentMenuItem);
                
                dataGrid.ContextMenu = contextMenu;
            }
        }

        // Handle quick action buttons with animations
        private void OnQuickActionClick(object sender, RoutedEventArgs e)
        {
            if (sender is Button button)
            {
                AnimateButtonClick(button);
            }
        }

        private void AnimateButtonClick(Button button)
        {
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

        // Handle window closing validation
        private void OnClosing(object sender, System.ComponentModel.CancelEventArgs e)
        {
            if (DataContext is CompanyDetailViewModel viewModel && viewModel.IsEditing && viewModel.HasUnsavedChanges)
            {
                var result = MessageBox.Show(
                    "You have unsaved changes. Do you want to save before closing?",
                    "Unsaved Changes",
                    MessageBoxButton.YesNoCancel,
                    MessageBoxImage.Question);

                switch (result)
                {
                    case MessageBoxResult.Yes:
                        if (viewModel.SaveCommand.CanExecute(null))
                        {
                            viewModel.SaveCommand.Execute(null);
                        }
                        break;
                    case MessageBoxResult.Cancel:
                        e.Cancel = true;
                        break;
                    // No - continue closing without saving
                }
            }
        }

        // Handle search functionality for tabs
        private void OnTabSearchTextChanged(object sender, TextChangedEventArgs e)
        {
            if (sender is TextBox searchBox && DataContext is CompanyDetailViewModel viewModel)
            {
                var searchTerm = searchBox.Text;
                
                // Determine which tab is active and apply search
                if (searchBox.Name?.Contains("Job") == true)
                {
                    viewModel.JobSearchTerm = searchTerm;
                }
                else if (searchBox.Name?.Contains("Tka") == true)
                {
                    viewModel.TkaSearchTerm = searchTerm;
                }
            }
        }

        // Handle export functionality
        private async void OnExportButtonClick(object sender, RoutedEventArgs e)
        {
            if (DataContext is CompanyDetailViewModel viewModel && sender is Button button)
            {
                var saveFileDialog = new Microsoft.Win32.SaveFileDialog
                {
                    Title = "Export Company Data",
                    Filter = "Excel Files (*.xlsx)|*.xlsx|PDF Files (*.pdf)|*.pdf",
                    FileName = $"Company_{viewModel.Company.CompanyName}_{DateTime.Now:yyyyMMdd}"
                };

                if (saveFileDialog.ShowDialog() == true)
                {
                    button.IsEnabled = false;
                    
                    try
                    {
                        var exportPath = saveFileDialog.FileName;
                        await viewModel.ExportCompanyDataAsync(exportPath);
                    }
                    finally
                    {
                        button.IsEnabled = true;
                    }
                }
            }
        }
    }
}