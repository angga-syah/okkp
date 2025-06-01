using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using InvoiceApp.WPF.ViewModels;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.WPF.Views.Invoices
{
    public partial class InvoiceEditView : UserControl
    {
        public InvoiceEditView()
        {
            InitializeComponent();
            
            // Set the DataContext using DI container
            DataContext = App.ServiceProvider.GetRequiredService<InvoiceEditViewModel>();
            
            // Initialize event handlers
            Loaded += InvoiceEditView_Loaded;
            Unloaded += InvoiceEditView_Unloaded;
        }

        private async void InvoiceEditView_Loaded(object sender, RoutedEventArgs e)
        {
            if (DataContext is InvoiceEditViewModel viewModel)
            {
                // Load initial data when view is loaded
                if (viewModel.LoadDataCommand.CanExecute(null))
                {
                    await ((AsyncRelayCommand)viewModel.LoadDataCommand).ExecuteAsync(null);
                }
            }
        }

        private void InvoiceEditView_Unloaded(object sender, RoutedEventArgs e)
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
            if (DataContext is InvoiceEditViewModel viewModel)
            {
                switch (e.Key)
                {
                    case Key.F5:
                        // Refresh data
                        if (viewModel.RefreshDataCommand.CanExecute(null))
                        {
                            viewModel.RefreshDataCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.S when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+S to save
                        if (viewModel.SaveCommand.CanExecute(null))
                        {
                            viewModel.SaveCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.Z when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+Z to revert changes
                        if (viewModel.RevertChangesCommand.CanExecute(null))
                        {
                            viewModel.RevertChangesCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.P when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+P to print
                        if (viewModel.PrintCommand.CanExecute(null))
                        {
                            viewModel.PrintCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.F9:
                        // F9 for preview
                        if (viewModel.PreviewCommand.CanExecute(null))
                        {
                            viewModel.PreviewCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.Escape:
                        // Escape to cancel
                        if (viewModel.CancelCommand.CanExecute(null))
                        {
                            viewModel.CancelCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.N when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+N to add new line
                        if (viewModel.AddLineCommand.CanExecute(null))
                        {
                            viewModel.AddLineCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.Delete:
                        // Delete selected line
                        if (viewModel.SelectedLine != null && 
                            viewModel.DeleteLineCommand.CanExecute(viewModel.SelectedLine))
                        {
                            viewModel.DeleteLineCommand.Execute(viewModel.SelectedLine);
                        }
                        e.Handled = true;
                        break;
                }
            }
        }

        // Handle DataGrid double-click to edit lines
        private void OnDataGridMouseDoubleClick(object sender, MouseButtonEventArgs e)
        {
            if (sender is DataGrid dataGrid && 
                dataGrid.SelectedItem != null && 
                DataContext is InvoiceEditViewModel viewModel)
            {
                if (viewModel.EditLineCommand.CanExecute(dataGrid.SelectedItem))
                {
                    viewModel.EditLineCommand.Execute(dataGrid.SelectedItem);
                }
            }
        }

        // Handle line selection changes
        private void OnLineSelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (DataContext is InvoiceEditViewModel viewModel && sender is DataGrid dataGrid)
            {
                // Update selected line in view model
                if (e.AddedItems.Count > 0)
                {
                    viewModel.SelectedLine = e.AddedItems[0] as InvoiceLineDto;
                }
            }
        }

        // Handle drag and drop for line reordering
        private void OnLineDataGridPreviewMouseLeftButtonDown(object sender, MouseButtonEventArgs e)
        {
            if (sender is DataGrid dataGrid && DataContext is InvoiceEditViewModel viewModel)
            {
                var row = GetDataGridRowFromPoint(dataGrid, e.GetPosition(dataGrid));
                
                if (row != null && row.DataContext is InvoiceLineDto draggedLine)
                {
                    // Start drag operation
                    DragDrop.DoDragDrop(dataGrid, draggedLine, DragDropEffects.Move);
                }
            }
        }

        private void OnLineDataGridDragOver(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(typeof(InvoiceLineDto)))
            {
                e.Effects = DragDropEffects.Move;
            }
            else
            {
                e.Effects = DragDropEffects.None;
            }
            e.Handled = true;
        }

        private void OnLineDataGridDrop(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(typeof(InvoiceLineDto)) && 
                DataContext is InvoiceEditViewModel viewModel)
            {
                var draggedLine = e.Data.GetData(typeof(InvoiceLineDto)) as InvoiceLineDto;
                var targetRow = GetDataGridRowFromPoint(sender as DataGrid, e.GetPosition(sender as DataGrid));
                
                if (draggedLine != null && targetRow != null && targetRow.DataContext is InvoiceLineDto targetLine)
                {
                    // Reorder lines
                    viewModel.ReorderLinesCommand?.Execute(new { Source = draggedLine, Target = targetLine });
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

        // Handle VAT percentage changes
        private void OnVatPercentageChanged(object sender, TextChangedEventArgs e)
        {
            if (sender is TextBox textBox && 
                DataContext is InvoiceEditViewModel viewModel)
            {
                if (decimal.TryParse(textBox.Text, out var vatPercentage))
                {
                    viewModel.VatPercentage = vatPercentage;
                }
            }
        }

        // Handle date validation
        private void OnDatePickerSelectedDateChanged(object sender, SelectionChangedEventArgs e)
        {
            if (sender is DatePicker datePicker && 
                DataContext is InvoiceEditViewModel viewModel)
            {
                var selectedDate = datePicker.SelectedDate;
                
                if (selectedDate.HasValue)
                {
                    // Validate date ranges
                    if (datePicker.Name == "InvoiceDatePicker")
                    {
                        if (selectedDate.Value > DateTime.Today)
                        {
                            ShowDateValidationError(datePicker, "Invoice date cannot be in the future");
                        }
                        else
                        {
                            ClearDateValidationError(datePicker);
                        }
                    }
                    else if (datePicker.Name == "DueDatePicker")
                    {
                        if (selectedDate.Value < viewModel.CurrentInvoice.InvoiceDate)
                        {
                            ShowDateValidationError(datePicker, "Due date cannot be before invoice date");
                        }
                        else
                        {
                            ClearDateValidationError(datePicker);
                        }
                    }
                }
            }
        }

        private void ShowDateValidationError(DatePicker datePicker, string message)
        {
            MaterialDesignThemes.Wpf.HintAssist.SetHelperText(datePicker, message);
            MaterialDesignThemes.Wpf.HintAssist.SetIsFloating(datePicker, true);
        }

        private void ClearDateValidationError(DatePicker datePicker)
        {
            MaterialDesignThemes.Wpf.HintAssist.SetHelperText(datePicker, "");
        }

        // Handle context menu for invoice lines
        private void OnLineContextMenuOpening(object sender, ContextMenuEventArgs e)
        {
            if (sender is DataGrid dataGrid && 
                dataGrid.SelectedItem is InvoiceLineDto selectedLine &&
                DataContext is InvoiceEditViewModel viewModel)
            {
                var contextMenu = new ContextMenu();
                
                var editMenuItem = new MenuItem
                {
                    Header = "Edit Line",
                    Command = viewModel.EditLineCommand,
                    CommandParameter = selectedLine,
                    IsEnabled = viewModel.CanEdit
                };
                editMenuItem.Icon = new MaterialDesignThemes.Wpf.PackIcon { Kind = MaterialDesignThemes.Wpf.PackIconKind.Edit };
                contextMenu.Items.Add(editMenuItem);
                
                var duplicateMenuItem = new MenuItem
                {
                    Header = "Duplicate Line",
                    Command = viewModel.DuplicateLineCommand,
                    CommandParameter = selectedLine
                };
                duplicateMenuItem.Icon = new MaterialDesignThemes.Wpf.PackIcon { Kind = MaterialDesignThemes.Wpf.PackIconKind.ContentCopy };
                contextMenu.Items.Add(duplicateMenuItem);
                
                contextMenu.Items.Add(new Separator());
                
                var moveUpMenuItem = new MenuItem
                {
                    Header = "Move Up",
                    Command = viewModel.MoveLineUpCommand,
                    CommandParameter = selectedLine,
                    IsEnabled = viewModel.CanEdit
                };
                moveUpMenuItem.Icon = new MaterialDesignThemes.Wpf.PackIcon { Kind = MaterialDesignThemes.Wpf.PackIconKind.ArrowUp };
                contextMenu.Items.Add(moveUpMenuItem);
                
                var moveDownMenuItem = new MenuItem
                {
                    Header = "Move Down",
                    Command = viewModel.MoveLineDownCommand,
                    CommandParameter = selectedLine,
                    IsEnabled = viewModel.CanEdit
                };
                moveDownMenuItem.Icon = new MaterialDesignThemes.Wpf.PackIcon { Kind = MaterialDesignThemes.Wpf.PackIconKind.ArrowDown };
                contextMenu.Items.Add(moveDownMenuItem);
                
                contextMenu.Items.Add(new Separator());
                
                var groupMenuItem = new MenuItem
                {
                    Header = "Group with Selected",
                    Command = viewModel.GroupLinesCommand,
                    CommandParameter = selectedLine,
                    IsEnabled = viewModel.CanEdit && viewModel.SelectedLine != null && viewModel.SelectedLine != selectedLine
                };
                groupMenuItem.Icon = new MaterialDesignThemes.Wpf.PackIcon { Kind = MaterialDesignThemes.Wpf.PackIconKind.Group };
                contextMenu.Items.Add(groupMenuItem);
                
                contextMenu.Items.Add(new Separator());
                
                var deleteMenuItem = new MenuItem
                {
                    Header = "Delete Line",
                    Command = viewModel.DeleteLineCommand,
                    CommandParameter = selectedLine,
                    IsEnabled = viewModel.CanEdit
                };
                deleteMenuItem.Icon = new MaterialDesignThemes.Wpf.PackIcon { Kind = MaterialDesignThemes.Wpf.PackIconKind.Delete };
                contextMenu.Items.Add(deleteMenuItem);
                
                dataGrid.ContextMenu = contextMenu;
            }
        }

        // Handle auto-save toggle
        private void OnAutoSaveToggled(object sender, RoutedEventArgs e)
        {
            if (sender is CheckBox checkBox && DataContext is InvoiceEditViewModel viewModel)
            {
                viewModel.AutoSaveEnabled = checkBox.IsChecked == true;
            }
        }

        // Handle audit log item selection
        private void OnAuditLogSelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (sender is ListBox listBox && 
                listBox.SelectedItem is InvoiceAuditLogDto selectedLog &&
                DataContext is InvoiceEditViewModel viewModel)
            {
                // Show detailed information about the audit log entry
                viewModel.ShowAuditLogDetailsCommand?.Execute(selectedLog);
            }
        }

        // Handle save button with visual feedback
        private async void OnSaveButtonClick(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && DataContext is InvoiceEditViewModel viewModel)
            {
                // Add save animation
                AnimateButtonClick(button);
                
                button.IsEnabled = false;
                
                try
                {
                    if (viewModel.SaveCommand.CanExecute(null))
                    {
                        await ((AsyncRelayCommand)viewModel.SaveCommand).ExecuteAsync(null);
                    }
                }
                finally
                {
                    button.IsEnabled = true;
                }
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
            if (DataContext is InvoiceEditViewModel viewModel && viewModel.HasChanges)
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

        // Handle export button with file dialog
        private async void OnExportButtonClick(object sender, RoutedEventArgs e)
        {
            if (DataContext is InvoiceEditViewModel viewModel && sender is Button button)
            {
                var saveFileDialog = new Microsoft.Win32.SaveFileDialog
                {
                    Title = "Export Invoice",
                    Filter = "PDF Files (*.pdf)|*.pdf|Excel Files (*.xlsx)|*.xlsx",
                    FileName = $"{viewModel.CurrentInvoice.InvoiceNumber}.pdf"
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

        // Handle text changes for real-time validation
        private void OnTextChanged(object sender, TextChangedEventArgs e)
        {
            if (DataContext is InvoiceEditViewModel viewModel)
            {
                // Mark as having changes
                viewModel.HasChanges = true;
                
                // Trigger validation
                viewModel.ValidateCommand?.Execute(null);
            }
        }

        // Handle finalize confirmation
        private async void OnFinalizeButtonClick(object sender, RoutedEventArgs e)
        {
            if (DataContext is InvoiceEditViewModel viewModel && sender is Button button)
            {
                var result = MessageBox.Show(
                    "Are you sure you want to save and finalize this invoice?\n\nOnce finalized, the invoice will have limited editing capabilities.",
                    "Confirm Finalize",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Warning);

                if (result == MessageBoxResult.Yes)
                {
                    button.IsEnabled = false;
                    
                    try
                    {
                        if (viewModel.SaveAndFinalizeCommand.CanExecute(null))
                        {
                            await ((AsyncRelayCommand)viewModel.SaveAndFinalizeCommand).ExecuteAsync(null);
                        }
                    }
                    finally
                    {
                        button.IsEnabled = true;
                    }
                }
            }
        }

        // Handle notes text changes
        private void OnNotesTextChanged(object sender, TextChangedEventArgs e)
        {
            if (DataContext is InvoiceEditViewModel viewModel)
            {
                viewModel.HasChanges = true;
            }
        }

        // Handle scroll to selected line
        private void OnScrollToSelectedLine(object sender, RoutedEventArgs e)
        {
            if (sender is DataGrid dataGrid && dataGrid.SelectedItem != null)
            {
                dataGrid.ScrollIntoView(dataGrid.SelectedItem);
            }
        }
    }
}