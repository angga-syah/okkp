using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using InvoiceApp.WPF.ViewModels;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.WPF.Views.Companies
{
    public partial class CompanyCreateView : UserControl
    {
        public CompanyCreateView()
        {
            InitializeComponent();
            
            // Set the DataContext using DI container
            DataContext = App.ServiceProvider.GetRequiredService<CompanyCreateViewModel>();
            
            // Initialize event handlers
            Loaded += CompanyCreateView_Loaded;
            Unloaded += CompanyCreateView_Unloaded;
        }

        private async void CompanyCreateView_Loaded(object sender, RoutedEventArgs e)
        {
            if (DataContext is CompanyCreateViewModel viewModel)
            {
                // Initialize the form
                if (viewModel.InitializeCommand.CanExecute(null))
                {
                    await ((AsyncRelayCommand)viewModel.InitializeCommand).ExecuteAsync(null);
                }
                
                // Focus on the first input field
                FocusFirstField();
            }
        }

        private void CompanyCreateView_Unloaded(object sender, RoutedEventArgs e)
        {
            // Cleanup when view is unloaded
            if (DataContext is IDisposable disposableViewModel)
            {
                disposableViewModel.Dispose();
            }
        }

        private void FocusFirstField()
        {
            // Focus on company name field
            var companyNameTextBox = FindName("CompanyNameTextBox") as TextBox;
            companyNameTextBox?.Focus();
        }

        // Handle keyboard shortcuts
        private void OnKeyDown(object sender, KeyEventArgs e)
        {
            if (DataContext is CompanyCreateViewModel viewModel)
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
                }
            }
        }

        // Handle NPWP text input formatting
        private void OnNpwpTextChanged(object sender, TextChangedEventArgs e)
        {
            if (sender is TextBox textBox)
            {
                // Format NPWP as XX.XXX.XXX.X-XXX.XXX
                var text = textBox.Text.Replace(".", "").Replace("-", "");
                
                if (text.Length > 15)
                {
                    text = text.Substring(0, 15);
                }
                
                var formatted = FormatNpwp(text);
                
                if (formatted != textBox.Text)
                {
                    var caretIndex = textBox.CaretIndex;
                    textBox.Text = formatted;
                    textBox.CaretIndex = Math.Min(caretIndex + (formatted.Length - text.Length), formatted.Length);
                }
            }
        }

        private string FormatNpwp(string input)
        {
            if (string.IsNullOrEmpty(input)) return input;
            
            var result = input;
            
            // Add dots and dash in appropriate positions
            if (result.Length > 2)
                result = result.Insert(2, ".");
            if (result.Length > 6)
                result = result.Insert(6, ".");
            if (result.Length > 10)
                result = result.Insert(10, ".");
            if (result.Length > 12)
                result = result.Insert(12, "-");
            if (result.Length > 16)
                result = result.Insert(16, ".");
            
            return result;
        }

        // Handle phone number formatting
        private void OnPhoneTextChanged(object sender, TextChangedEventArgs e)
        {
            if (sender is TextBox textBox)
            {
                // Format phone number for Indonesian format
                var text = textBox.Text.Replace("-", "").Replace(" ", "").Replace("(", "").Replace(")", "");
                
                if (text.Length > 15)
                {
                    text = text.Substring(0, 15);
                }
                
                var formatted = FormatPhoneNumber(text);
                
                if (formatted != textBox.Text)
                {
                    var caretIndex = textBox.CaretIndex;
                    textBox.Text = formatted;
                    textBox.CaretIndex = Math.Min(caretIndex, formatted.Length);
                }
            }
        }

        private string FormatPhoneNumber(string input)
        {
            if (string.IsNullOrEmpty(input)) return input;
            
            var result = input;
            
            // Format as +62-XXX-XXXX-XXXX for Indonesian numbers
            if (result.StartsWith("0"))
            {
                result = "+62" + result.Substring(1);
            }
            else if (result.StartsWith("62"))
            {
                result = "+" + result;
            }
            else if (!result.StartsWith("+"))
            {
                result = "+62" + result;
            }
            
            return result;
        }

        // Handle email validation
        private void OnEmailLostFocus(object sender, RoutedEventArgs e)
        {
            if (sender is TextBox textBox && DataContext is CompanyCreateViewModel viewModel)
            {
                var email = textBox.Text.Trim();
                
                if (!string.IsNullOrEmpty(email) && !IsValidEmail(email))
                {
                    // Show validation error
                    ShowEmailValidationError(textBox);
                }
                else
                {
                    // Clear validation error
                    ClearEmailValidationError(textBox);
                }
            }
        }

        private bool IsValidEmail(string email)
        {
            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                return addr.Address == email;
            }
            catch
            {
                return false;
            }
        }

        private void ShowEmailValidationError(TextBox textBox)
        {
            MaterialDesignThemes.Wpf.HintAssist.SetHelperText(textBox, "Please enter a valid email address");
            MaterialDesignThemes.Wpf.HintAssist.SetIsFloating(textBox, true);
        }

        private void ClearEmailValidationError(TextBox textBox)
        {
            MaterialDesignThemes.Wpf.HintAssist.SetHelperText(textBox, "");
        }

        // Handle import template button
        private async void OnImportTemplateClick(object sender, RoutedEventArgs e)
        {
            if (DataContext is CompanyCreateViewModel viewModel && sender is Button button)
            {
                var openFileDialog = new Microsoft.Win32.OpenFileDialog
                {
                    Title = "Import Company Template",
                    Filter = "Excel Files (*.xlsx;*.xls)|*.xlsx;*.xls|CSV Files (*.csv)|*.csv|JSON Files (*.json)|*.json",
                    Multiselect = false
                };

                if (openFileDialog.ShowDialog() == true)
                {
                    button.IsEnabled = false;
                    
                    try
                    {
                        var importPath = openFileDialog.FileName;
                        await viewModel.ImportFromTemplateAsync(importPath);
                    }
                    finally
                    {
                        button.IsEnabled = true;
                    }
                }
            }
        }

        // Handle drag and drop for template import
        private void OnDragOver(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(DataFormats.FileDrop))
            {
                var files = (string[])e.Data.GetData(DataFormats.FileDrop);
                
                var hasValidFile = false;
                foreach (var file in files)
                {
                    var extension = System.IO.Path.GetExtension(file).ToLowerInvariant();
                    if (extension == ".xlsx" || extension == ".xls" || extension == ".csv" || extension == ".json")
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
            if (e.Data.GetDataPresent(DataFormats.FileDrop) && DataContext is CompanyCreateViewModel viewModel)
            {
                var files = (string[])e.Data.GetData(DataFormats.FileDrop);
                
                foreach (var file in files)
                {
                    var extension = System.IO.Path.GetExtension(file).ToLowerInvariant();
                    if (extension == ".xlsx" || extension == ".xls" || extension == ".csv" || extension == ".json")
                    {
                        await viewModel.ImportFromTemplateAsync(file);
                        break; // Import only the first valid file
                    }
                }
            }
        }

        // Handle form validation
        private void OnTextBoxTextChanged(object sender, TextChangedEventArgs e)
        {
            if (DataContext is CompanyCreateViewModel viewModel)
            {
                // Trigger real-time validation
                viewModel.ValidateCommand?.Execute(null);
            }
        }

        // Handle save button with visual feedback
        private async void OnSaveButtonClick(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && DataContext is CompanyCreateViewModel viewModel)
            {
                // Add click animation
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

        // Handle quick setup options
        private void OnQuickSetupChanged(object sender, RoutedEventArgs e)
        {
            if (DataContext is CompanyCreateViewModel viewModel && sender is CheckBox checkBox)
            {
                // Update view model based on checkbox changes
                switch (checkBox.Name)
                {
                    case "CreateSampleJobsCheckBox":
                        viewModel.CreateSampleJobs = checkBox.IsChecked == true;
                        break;
                    case "SetupBankAccountCheckBox":
                        viewModel.SetupBankAccount = checkBox.IsChecked == true;
                        break;
                    case "ImportTkaWorkersCheckBox":
                        viewModel.ImportTkaWorkers = checkBox.IsChecked == true;
                        break;
                }
            }
        }

        // Show help dialog
        private void ShowHelp()
        {
            var helpText = @"Company Creation Help:

Required Fields:
• Company Name: Official registered company name
• NPWP: Tax identification number (15 digits)
• IDTKU: Company tax registration number
• Address: Complete company address

Optional Fields:
• Email: Company contact email
• Phone: Contact phone number
• Contact Person: Primary contact name

Quick Setup Options:
• Sample Jobs: Creates common job descriptions
• Bank Account: Sets up default payment info
• Import TKA: Allows importing worker data

Keyboard Shortcuts:
• Ctrl+S: Save company
• Ctrl+Enter: Save and continue
• Escape: Cancel
• F1: Show this help";

            MessageBox.Show(helpText, "Company Creation Help", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        // Handle window closing validation
        private void OnWindowClosing(object sender, System.ComponentModel.CancelEventArgs e)
        {
            if (DataContext is CompanyCreateViewModel viewModel && viewModel.HasUnsavedChanges)
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

        // Handle tab navigation
        private void OnPreviewKeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Tab)
            {
                // Custom tab order handling if needed
                var focusedElement = Keyboard.FocusedElement as UIElement;
                
                if (focusedElement != null)
                {
                    // Move focus to next/previous element
                    var direction = (e.KeyboardDevice.Modifiers & ModifierKeys.Shift) == ModifierKeys.Shift
                        ? FocusNavigationDirection.Previous
                        : FocusNavigationDirection.Next;
                    
                    focusedElement.MoveFocus(new TraversalRequest(direction));
                    e.Handled = true;
                }
            }
        }
    }
}