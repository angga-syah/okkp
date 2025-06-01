// E:\kp\4 invoice\WPF\Services\DialogService.cs
using System.Windows;
using Microsoft.Extensions.Logging;
using InvoiceApp.Core.Interfaces.Services;
using InvoiceApp.Core.Enums;
using System.ComponentModel;
using MaterialDesignThemes.Wpf;

namespace InvoiceApp.WPF.Services;

/// <summary>
/// Modern dialog service with Material Design support
/// Provides consistent dialog experience across the application
/// </summary>
public class DialogService : IDialogService
{
    private readonly ILogger<DialogService> _logger;
    
    public DialogService(ILogger<DialogService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    #region Message Dialogs

    /// <summary>
    /// Show information dialog
    /// </summary>
    public async Task ShowInfoAsync(string title, string message)
    {
        await ShowMessageAsync(title, message, MessageBoxImage.Information);
    }

    /// <summary>
    /// Show warning dialog
    /// </summary>
    public async Task ShowWarningAsync(string title, string message)
    {
        await ShowMessageAsync(title, message, MessageBoxImage.Warning);
    }

    /// <summary>
    /// Show error dialog
    /// </summary>
    public async Task ShowErrorAsync(string title, string message)
    {
        await ShowMessageAsync(title, message, MessageBoxImage.Error);
    }

    /// <summary>
    /// Show error dialog with exception details
    /// </summary>
    public async Task ShowErrorAsync(string title, Exception exception)
    {
        var message = $"{exception.Message}\n\nWould you like to see technical details?";
        var result = await ShowConfirmationAsync(title, message);
        
        if (result)
        {
            await ShowErrorDetailsAsync(title, exception);
        }
    }

    /// <summary>
    /// Show success dialog
    /// </summary>
    public async Task ShowSuccessAsync(string title, string message)
    {
        await ShowMessageAsync(title, message, MessageBoxImage.Information, "Success");
    }

    #endregion

    #region Confirmation Dialogs

    /// <summary>
    /// Show confirmation dialog
    /// </summary>
    public async Task<bool> ShowConfirmationAsync(string title, string message)
    {
        return await ShowConfirmationAsync(title, message, "Yes", "No");
    }

    /// <summary>
    /// Show confirmation dialog with custom buttons
    /// </summary>
    public async Task<bool> ShowConfirmationAsync(string title, string message, string yesText, string noText)
    {
        var dialog = new ModernConfirmationDialog
        {
            Title = title,
            Message = message,
            YesButtonText = yesText,
            NoButtonText = noText
        };

        var result = await DialogHost.Show(dialog, "RootDialog");
        return result is bool boolResult && boolResult;
    }

    /// <summary>
    /// Show delete confirmation dialog
    /// </summary>
    public async Task<bool> ShowDeleteConfirmationAsync(string itemName, string itemType = "item")
    {
        var title = $"Delete {itemType}";
        var message = $"Are you sure you want to delete '{itemName}'?\n\nThis action cannot be undone.";
        
        return await ShowConfirmationAsync(title, message, "Delete", "Cancel");
    }

    /// <summary>
    /// Show three-way choice dialog
    /// </summary>
    public async Task<DialogResult> ShowThreeWayAsync(string title, string message, 
        string option1, string option2, string option3)
    {
        var dialog = new ModernThreeWayDialog
        {
            Title = title,
            Message = message,
            Option1Text = option1,
            Option2Text = option2,
            Option3Text = option3
        };

        var result = await DialogHost.Show(dialog, "RootDialog");
        
        return result switch
        {
            0 => DialogResult.Option1,
            1 => DialogResult.Option2,
            2 => DialogResult.Option3,
            _ => DialogResult.Cancel
        };
    }

    #endregion

    #region Input Dialogs

    /// <summary>
    /// Show text input dialog
    /// </summary>
    public async Task<string> ShowInputAsync(string title, string message, string defaultValue = "", 
        string placeholder = "")
    {
        var dialog = new ModernInputDialog
        {
            Title = title,
            Message = message,
            InputText = defaultValue,
            PlaceholderText = placeholder
        };

        var result = await DialogHost.Show(dialog, "RootDialog");
        return result as string ?? string.Empty;
    }

    /// <summary>
    /// Show numeric input dialog
    /// </summary>
    public async Task<double?> ShowNumericInputAsync(string title, string message, double defaultValue = 0,
        double min = double.MinValue, double max = double.MaxValue)
    {
        var dialog = new ModernNumericInputDialog
        {
            Title = title,
            Message = message,
            Value = defaultValue,
            MinValue = min,
            MaxValue = max
        };

        var result = await DialogHost.Show(dialog, "RootDialog");
        return result as double?;
    }

    /// <summary>
    /// Show selection dialog
    /// </summary>
    public async Task<T> ShowSelectionAsync<T>(string title, string message, IEnumerable<T> items,
        string displayMemberPath = "")
    {
        var dialog = new ModernSelectionDialog<T>
        {
            Title = title,
            Message = message,
            Items = items.ToList(),
            DisplayMemberPath = displayMemberPath
        };

        var result = await DialogHost.Show(dialog, "RootDialog");
        return result is T selectedItem ? selectedItem : default(T);
    }

    #endregion

    #region File Dialogs

    /// <summary>
    /// Show open file dialog
    /// </summary>
    public async Task<string> ShowOpenFileDialogAsync(string title = "Open File", 
        string filter = "All Files (*.*)|*.*", string initialDirectory = "")
    {
        return await Application.Current.Dispatcher.InvokeAsync(() =>
        {
            var dialog = new Microsoft.Win32.OpenFileDialog
            {
                Title = title,
                Filter = filter,
                InitialDirectory = string.IsNullOrEmpty(initialDirectory) ? 
                    Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments) : initialDirectory
            };

            return dialog.ShowDialog() == true ? dialog.FileName : string.Empty;
        });
    }

