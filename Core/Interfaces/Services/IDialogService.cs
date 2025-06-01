// E:\kp\4 invoice\Core\Interfaces\Services\IDialogService.cs
namespace InvoiceApp.Core.Interfaces.Services;

public interface IDialogService
{
    Task ShowMessageAsync(string title, string message);
    Task ShowErrorAsync(string title, string message);
    Task ShowWarningAsync(string title, string message);
    Task ShowInfoAsync(string title, string message);
    Task<bool> ShowConfirmAsync(string title, string message, string yesText = "Yes", string noText = "No");
    Task<string?> ShowInputAsync(string title, string message, string defaultValue = "");
    Task<string?> ShowPasswordAsync(string title, string message);
    Task<T?> ShowDialogAsync<T>(object viewModel) where T : class;
    Task<string?> ShowOpenFileDialogAsync(string title, string filter, string initialDirectory = "");
    Task<string?> ShowSaveFileDialogAsync(string title, string filter, string fileName = "", string initialDirectory = "");
    Task<string?> ShowFolderBrowserDialogAsync(string title, string initialDirectory = "");
    Task<IEnumerable<string>> ShowOpenMultipleFilesDialogAsync(string title, string filter, string initialDirectory = "");
    Task CloseDialogAsync<T>() where T : class;
    Task CloseAllDialogsAsync();
}
