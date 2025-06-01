using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using InvoiceApp.WPF.ViewModels;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.WPF.Views.Companies
{
    public partial class JobDescriptionView : UserControl
    {
        public JobDescriptionView()
        {
            InitializeComponent();
            
            // Set the DataContext using DI container
            DataContext = App.ServiceProvider.GetRequiredService<JobDescriptionDialogViewModel>();
            
            // Initialize event handlers
            Loaded += JobDescriptionView_Loaded;
            Unloaded += JobDescriptionView_Unloaded;
        }

        private void JobDescriptionView_Loaded(object sender, RoutedEventArgs e)
        {
            if (DataContext is JobDescriptionDialogViewModel viewModel)
            {
                // Initialize the dialog
                if (viewModel.InitializeCommand?.CanExecute(null) == true)
                {
                    viewModel.InitializeCommand.Execute(null);
                }
                
                // Focus on the first input field
                FocusFirstField();
            }
        }

        private void JobDescriptionView_Unloaded(object sender, RoutedEventArgs e)
        {
            // Cleanup when view is unloaded
            if (DataContext is IDisposable disposableViewModel)
            {
                disposableViewModel.Dispose();
            }
        }

        private void FocusFirstField()
        {
            // Focus on job name field
            var jobNameTextBox = FindName("JobNameTextBox") as TextBox;
            jobNameTextBox?.Focus();
        }

        // Handle keyboard shortcuts
        private void OnKeyDown(object sender, KeyEventArgs e)
        {
            if (DataContext is JobDescriptionDialogViewModel viewModel)
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

        // Handle price input formatting
        private void OnPriceTextChanged(object sender, TextChangedEventArgs e)
        {
            if (sender is TextBox textBox)
            {
                // Format price input
                var text = textBox.Text.Replace(".", "").Replace(",", "").Replace("Rp", "").Trim();
                
                if (decimal.TryParse(text, out var price))
                {
                    // Update the view model
                    if (DataContext is JobDescriptionDialogViewModel viewModel)
                    {
                        viewModel.JobDescription.Price = price;
                    }
                }
            }
        }

        // Handle template selection
        private void OnTemplateButtonClick(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && 
                button.DataContext != null && 
                DataContext is JobDescriptionDialogViewModel viewModel)
            {
                // Apply template
                if (viewModel.ApplyTemplateCommand.CanExecute(button.DataContext))
                {
                    viewModel.ApplyTemplateCommand.Execute(button.DataContext);
                }
                
                // Animate button click
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

        // Handle job description text changes for preview
        private void OnJobDescriptionTextChanged(object sender, TextChangedEventArgs e)
        {
            if (DataContext is JobDescriptionDialogViewModel viewModel)
            {
                // Update preview in real-time
                viewModel.UpdatePreviewCommand?.Execute(null);
            }
        }

        // Handle validation
        private void OnTextBoxLostFocus(object sender, RoutedEventArgs e)
        {
            if (DataContext is JobDescriptionDialogViewModel viewModel)
            {
                // Trigger validation when field loses focus
                viewModel.ValidateCommand?.Execute(null);
            }
        }

        // Handle save button with visual feedback
        private async void OnSaveButtonClick(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && DataContext is JobDescriptionDialogViewModel viewModel)
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
            if (DataContext is JobDescriptionDialogViewModel viewModel)
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

        // Handle expander state changes
        private void OnExpanderStateChanged(object sender, RoutedEventArgs e)
        {
            if (sender is Expander expander && DataContext is JobDescriptionDialogViewModel viewModel)
            {
                // Save expander states to user preferences
                switch (expander.Name)
                {
                    case "PreviewExpander":
                        viewModel.SaveExpanderState("JobDescriptionPreview", expander.IsExpanded);
                        break;
                    case "TemplatesExpander":
                        viewModel.SaveExpanderState("JobDescriptionTemplates", expander.IsExpanded);
                        break;
                }
            }
        }

        // Handle tab navigation for better UX
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

        // Show help dialog
        private void ShowHelp()
        {
            var helpText = @"Job Description Help:

Required Fields:
• Job Name: Short, descriptive name for the job
• Job Description: Detailed description of the work
• Price: Standard price in Indonesian Rupiah

Optional Fields:
• Sort Order: Display order in invoice selection (default: auto)

Templates:
• Click any template to auto-fill fields
• Templates are based on common job types
• You can modify template values after applying

Tips:
• Use clear, specific job names
• Include requirements in the description
• Set competitive, fair pricing
• Lower sort order = appears first in lists

Keyboard Shortcuts:
• Ctrl+S: Save job description
• Ctrl+Enter: Save and add another
• Escape: Cancel
• F1: Show this help";

            MessageBox.Show(helpText, "Job Description Help", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        // Handle sort order auto-calculation
        private void OnSortOrderGotFocus(object sender, RoutedEventArgs e)
        {
            if (sender is TextBox textBox && 
                string.IsNullOrEmpty(textBox.Text) && 
                DataContext is JobDescriptionDialogViewModel viewModel)
            {
                // Auto-suggest next sort order
                viewModel.SuggestNextSortOrderCommand?.Execute(null);
            }
        }

        // Handle price validation
        private void OnPriceValidation(object sender, RoutedEventArgs e)
        {
            if (sender is TextBox textBox && DataContext is JobDescriptionDialogViewModel viewModel)
            {
                if (decimal.TryParse(textBox.Text, out var price))
                {
                    if (price < 0)
                    {
                        ShowPriceValidationError(textBox, "Price cannot be negative");
                    }
                    else if (price > 999999999)
                    {
                        ShowPriceValidationError(textBox, "Price is too large");
                    }
                    else
                    {
                        ClearPriceValidationError(textBox);
                    }
                }
                else if (!string.IsNullOrEmpty(textBox.Text))
                {
                    ShowPriceValidationError(textBox, "Please enter a valid price");
                }
            }
        }

        private void ShowPriceValidationError(TextBox textBox, string message)
        {
            MaterialDesignThemes.Wpf.HintAssist.SetHelperText(textBox, message);
            MaterialDesignThemes.Wpf.HintAssist.SetIsFloating(textBox, true);
        }

        private void ClearPriceValidationError(TextBox textBox)
        {
            MaterialDesignThemes.Wpf.HintAssist.SetHelperText(textBox, "");
        }

        // Handle job name duplication check
        private void OnJobNameLostFocus(object sender, RoutedEventArgs e)
        {
            if (sender is TextBox textBox && DataContext is JobDescriptionDialogViewModel viewModel)
            {
                var jobName = textBox.Text.Trim();
                
                if (!string.IsNullOrEmpty(jobName))
                {
                    // Check for duplicate job names
                    viewModel.CheckDuplicateJobNameCommand?.Execute(jobName);
                }
            }
        }

        // Handle drag and drop for templates
        private void OnTemplateDragOver(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(DataFormats.Text))
            {
                e.Effects = DragDropEffects.Copy;
            }
            else
            {
                e.Effects = DragDropEffects.None;
            }
            e.Handled = true;
        }

        private void OnTemplateDrop(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(DataFormats.Text) && DataContext is JobDescriptionDialogViewModel viewModel)
            {
                var templateText = e.Data.GetData(DataFormats.Text) as string;
                
                if (!string.IsNullOrEmpty(templateText))
                {
                    // Parse dropped template text and apply it
                    viewModel.ApplyDroppedTemplateCommand?.Execute(templateText);
                }
            }
        }

        // Handle window closing
        protected override void OnPreviewKeyDown(KeyEventArgs e)
        {
            // Handle dialog-specific key combinations
            if (e.Key == Key.Escape && DataContext is JobDescriptionDialogViewModel viewModel)
            {
                OnCloseButtonClick(this, new RoutedEventArgs());
                e.Handled = true;
                return;
            }

            base.OnPreviewKeyDown(e);
        }

        // Handle currency formatting display
        private void OnPriceDisplayUpdate(object sender, RoutedEventArgs e)
        {
            if (sender is TextBox textBox && DataContext is JobDescriptionDialogViewModel viewModel)
            {
                // Update the preview price display
                if (decimal.TryParse(textBox.Text, out var price))
                {
                    var formattedPrice = price.ToString("C", new System.Globalization.CultureInfo("id-ID"));
                    viewModel.FormattedPrice = formattedPrice;
                }
            }
        }
    }
}