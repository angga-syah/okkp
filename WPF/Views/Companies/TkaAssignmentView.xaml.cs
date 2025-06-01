using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Threading;
using InvoiceApp.WPF.ViewModels;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.WPF.Views.Companies
{
    public partial class TkaAssignmentView : UserControl
    {
        private DispatcherTimer _searchDelayTimer;

        public TkaAssignmentView()
        {
            InitializeComponent();
            
            // Set the DataContext using DI container
            DataContext = App.ServiceProvider.GetRequiredService<TkaAssignmentDialogViewModel>();
            
            // Initialize event handlers
            Loaded += TkaAssignmentView_Loaded;
            Unloaded += TkaAssignmentView_Unloaded;
            
            // Set up search delay timer
            SetupSearchDelayTimer();
        }

        private void TkaAssignmentView_Loaded(object sender, RoutedEventArgs e)
        {
            if (DataContext is TkaAssignmentDialogViewModel viewModel)
            {
                // Initialize the dialog
                if (viewModel.InitializeCommand?.CanExecute(null) == true)
                {
                    viewModel.InitializeCommand.Execute(null);
                }
                
                // Focus on the search field
                FocusSearchField();
            }
        }

        private void TkaAssignmentView_Unloaded(object sender, RoutedEventArgs e)
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
                
                if (DataContext is TkaAssignmentDialogViewModel viewModel &&
                    viewModel.SearchTkaWorkersCommand?.CanExecute(null) == true)
                {
                    await ((AsyncRelayCommand)viewModel.SearchTkaWorkersCommand).ExecuteAsync(null);
                }
            };
        }

        private void FocusSearchField()
        {
            // Focus on TKA search field
            var searchTextBox = FindName("TkaSearchTextBox") as TextBox;
            searchTextBox?.Focus();
        }

        // Handle keyboard shortcuts
        private void OnKeyDown(object sender, KeyEventArgs e)
        {
            if (DataContext is TkaAssignmentDialogViewModel viewModel)
            {
                switch (e.Key)
                {
                    case Key.S when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+S to save
                        if (viewModel.SaveCommand.CanExecute(null))
                        {
                            viewModel.SaveCommand.Execute(null);
                        }
                        e.Handled = true;
                        break;
                        
                    case Key.Enter when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+Enter to save and continue
                        if (viewModel.SaveAndContinueCommand.CanExecute(null))
                        {
                            viewModel.SaveAndContinueCommand.Execute(null);
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
                        
                    case Key.F1:
                        // F1 for help
                        ShowHelp();
                        e.Handled = true;
                        break;
                        
                    case Key.F when e.KeyboardDevice.Modifiers == ModifierKeys.Control:
                        // Ctrl+F to focus search
                        FocusSearchField();
                        e.Handled = true;
                        break;
                }
            }
        }

        // Handle TKA search text changes with delay
        private void OnTkaSearchTextChanged(object sender, TextChangedEventArgs e)
        {
            if (DataContext is TkaAssignmentDialogViewModel viewModel)
            {
                // Reset the timer on each text change
                _searchDelayTimer.Stop();
                _searchDelayTimer.Start();
            }
        }

        // Handle TKA selection from ComboBox
        private void OnTkaSelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (sender is ComboBox comboBox && 
                DataContext is TkaAssignmentDialogViewModel viewModel)
            {
                if (e.AddedItems.Count > 0)
                {
                    var selectedTka = e.AddedItems[0] as TkaWorkerDto;
                    viewModel.Assignment.SelectedTkaWorker = selectedTka;
                    
                    // Load family members for the selected TKA
                    if (selectedTka != null)
                    {
                        viewModel.LoadFamilyMembersCommand?.Execute(selectedTka.Id);
                    }
                }
            }
        }

        // Handle assignment date validation
        private void OnAssignmentDateChanged(object sender, SelectionChangedEventArgs e)
        {
            if (sender is DatePicker datePicker && 
                DataContext is TkaAssignmentDialogViewModel viewModel)
            {
                var selectedDate = datePicker.SelectedDate;
                
                if (selectedDate.HasValue)
                {
                    // Validate assignment date
                    if (selectedDate.Value > DateTime.Today)
                    {
                        ShowDateValidationError(datePicker, "Assignment date cannot be in the future");
                    }
                    else if (selectedDate.Value < DateTime.Today.AddYears(-5))
                    {
                        ShowDateValidationError(datePicker, "Assignment date seems too old");
                    }
                    else
                    {
                        ClearDateValidationError(datePicker);
                        
                        // Auto-suggest end date if not set
                        if (!viewModel.Assignment.EndDate.HasValue)
                        {
                            viewModel.SuggestEndDateCommand?.Execute(selectedDate.Value);
                        }
                    }
                }
            }
        }

        // Handle end date validation
        private void OnEndDateChanged(object sender, SelectionChangedEventArgs e)
        {
            if (sender is DatePicker datePicker && 
                DataContext is TkaAssignmentDialogViewModel viewModel)
            {
                var endDate = datePicker.SelectedDate;
                var assignmentDate = viewModel.Assignment.AssignmentDate;
                
                if (endDate.HasValue && assignmentDate.HasValue)
                {
                    if (endDate.Value <= assignmentDate.Value)
                    {
                        ShowDateValidationError(datePicker, "End date must be after assignment date");
                    }
                    else if (endDate.Value < DateTime.Today && viewModel.Assignment.IsActive)
                    {
                        // Warn about past end date for active assignment
                        ShowDateValidationWarning(datePicker, "End date is in the past - consider deactivating assignment");
                    }
                    else
                    {
                        ClearDateValidationError(datePicker);
                    }
                }
            }
        }

        private void ShowDateValidationError(DatePicker datePicker, string message)
        {
            MaterialDesignThemes.Wpf.HintAssist.SetHelperText(datePicker, message);
            MaterialDesignThemes.Wpf.HintAssist.SetIsFloating(datePicker, true);
        }

        private void ShowDateValidationWarning(DatePicker datePicker, string message)
        {
            MaterialDesignThemes.Wpf.HintAssist.SetHelperText(datePicker, message);
            MaterialDesignThemes.Wpf.HintAssist.SetIsFloating(datePicker, true);
        }

        private void ClearDateValidationError(DatePicker datePicker)
        {
            MaterialDesignThemes.Wpf.HintAssist.SetHelperText(datePicker, "");
        }

        // Handle family member selection changes
        private void OnFamilyMemberChecked(object sender, RoutedEventArgs e)
        {
            if (sender is CheckBox checkBox && 
                checkBox.DataContext is TkaFamilyMemberDto familyMember &&
                DataContext is TkaAssignmentDialogViewModel viewModel)
            {
                familyMember.IsIncludedInAssignment = checkBox.IsChecked == true;
                
                // Update assignment summary
                viewModel.UpdateAssignmentSummaryCommand?.Execute(null);
            }
        }

        // Handle view TKA details button
        private void OnViewTkaDetailsClick(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && 
                button.CommandParameter is TkaWorkerDto tkaWorker &&
                DataContext is TkaAssignmentDialogViewModel viewModel)
            {
                if (viewModel.ViewTkaDetailsCommand.CanExecute(tkaWorker))
                {
                    viewModel.ViewTkaDetailsCommand.Execute(tkaWorker);
                }
            }
        }

        // Handle save button with visual feedback
        private async void OnSaveButtonClick(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && DataContext is TkaAssignmentDialogViewModel viewModel)
            {
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

        // Handle close button
        private void OnCloseButtonClick(object sender, RoutedEventArgs e)
        {
            if (DataContext is TkaAssignmentDialogViewModel viewModel)
            {
                if (viewModel.HasUnsavedChanges)
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
                            return; // Don't close
                        // No - continue closing without saving
                    }
                }

                // Close the dialog
                if (viewModel.CloseCommand.CanExecute(null))
                {
                    viewModel.CloseCommand.Execute(null);
                }
            }
        }

        // Handle TKA ComboBox dropdown opening
        private void OnTkaComboBoxDropDownOpening(object sender, EventArgs e)
        {
            if (DataContext is TkaAssignmentDialogViewModel viewModel)
            {
                // Refresh available TKA workers when dropdown opens
                if (viewModel.RefreshAvailableTkaCommand?.CanExecute(null) == true)
                {
                    viewModel.RefreshAvailableTkaCommand.Execute(null);
                }
            }
        }

        // Handle assignment history selection
        private void OnAssignmentHistorySelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (sender is DataGrid dataGrid && 
                dataGrid.SelectedItem is AssignmentHistoryDto selectedHistory &&
                DataContext is TkaAssignmentDialogViewModel viewModel)
            {
                // Show details of the selected history item
                viewModel.ShowHistoryDetailsCommand?.Execute(selectedHistory);
            }
        }

        // Handle notes text changes for auto-save
        private void OnNotesTextChanged(object sender, TextChangedEventArgs e)
        {
            if (DataContext is TkaAssignmentDialogViewModel viewModel)
            {
                // Mark as having unsaved changes
                viewModel.HasUnsavedChanges = true;
                
                // Trigger validation
                viewModel.ValidateCommand?.Execute(null);
            }
        }

        // Handle active status changes
        private void OnActiveStatusChanged(object sender, RoutedEventArgs e)
        {
            if (sender is CheckBox checkBox && 
                DataContext is TkaAssignmentDialogViewModel viewModel)
            {
                var isActive = checkBox.IsChecked == true;
                viewModel.Assignment.IsActive = isActive;
                
                // If deactivating and no end date set, suggest today
                if (!isActive && !viewModel.Assignment.EndDate.HasValue)
                {
                    viewModel.Assignment.EndDate = DateTime.Today;
                }
                
                // Mark as having unsaved changes
                viewModel.HasUnsavedChanges = true;
            }
        }

        // Show help dialog
        private void ShowHelp()
        {
            var helpText = @"TKA Assignment Help:

Assignment Process:
1. Search and select the TKA worker to assign
2. Set the assignment start date
3. Optionally set an end date for temporary assignments
4. Include relevant family members
5. Add notes about the assignment

Important Notes:
• Only active assignments appear in invoice creation
• Family members automatically inherit assignment settings
• End date is optional for permanent assignments
• Assignment history tracks all changes

Search Tips:
• Search by name, passport, or division
• Use partial text for broader results
• Clear search to see all available TKA workers

Keyboard Shortcuts:
• Ctrl+S: Save assignment
• Ctrl+Enter: Save and assign another
• Ctrl+F: Focus search field
• Escape: Cancel
• F1: Show this help";

            MessageBox.Show(helpText, "TKA Assignment Help", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        // Handle drag and drop for TKA selection
        private void OnTkaDragOver(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(typeof(TkaWorkerDto)))
            {
                e.Effects = DragDropEffects.Copy;
            }
            else
            {
                e.Effects = DragDropEffects.None;
            }
            e.Handled = true;
        }

        private void OnTkaDrop(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(typeof(TkaWorkerDto)) && 
                DataContext is TkaAssignmentDialogViewModel viewModel)
            {
                var droppedTka = e.Data.GetData(typeof(TkaWorkerDto)) as TkaWorkerDto;
                
                if (droppedTka != null)
                {
                    viewModel.Assignment.SelectedTkaWorker = droppedTka;
                    viewModel.LoadFamilyMembersCommand?.Execute(droppedTka.Id);
                }
            }
        }

        // Handle tab navigation
        private void OnPreviewKeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Tab)
            {
                var focusedElement = Keyboard.FocusedElement as UIElement;
                
                if (focusedElement != null)
                {
                    var direction = (e.KeyboardDevice.Modifiers & ModifierKeys.Shift) == ModifierKeys.Shift
                        ? FocusNavigationDirection.Previous
                        : FocusNavigationDirection.Next;
                    
                    focusedElement.MoveFocus(new TraversalRequest(direction));
                    e.Handled = true;
                }
            }
        }

        // Handle validation errors display
        private void OnValidationError(object sender, ValidationErrorEventArgs e)
        {
            if (DataContext is TkaAssignmentDialogViewModel viewModel)
            {
                if (e.Action == ValidationErrorEventAction.Added)
                {
                    viewModel.AddValidationError(e.Error.ErrorContent.ToString());
                }
                else
                {
                    viewModel.RemoveValidationError(e.Error.ErrorContent.ToString());
                }
            }
        }

        // Handle form validation
        private void OnFormFieldChanged(object sender, RoutedEventArgs e)
        {
            if (DataContext is TkaAssignmentDialogViewModel viewModel)
            {
                // Trigger real-time validation
                viewModel.ValidateCommand?.Execute(null);
                
                // Mark as having unsaved changes
                viewModel.HasUnsavedChanges = true;
            }
        }

        // Handle window closing validation
        private void OnClosing(object sender, System.ComponentModel.CancelEventArgs e)
        {
            if (DataContext is TkaAssignmentDialogViewModel viewModel && viewModel.HasUnsavedChanges)
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

        // Handle ComboBox text input for custom search
        private void OnTkaComboBoxTextChanged(object sender, TextChangedEventArgs e)
        {
            if (sender is ComboBox comboBox && 
                DataContext is TkaAssignmentDialogViewModel viewModel)
            {
                var searchText = comboBox.Text;
                
                if (!string.IsNullOrEmpty(searchText))
                {
                    viewModel.TkaSearchTerm = searchText;
                    
                    // Trigger search with delay
                    _searchDelayTimer.Stop();
                    _searchDelayTimer.Start();
                }
            }
        }

        // Handle assignment conflict detection
        private void OnAssignmentConflictCheck(object sender, RoutedEventArgs e)
        {
            if (DataContext is TkaAssignmentDialogViewModel viewModel)
            {
                // Check for existing assignments that might conflict
                viewModel.CheckAssignmentConflictsCommand?.Execute(null);
            }
        }
    }
}