    /// <summary>
    /// Show save file dialog
    /// </summary>
    public async Task<string> ShowSaveFileDialogAsync(string title = "Save File", 
        string filter = "All Files (*.*)|*.*", string defaultFileName = "", string initialDirectory = "")
    {
        return await Application.Current.Dispatcher.InvokeAsync(() =>
        {
            var dialog = new Microsoft.Win32.SaveFileDialog
            {
                Title = title,
                Filter = filter,
                FileName = defaultFileName,
                InitialDirectory = string.IsNullOrEmpty(initialDirectory) ? 
                    Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments) : initialDirectory
            };

            return dialog.ShowDialog() == true ? dialog.FileName : string.Empty;
        });
    }

    /// <summary>
    /// Show folder browser dialog
    /// </summary>
    public async Task<string> ShowFolderBrowserDialogAsync(string title = "Select Folder", 
        string initialDirectory = "")
    {
        return await Application.Current.Dispatcher.InvokeAsync(() =>
        {
            using var dialog = new System.Windows.Forms.FolderBrowserDialog
            {
                Description = title,
                SelectedPath = string.IsNullOrEmpty(initialDirectory) ? 
                    Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments) : initialDirectory,
                ShowNewFolderButton = true
            };

            return dialog.ShowDialog() == System.Windows.Forms.DialogResult.OK ? 
                dialog.SelectedPath : string.Empty;
        });
    }

    #endregion

    #region Progress Dialogs

    /// <summary>
    /// Show progress dialog
    /// </summary>
    public async Task<IProgressDialog> ShowProgressAsync(string title, string message, bool isCancellable = false)
    {
        var progressDialog = new ModernProgressDialog
        {
            Title = title,
            Message = message,
            IsCancellable = isCancellable
        };

        // Show dialog without waiting for result
        _ = DialogHost.Show(progressDialog, "RootDialog");

        return progressDialog;
    }

    /// <summary>
    /// Execute task with progress dialog
    /// </summary>
    public async Task ExecuteWithProgressAsync(string title, string message, 
        Func<IProgress<ProgressInfo>, CancellationToken, Task> task, bool isCancellable = false)
    {
        var progressDialog = await ShowProgressAsync(title, message, isCancellable);
        
        try
        {
            using var cts = new CancellationTokenSource();
            
            if (isCancellable)
            {
                progressDialog.CancelRequested += () => cts.Cancel();
            }

            var progress = new Progress<ProgressInfo>(info =>
            {
                progressDialog.UpdateProgress(info.Percentage, info.Message);
            });

            await task(progress, cts.Token);
            
            progressDialog.Complete();
        }
        catch (OperationCanceledException)
        {
            progressDialog.Cancel();
            _logger.LogInformation("Operation cancelled by user");
        }
        catch (Exception ex)
        {
            progressDialog.Error(ex.Message);
            _logger.LogError(ex, "Error during progress operation");
            throw;
        }
    }

    #endregion

    #region Private Methods

    /// <summary>
    /// Show generic message dialog
    /// </summary>
    private async Task ShowMessageAsync(string title, string message, MessageBoxImage icon, string customIcon = null)
    {
        try
        {
            var dialog = new ModernMessageDialog
            {
                Title = title,
                Message = message,
                Icon = GetIconKind(icon, customIcon)
            };

            await DialogHost.Show(dialog, "RootDialog");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error showing message dialog");
            
            // Fallback to system dialog
            await Application.Current.Dispatcher.InvokeAsync(() =>
            {
                MessageBox.Show(message, title, MessageBoxButton.OK, icon);
            });
        }
    }

    /// <summary>
    /// Show error details dialog
    /// </summary>
    private async Task ShowErrorDetailsAsync(string title, Exception exception)
    {
        var dialog = new ModernErrorDetailsDialog
        {
            Title = title,
            Exception = exception
        };

        await DialogHost.Show(dialog, "RootDialog");
    }

    /// <summary>
    /// Get Material Design icon for message type
    /// </summary>
    private PackIconKind GetIconKind(MessageBoxImage icon, string customIcon = null)
    {
        if (!string.IsNullOrEmpty(customIcon))
        {
            return customIcon switch
            {
                "Success" => PackIconKind.CheckCircle,
                _ => PackIconKind.Information
            };
        }

        return icon switch
        {
            MessageBoxImage.Error => PackIconKind.AlertCircle,
            MessageBoxImage.Warning => PackIconKind.Alert,
            MessageBoxImage.Question => PackIconKind.HelpCircle,
            MessageBoxImage.Information => PackIconKind.InformationOutline,
            _ => PackIconKind.InformationOutline
        };
    }

    #endregion
}

