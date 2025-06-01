using System.ComponentModel;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Win32;
using MaterialDesignThemes.Wpf;

namespace InvoiceApp.WPF.Controls;

public partial class FileUploadControl : UserControl, INotifyPropertyChanged
{
    // Dependency Properties
    public static readonly DependencyProperty TitleProperty =
        DependencyProperty.Register(nameof(Title), typeof(string), typeof(FileUploadControl),
            new PropertyMetadata("Upload File"));

    public static readonly DependencyProperty DropTextProperty =
        DependencyProperty.Register(nameof(DropText), typeof(string), typeof(FileUploadControl),
            new PropertyMetadata("Drag and drop files here"));

    public static readonly DependencyProperty SecondaryTextProperty =
        DependencyProperty.Register(nameof(SecondaryText), typeof(string), typeof(FileUploadControl),
            new PropertyMetadata("or click to browse"));

    public static readonly DependencyProperty AcceptedExtensionsProperty =
        DependencyProperty.Register(nameof(AcceptedExtensions), typeof(string[]), typeof(FileUploadControl),
            new PropertyMetadata(new string[] { ".xlsx", ".xls", ".csv", ".pdf" }));

    public static readonly DependencyProperty MaxFileSizeProperty =
        DependencyProperty.Register(nameof(MaxFileSize), typeof(long), typeof(FileUploadControl),
            new PropertyMetadata(10L * 1024 * 1024)); // 10MB default

    public static readonly DependencyProperty AllowMultipleFilesProperty =
        DependencyProperty.Register(nameof(AllowMultipleFiles), typeof(bool), typeof(FileUploadControl),
            new PropertyMetadata(false));

    public static readonly DependencyProperty ShowTitleProperty =
        DependencyProperty.Register(nameof(ShowTitle), typeof(bool), typeof(FileUploadControl),
            new PropertyMetadata(true));

    public static readonly DependencyProperty ShowBrowseButtonProperty =
        DependencyProperty.Register(nameof(ShowBrowseButton), typeof(bool), typeof(FileUploadControl),
            new PropertyMetadata(true));

    public static readonly DependencyProperty ShowFooterActionsProperty =
        DependencyProperty.Register(nameof(ShowFooterActions), typeof(bool), typeof(FileUploadControl),
            new PropertyMetadata(true));

    public static readonly DependencyProperty ShowUploadButtonProperty =
        DependencyProperty.Register(nameof(ShowUploadButton), typeof(bool), typeof(FileUploadControl),
            new PropertyMetadata(true));

    public static readonly DependencyProperty ShowCancelButtonProperty =
        DependencyProperty.Register(nameof(ShowCancelButton), typeof(bool), typeof(FileUploadControl),
            new PropertyMetadata(true));

    public static readonly DependencyProperty UploadButtonTextProperty =
        DependencyProperty.Register(nameof(UploadButtonText), typeof(string), typeof(FileUploadControl),
            new PropertyMetadata("Upload"));

    public static readonly DependencyProperty AutoUploadProperty =
        DependencyProperty.Register(nameof(AutoUpload), typeof(bool), typeof(FileUploadControl),
            new PropertyMetadata(false));

    // Properties
    public string Title
    {
        get => (string)GetValue(TitleProperty);
        set => SetValue(TitleProperty, value);
    }

    public string DropText
    {
        get => (string)GetValue(DropTextProperty);
        set => SetValue(DropTextProperty, value);
    }

    public string SecondaryText
    {
        get => (string)GetValue(SecondaryTextProperty);
        set => SetValue(SecondaryTextProperty, value);
    }

    public string[] AcceptedExtensions
    {
        get => (string[])GetValue(AcceptedExtensionsProperty);
        set => SetValue(AcceptedExtensionsProperty, value);
    }

    public long MaxFileSize
    {
        get => (long)GetValue(MaxFileSizeProperty);
        set => SetValue(MaxFileSizeProperty, value);
    }

    public bool AllowMultipleFiles
    {
        get => (bool)GetValue(AllowMultipleFilesProperty);
        set => SetValue(AllowMultipleFilesProperty, value);
    }

    public bool ShowTitle
    {
        get => (bool)GetValue(ShowTitleProperty);
        set => SetValue(ShowTitleProperty, value);
    }

    public bool ShowBrowseButton
    {
        get => (bool)GetValue(ShowBrowseButtonProperty);
        set => SetValue(ShowBrowseButtonProperty, value);
    }

    public bool ShowFooterActions
    {
        get => (bool)GetValue(ShowFooterActionsProperty);
        set => SetValue(ShowFooterActionsProperty, value);
    }

    public bool ShowUploadButton
    {
        get => (bool)GetValue(ShowUploadButtonProperty);
        set => SetValue(ShowUploadButtonProperty, value);
    }