/// <summary>
/// Dialog result enumeration
/// </summary>
public enum DialogResult
{
    Cancel,
    Option1,
    Option2,
    Option3
}

/// <summary>
/// Progress information for progress dialogs
/// </summary>
public class ProgressInfo
{
    public double Percentage { get; set; }
    public string Message { get; set; }
    public bool IsIndeterminate { get; set; } = false;
}

/// <summary>
/// Interface for progress dialogs
/// </summary>
public interface IProgressDialog
{
    event Action CancelRequested;
    void UpdateProgress(double percentage, string message = null);
    void Complete();
    void Cancel();
    void Error(string errorMessage);
}

#region Dialog UserControls (Simplified versions - full implementations would be separate files)

/// <summary>
/// Modern confirmation dialog control
/// </summary>
public class ModernConfirmationDialog : UserControl
{
    public string Title { get; set; }
    public string Message { get; set; }
    public string YesButtonText { get; set; } = "Yes";
    public string NoButtonText { get; set; } = "No";
}

/// <summary>
/// Modern three-way dialog control
/// </summary>
public class ModernThreeWayDialog : UserControl
{
    public string Title { get; set; }
    public string Message { get; set; }
    public string Option1Text { get; set; }
    public string Option2Text { get; set; }
    public string Option3Text { get; set; }
}

/// <summary>
/// Modern input dialog control
/// </summary>
public class ModernInputDialog : UserControl
{
    public string Title { get; set; }
    public string Message { get; set; }
    public string InputText { get; set; }
    public string PlaceholderText { get; set; }
}

/// <summary>
/// Modern numeric input dialog control
/// </summary>
public class ModernNumericInputDialog : UserControl
{
    public string Title { get; set; }
    public string Message { get; set; }
    public double Value { get; set; }
    public double MinValue { get; set; }
    public double MaxValue { get; set; }
}

/// <summary>
/// Modern selection dialog control
/// </summary>
public class ModernSelectionDialog<T> : UserControl
{
    public string Title { get; set; }
    public string Message { get; set; }
    public List<T> Items { get; set; }
    public string DisplayMemberPath { get; set; }
}

/// <summary>
/// Modern message dialog control
/// </summary>
public class ModernMessageDialog : UserControl
{
    public string Title { get; set; }
    public string Message { get; set; }
    public PackIconKind Icon { get; set; }
}

/// <summary>
/// Modern error details dialog control
/// </summary>
public class ModernErrorDetailsDialog : UserControl
{
    public string Title { get; set; }
    public Exception Exception { get; set; }
}

/// <summary>
/// Modern progress dialog control
/// </summary>
public class ModernProgressDialog : UserControl, IProgressDialog
{
    public string Title { get; set; }
    public string Message { get; set; }
    public bool IsCancellable { get; set; }

    public event Action CancelRequested;

    public void UpdateProgress(double percentage, string message = null)
    {
        // Implementation would update progress bar and message
    }

    public void Complete()
    {
        // Implementation would close dialog
    }

    public void Cancel()
    {
        // Implementation would close dialog with cancelled state
    }

    public void Error(string errorMessage)
    {
        // Implementation would show error state
    }
}

#endregion