    public bool ShowCancelButton
    {
        get => (bool)GetValue(ShowCancelButtonProperty);
        set => SetValue(ShowCancelButtonProperty, value);
    }

    public string UploadButtonText
    {
        get => (string)GetValue(UploadButtonTextProperty);
        set => SetValue(UploadButtonTextProperty, value);
    }

    public bool AutoUpload
    {
        get => (bool)GetValue(AutoUploadProperty);
        set => SetValue(AutoUploadProperty, value);
    }

    // Bindable Properties
    private bool _isDragOver;
    public bool IsDragOver
    {
        get => _isDragOver;
        set
        {
            _isDragOver = value;
            OnPropertyChanged();
        }
    }

    private bool _hasFile;
    public bool HasFile
    {
        get => _hasFile;
        set
        {
            _hasFile = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(CanUpload));
        }
    }

    private string _fileName = string.Empty;
    public string FileName
    {
        get => _fileName;
        set
        {
            _fileName = value;
            OnPropertyChanged();
        }
    }

    private string _fileSizeText = string.Empty;
    public string FileSizeText
    {
        get => _fileSizeText;
        set
        {
            _fileSizeText = value;
            OnPropertyChanged();
        }
    }

    private string _fileTypeText = string.Empty;
    public string FileTypeText
    {
        get => _fileTypeText;
        set
        {
            _fileTypeText = value;
            OnPropertyChanged();
        }
    }

    private double _uploadProgress;
    public double UploadProgress
    {
        get => _uploadProgress;
        set
        {
            _uploadProgress = value;
            OnPropertyChanged();
        }
    }

    private bool _isUploading;
    public bool IsUploading
    {
        get => _isUploading;
        set
        {
            _isUploading = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(CanUpload));
        }
    }

    private string _uploadStatusText = string.Empty;
    public string UploadStatusText
    {
        get => _uploadStatusText;
        set
        {
            _uploadStatusText = value;
            OnPropertyChanged();
        }
    }

    private string _validationError = string.Empty;
    public string ValidationError
    {
        get => _validationError;
        set
        {
            _validationError = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(HasValidationError));
        }
    }

    public bool HasValidationError => !string.IsNullOrEmpty(ValidationError);

    public bool CanUpload => HasFile && !IsUploading && !HasValidationError;

    // Private fields
    private FileInfo? _selectedFile;
    private List<FileInfo> _selectedFiles = new();

    // Events
    public static readonly RoutedEvent FileSelectedEvent =
        EventManager.RegisterRoutedEvent(nameof(FileSelected), RoutingStrategy.Bubble,
            typeof(EventHandler<FileSelectedEventArgs>), typeof(FileUploadControl));

    public static readonly RoutedEvent UploadRequestedEvent =
        EventManager.RegisterRoutedEvent(nameof(UploadRequested), RoutingStrategy.Bubble,
            typeof(EventHandler<UploadRequestedEventArgs>), typeof(FileUploadControl));

    public static readonly RoutedEvent UploadCancelledEvent =
        EventManager.RegisterRoutedEvent(nameof(UploadCancelled), RoutingStrategy.Bubble,
            typeof(RoutedEventHandler), typeof(FileUploadControl));

    public static readonly RoutedEvent FileRemovedEvent =
        EventManager.RegisterRoutedEvent(nameof(FileRemoved), RoutingStrategy.Bubble,
            typeof(RoutedEventHandler), typeof(FileUploadControl));

    public event EventHandler<FileSelectedEventArgs> FileSelected
    {
        add => AddHandler(FileSelectedEvent, value);
        remove => RemoveHandler(FileSelectedEvent, value);
    }

    public event EventHandler<UploadRequestedEventArgs> UploadRequested
    {
        add => AddHandler(UploadRequestedEvent, value);
        remove => RemoveHandler(UploadRequestedEvent, value);
    }

    public event RoutedEventHandler UploadCancelled
    {
        add => AddHandler(UploadCancelledEvent, value);
        remove => RemoveHandler(UploadCancelledEvent, value);
    }

    public event RoutedEventHandler FileRemoved
    {
        add => AddHandler(FileRemovedEvent, value);
        remove => RemoveHandler(FileRemovedEvent, value);
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public FileUploadControl()
    {
        InitializeComponent();
        UpdateFileIcon();
    }

    // Event Handlers
    private void DropZone_Drop(object sender, DragEventArgs e)
    {
        IsDragOver = false;

        if (e.Data.GetDataPresent(DataFormats.FileDrop))
        {
            var files = (string[])e.Data.GetData(DataFormats.FileDrop);
            HandleFiles(files);
        }
    }

    private void DropZone_DragEnter(object sender, DragEventArgs e)
    {
        if (e.Data.GetDataPresent(DataFormats.FileDrop))
        {
            IsDragOver = true;
            e.Effects = DragDropEffects.Copy;
        }
        else
        {
            e.Effects = DragDropEffects.None;
        }
    }

    private void DropZone_DragLeave(object sender, DragEventArgs e)
    {
        IsDragOver = false;
    }

    private void DropZone_DragOver(object sender, DragEventArgs e)
    {
        e.Effects = e.Data.GetDataPresent(DataFormats.FileDrop) ? DragDropEffects.Copy : DragDropEffects.None;
    }

    private void DropZone_Click(object sender, RoutedEventArgs e)
    {
        OpenFileDialog();
    }

    private void BrowseButton_Click(object sender, RoutedEventArgs e)
    {
        OpenFileDialog();
    }

    private void ChangeButton_Click(object sender, RoutedEventArgs e)
    {
        OpenFileDialog();
    }

    private void RemoveButton_Click(object sender, RoutedEventArgs e)
    {
        RemoveFile();
    }

    private void UploadButton_Click(object sender, RoutedEventArgs e)
    {
        RequestUpload();
    }

    private void CancelButton_Click(object sender, RoutedEventArgs e)
    {
        CancelUpload();
    }

    // Private Methods
    private void OpenFileDialog()
    {
        var dialog = new OpenFileDialog
        {
            Multiselect = AllowMultipleFiles,
            Filter = CreateFileFilter(),
            Title = "Select Files"
        };

        if (dialog.ShowDialog() == true)
        {
            HandleFiles(dialog.FileNames);
        }
    }

    private string CreateFileFilter()
    {
        if (AcceptedExtensions == null || AcceptedExtensions.Length == 0)
            return "All Files (*.*)|*.*";

        var extensions = AcceptedExtensions.Select(ext => $"*{ext}").ToArray();
        var extensionList = string.Join(";", extensions);
        var description = $"Supported Files ({string.Join(", ", AcceptedExtensions)})";
        
        return $"{description}|{extensionList}|All Files (*.*)|*.*";
    }

    private void HandleFiles(string[] filePaths)
    {
        ValidationError = string.Empty;

        var files = filePaths.Select(path => new FileInfo(path)).ToList();

        // Validate files
        var validationResult = ValidateFiles(files);
        if (!validationResult.IsValid)
        {
            ValidationError = validationResult.ErrorMessage;
            return;
        }

        if (AllowMultipleFiles)
        {
            _selectedFiles = files;
            UpdateMultipleFileDisplay();
        }
        else
        {
            _selectedFile = files.First();
            UpdateSingleFileDisplay();
        }

        HasFile = true;
        RaiseFileSelectedEvent();

        if (AutoUpload)
        {
            RequestUpload();
        }
    }

    private ValidationResult ValidateFiles(List<FileInfo> files)
    {
        if (!AllowMultipleFiles && files.Count > 1)
        {
            return new ValidationResult(false, "Only one file is allowed");
        }

        foreach (var file in files)
        {
            // Check file extension
            if (AcceptedExtensions != null && AcceptedExtensions.Length > 0)
            {
                var extension = file.Extension.ToLowerInvariant();
                var accepted = AcceptedExtensions.Select(ext => ext.ToLowerInvariant()).ToArray();
                
                if (!accepted.Contains(extension))
                {
                    return new ValidationResult(false, 
                        $"File type {extension} is not supported. Accepted types: {string.Join(", ", AcceptedExtensions)}");
                }
            }

            // Check file size
            if (file.Length > MaxFileSize)
            {
                return new ValidationResult(false, 
                    $"File size ({FormatFileSize(file.Length)}) exceeds maximum allowed size ({FormatFileSize(MaxFileSize)})");
            }

            // Check if file exists and is readable
            if (!file.Exists)
            {
                return new ValidationResult(false, $"File {file.Name} does not exist");
            }
        }

        return new ValidationResult(true, string.Empty);
    }

    private void UpdateSingleFileDisplay()
    {
        if (_selectedFile == null) return;

        FileName = _selectedFile.Name;
        FileSizeText = FormatFileSize(_selectedFile.Length);
        FileTypeText = GetFileTypeDescription(_selectedFile.Extension);
        UpdateFileIcon(_selectedFile.Extension);
    }

    private void UpdateMultipleFileDisplay()
    {
        if (_selectedFiles.Count == 0) return;

        FileName = $"{_selectedFiles.Count} files selected";
        var totalSize = _selectedFiles.Sum(f => f.Length);
        FileSizeText = $"Total: {FormatFileSize(totalSize)}";
        FileTypeText = "Multiple file types";
        UpdateFileIcon();
    }

    private void UpdateFileIcon(string? extension = null)
    {
        PackIconKind iconKind = extension?.ToLowerInvariant() switch
        {
            ".pdf" => PackIconKind.FilePdf,
            ".xlsx" or ".xls" => PackIconKind.FileExcel,
            ".csv" => PackIconKind.FileDelimited,
            ".docx" or ".doc" => PackIconKind.FileWord,
            ".pptx" or ".ppt" => PackIconKind.FilePowerpoint,
            ".zip" or ".rar" or ".7z" => PackIconKind.FileArchive,
            ".jpg" or ".jpeg" or ".png" or ".gif" or ".bmp" => PackIconKind.FileImage,
            ".mp4" or ".avi" or ".mov" or ".wmv" => PackIconKind.FileVideo,
            ".mp3" or ".wav" or ".flac" => PackIconKind.FileMusic,
            ".txt" => PackIconKind.FileDocument,
            _ => PackIconKind.File
        };

        if (FileIcon != null)
        {
            FileIcon.Kind = iconKind;
        }
    }

    private string GetFileTypeDescription(string extension)
    {
        return extension.ToLowerInvariant() switch
        {
            ".pdf" => "PDF Document",
            ".xlsx" => "Excel Workbook",
            ".xls" => "Excel 97-2003 Workbook",
            ".csv" => "Comma Separated Values",
            ".docx" => "Word Document",
            ".doc" => "Word 97-2003 Document",
            ".txt" => "Text File",
            ".zip" => "ZIP Archive",
            ".rar" => "RAR Archive",
            ".jpg" or ".jpeg" => "JPEG Image",
            ".png" => "PNG Image",
            ".gif" => "GIF Image",
            _ => $"{extension.TrimStart('.').ToUpperInvariant()} File"
        };
    }

    private string FormatFileSize(long bytes)
    {
        string[] sizes = { "B", "KB", "MB", "GB", "TB" };
        double len = bytes;
        int order = 0;
        
        while (len >= 1024 && order < sizes.Length - 1)
        {
            order++;
            len = len / 1024;
        }

        return $"{len:0.##} {sizes[order]}";
    }

    private void RemoveFile()
    {
        _selectedFile = null;
        _selectedFiles.Clear();
        HasFile = false;
        ValidationError = string.Empty;
        
        RaiseEvent(new RoutedEventArgs(FileRemovedEvent));
    }

    private void RequestUpload()
    {
        if (!CanUpload) return;

        var args = new UploadRequestedEventArgs
        {
            SingleFile = _selectedFile,
            MultipleFiles = _selectedFiles.ToList()
        };

        RaiseEvent(new RoutedEventArgs(UploadRequestedEvent, args));
    }

    private void CancelUpload()
    {
        IsUploading = false;
        UploadProgress = 0;
        UploadStatusText = string.Empty;
        
        RaiseEvent(new RoutedEventArgs(UploadCancelledEvent));
    }

    private void RaiseFileSelectedEvent()
    {
        var args = new FileSelectedEventArgs
        {
            SingleFile = _selectedFile,
            MultipleFiles = _selectedFiles.ToList()
        };

        RaiseEvent(new RoutedEventArgs(FileSelectedEvent, args));
    }

    // Public Methods
    public void SetUploadProgress(double progress, string statusText = "")
    {
        UploadProgress = Math.Max(0, Math.Min(100, progress));
        UploadStatusText = statusText;
        IsUploading = progress < 100;
    }

    public void SetUploadError(string errorMessage)
    {
        ValidationError = errorMessage;
        IsUploading = false;
        UploadProgress = 0;
        UploadStatusText = string.Empty;
    }

    public void SetUploadSuccess(string successMessage = "Upload completed successfully")
    {
        UploadProgress = 100;
        UploadStatusText = successMessage;
        IsUploading = false;
        ValidationError = string.Empty;
    }

    public void Reset()
    {
        RemoveFile();
        UploadProgress = 0;
        UploadStatusText = string.Empty;
        IsUploading = false;
    }

    public FileInfo? GetSelectedFile() => _selectedFile;
    public List<FileInfo> GetSelectedFiles() => _selectedFiles.ToList();

    protected virtual void OnPropertyChanged([System.Runtime.CompilerServices.CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }

    // Helper Classes
    private class ValidationResult
    {
        public bool IsValid { get; }
        public string ErrorMessage { get; }

        public ValidationResult(bool isValid, string errorMessage)
        {
            IsValid = isValid;
            ErrorMessage = errorMessage;
        }
    }
}

// Event Args Classes
public class FileSelectedEventArgs : RoutedEventArgs
{
    public FileInfo? SingleFile { get; set; }
    public List<FileInfo> MultipleFiles { get; set; } = new();
}

public class UploadRequestedEventArgs : RoutedEventArgs
{
    public FileInfo? SingleFile { get; set; }
    public List<FileInfo> MultipleFiles { get; set; } = new();
}