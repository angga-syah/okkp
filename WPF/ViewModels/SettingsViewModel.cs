// E:\kp\4 invoice\WPF\ViewModels\SettingsViewModel.cs
using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using InvoiceApp.Core.Interfaces.Services;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;
using InvoiceApp.WPF.Services;

namespace InvoiceApp.WPF.ViewModels;

/// <summary>
/// Settings ViewModel for managing application configuration
/// Provides comprehensive settings management with modern UI organization
/// </summary>
public partial class SettingsViewModel : BaseViewModel
{
    private readonly ISettingsService _settingsService;
    private readonly IThemeService _themeService;
    private readonly IBackupService _backupService;
    private readonly IUserService _userService;

    [ObservableProperty]
    private ObservableCollection<SettingsCategoryViewModel> _categories;

    [ObservableProperty]
    private SettingsCategoryViewModel _selectedCategory;

    [ObservableProperty]
    private bool _hasUnsavedChanges = false;

    // General Settings
    [ObservableProperty]
    private string _companyName = "PT. FORTUNA SADA NIOGA";

    [ObservableProperty]
    private string _companyTagline = "Spirit of Services";

    [ObservableProperty]
    private string _defaultInvoicePlace = "Jakarta";

    [ObservableProperty]
    private decimal _defaultVatPercentage = 11.0m;

    [ObservableProperty]
    private string _invoiceNumberFormat = "INV-{YYYY}{MM}-{0000}";

    [ObservableProperty]
    private int _autoSaveInterval = 30;

    [ObservableProperty]
    private bool _enableAutoSave = true;

    // Appearance Settings
    [ObservableProperty]
    private ThemeMode _selectedTheme = ThemeMode.Modern;

    [ObservableProperty]
    private string _selectedLanguage = "en-US";

    [ObservableProperty]
    private DateFormat _selectedDateFormat = DateFormat.DD_MM_YYYY;

    [ObservableProperty]
    private NumberFormat _selectedNumberFormat = NumberFormat.Decimal;

    [ObservableProperty]
    private bool _enableAnimations = true;

    [ObservableProperty]
    private bool _enableSounds = false;

    // Database Settings
    [ObservableProperty]
    private string _databaseHost = "localhost";

    [ObservableProperty]
    private int _databasePort = 5432;

    [ObservableProperty]
    private string _databaseName = "invoice_management";

    [ObservableProperty]
    private string _databaseUsername = "postgres";

    [ObservableProperty]
    private int _connectionTimeout = 30;

    [ObservableProperty]
    private int _commandTimeout = 60;

    [ObservableProperty]
    private bool _enableConnectionPooling = true;

    [ObservableProperty]
    private int _maxPoolSize = 100;

    // Performance Settings
    [ObservableProperty]
    private int _cacheExpirationMinutes = 30;

    [ObservableProperty]
    private bool _enableCaching = true;

    [ObservableProperty]
    private bool _enableVirtualization = true;

    [ObservableProperty]
    private int _virtualizationThreshold = 100;

    [ObservableProperty]
    private bool _enableBackgroundTasks = true;

    [ObservableProperty]
    private int _backgroundTaskInterval = 5;

    // Security Settings
    [ObservableProperty]
    private int _sessionTimeoutMinutes = 480;

    [ObservableProperty]
    private bool _requirePasswordChange = false;

    [ObservableProperty]
    private int _passwordExpirationDays = 90;

    [ObservableProperty]
    private int _maxLoginAttempts = 5;

    [ObservableProperty]
    private bool _enableAuditLogging = true;

    [ObservableProperty]
    private bool _enableDataEncryption = false;

    // Backup Settings
    [ObservableProperty]
    private bool _enableAutoBackup = true;

    [ObservableProperty]
    private string _backupPath = @"C:\InvoiceBackups";

    [ObservableProperty]
    private int _backupIntervalHours = 24;

    [ObservableProperty]
    private int _backupRetentionDays = 30;

    [ObservableProperty]
    private BackupType _backupType = BackupType.Full;

    [ObservableProperty]
    private bool _compressBackups = true;

    // Print Settings
    [ObservableProperty]
    private string _defaultPrinter = string.Empty;

    [ObservableProperty]
    private PrintOrientation _defaultOrientation = PrintOrientation.Portrait;

    [ObservableProperty]
    private double _leftMargin = 20;

    [ObservableProperty]
    private double _rightMargin = 20;

    [ObservableProperty]
    private double _topMargin = 20;

    [ObservableProperty]
    private double _bottomMargin = 20;

    [ObservableProperty]
    private bool _showBankInfoOnLastPage = true;

    [ObservableProperty]
    private bool _enablePrintPreview = true;

    // Lists
    [ObservableProperty]
    private ObservableCollection<BankAccountDto> _bankAccounts;

    [ObservableProperty]
    private ObservableCollection<UserDto> _users;

    private UserDto _currentUser;

    public SettingsViewModel(
        ISettingsService settingsService,
        IThemeService themeService,
        IBackupService backupService,
        IUserService userService,
        ILogger<SettingsViewModel> logger,
        IDialogService dialogService,
        INotificationService notificationService,
        INavigationService navigationService)
        : base(logger, dialogService, notificationService, navigationService)
    {
        _settingsService = settingsService ?? throw new ArgumentNullException(nameof(settingsService));
        _themeService = themeService ?? throw new ArgumentNullException(nameof(themeService));
        _backupService = backupService ?? throw new ArgumentNullException(nameof(backupService));
        _userService = userService ?? throw new ArgumentNullException(nameof(userService));

        Title = "Settings";

        // Initialize collections
        _categories = new ObservableCollection<SettingsCategoryViewModel>();
        _bankAccounts = new ObservableCollection<BankAccountDto>();
        _users = new ObservableCollection<UserDto>();

        InitializeCategories();
    }

    #region Properties

    public List<ThemeMode> AvailableThemes => Enum.GetValues<ThemeMode>().ToList();
    public List<string> AvailableLanguages => new() { "en-US", "id-ID" };
    public List<DateFormat> AvailableDateFormats => Enum.GetValues<DateFormat>().ToList();
    public List<NumberFormat> AvailableNumberFormats => Enum.GetValues<NumberFormat>().ToList();
    public List<BackupType> AvailableBackupTypes => Enum.GetValues<BackupType>().ToList();
    public List<PrintOrientation> AvailableOrientations => Enum.GetValues<PrintOrientation>().ToList();

    public bool CanManageUsers => _currentUser?.Role == UserRole.Admin;
    public bool CanManageDatabase => _currentUser?.Role == UserRole.Admin;
    public bool CanManageSecurity => _currentUser?.Role == UserRole.Admin;

    #endregion

    #region Commands

    [RelayCommand]
    private async Task SaveSettingsAsync()
    {
        await ExecuteWithLoadingAsync(async () =>
        {
            try
            {
                await SaveAllSettingsAsync();
                HasUnsavedChanges = false;
                
                await _notificationService.ShowSuccessAsync("Settings saved successfully");
                _logger.LogInformation("Settings saved by user: {Username}", _currentUser?.Username);
            }
            catch (Exception ex)
            {
                await HandleErrorAsync(ex, "Failed to save settings");
            }
        }, "Saving settings...");
    }

    [RelayCommand]
    private async Task ResetToDefaultsAsync()
    {
        var confirmed = await _dialogService.ShowConfirmationAsync(
            "Reset Settings",
            "Are you sure you want to reset all settings to their default values? This action cannot be undone.");

        if (confirmed)
        {
            await ExecuteWithLoadingAsync(async () =>
            {
                try
                {
                    await ResetSettingsToDefaultsAsync();
                    await LoadSettingsAsync();
                    
                    await _notificationService.ShowSuccessAsync("Settings reset to defaults");
                }
                catch (Exception ex)
                {
                    await HandleErrorAsync(ex, "Failed to reset settings");
                }
            }, "Resetting settings...");
        }
    }

    [RelayCommand]
    private async Task TestDatabaseConnectionAsync()
    {
        await ExecuteWithLoadingAsync(async () =>
        {
            try
            {
                var connectionString = BuildConnectionString();
                var result = await _userService.TestDatabaseConnectionAsync(connectionString);
                
                if (result.IsSuccess)
                {
                    await _notificationService.ShowSuccessAsync("Database connection successful");
                }
                else
                {
                    await _notificationService.ShowErrorAsync($"Database connection failed: {result.ErrorMessage}");
                }
            }
            catch (Exception ex)
            {
                await HandleErrorAsync(ex, "Failed to test database connection");
            }
        }, "Testing connection...");
    }

    [RelayCommand]
    private async Task SelectBackupPathAsync()
    {
        var selectedPath = await _dialogService.ShowFolderBrowserDialogAsync(
            "Select Backup Location", BackupPath);

        if (!string.IsNullOrEmpty(selectedPath))
        {
            BackupPath = selectedPath;
            MarkAsChanged();
        }
    }

    [RelayCommand]
    private async Task CreateBackupNowAsync()
    {
        await ExecuteWithLoadingAsync(async () =>
        {
            try
            {
                var backupFile = await _backupService.CreateBackupAsync(BackupPath, BackupType);
                
                await _notificationService.ShowSuccessAsync($"Backup created: {Path.GetFileName(backupFile)}");
            }
            catch (Exception ex)
            {
                await HandleErrorAsync(ex, "Failed to create backup");
            }
        }, "Creating backup...");
    }

    [RelayCommand]
    private async Task AddBankAccountAsync()
    {
        var bankAccount = new BankAccountDto
        {
            BankName = "New Bank",
            AccountNumber = "",
            AccountName = CompanyName,
            IsActive = true
        };

        // Navigate to bank account detail or show edit dialog
        // For now, add to collection
        BankAccounts.Add(bankAccount);
        MarkAsChanged();
    }

    [RelayCommand]
    private async Task EditBankAccountAsync(BankAccountDto bankAccount)
    {
        if (bankAccount == null) return;

        // Implementation would show edit dialog or navigate to detail view
        await _dialogService.ShowInfoAsync("Edit Bank Account", "Bank account editing dialog would open here");
    }

    [RelayCommand]
    private async Task DeleteBankAccountAsync(BankAccountDto bankAccount)
    {
        if (bankAccount == null) return;

        var confirmed = await _dialogService.ShowDeleteConfirmationAsync(
            bankAccount.BankName, "bank account");

        if (confirmed)
        {
            BankAccounts.Remove(bankAccount);
            MarkAsChanged();
        }
    }

    [RelayCommand]
    private async Task ManageUsersAsync()
    {
        if (!CanManageUsers)
        {
            await _notificationService.ShowWarningAsync("You don't have permission to manage users");
            return;
        }

        try
        {
            await NavigateToAsync<UserManagementViewModel>();
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to open user management");
        }
    }

    [RelayCommand]
    private async Task ApplyThemeAsync()
    {
        try
        {
            await _themeService.ApplyThemeAsync(SelectedTheme);
            MarkAsChanged();
            
            await _notificationService.ShowSuccessAsync("Theme applied successfully");
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to apply theme");
        }
    }

    [RelayCommand]
    private async Task ImportSettingsAsync()
    {
        var filePath = await _dialogService.ShowOpenFileDialogAsync(
            "Import Settings",
            "JSON Files (*.json)|*.json|All Files (*.*)|*.*");

        if (!string.IsNullOrEmpty(filePath))
        {
            await ExecuteWithLoadingAsync(async () =>
            {
                try
                {
                    await _settingsService.ImportSettingsAsync(filePath);
                    await LoadSettingsAsync();
                    
                    await _notificationService.ShowSuccessAsync("Settings imported successfully");
                }
                catch (Exception ex)
                {
                    await HandleErrorAsync(ex, "Failed to import settings");
                }
            }, "Importing settings...");
        }
    }

    [RelayCommand]
    private async Task ExportSettingsAsync()
    {
        var filePath = await _dialogService.ShowSaveFileDialogAsync(
            "Export Settings",
            "JSON Files (*.json)|*.json",
            $"settings_export_{DateTime.Now:yyyyMMdd}.json");

        if (!string.IsNullOrEmpty(filePath))
        {
            await ExecuteWithLoadingAsync(async () =>
            {
                try
                {
                    await _settingsService.ExportSettingsAsync(filePath);
                    
                    await _notificationService.ShowSuccessAsync("Settings exported successfully");
                }
                catch (Exception ex)
                {
                    await HandleErrorAsync(ex, "Failed to export settings");
                }
            }, "Exporting settings...");
        }
    }

    #endregion

    #region Protected Overrides

    protected override async Task OnInitializeAsync()
    {
        try
        {
            _currentUser = System.Windows.Application.Current.Properties["CurrentUser"] as UserDto;
            
            if (_currentUser == null)
            {
                _logger.LogWarning("No current user found");
                return;
            }

            await LoadSettingsAsync();
            await LoadBankAccountsAsync();
            
            if (CanManageUsers)
            {
                await LoadUsersAsync();
            }

            // Select first category
            SelectedCategory = Categories.FirstOrDefault();
            
            _logger.LogInformation("Settings initialized for user: {Username}", _currentUser.Username);
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to initialize settings");
        }
    }

    #endregion

    #region Private Methods

    private void InitializeCategories()
    {
        Categories.Clear();

        Categories.Add(new SettingsCategoryViewModel
        {
            Name = "General",
            Icon = "Cog",
            Description = "Basic application settings"
        });

        Categories.Add(new SettingsCategoryViewModel
        {
            Name = "Appearance",
            Icon = "Palette",
            Description = "Theme and visual settings"
        });

        if (CanManageDatabase)
        {
            Categories.Add(new SettingsCategoryViewModel
            {
                Name = "Database",
                Icon = "Database",
                Description = "Database connection settings"
            });
        }

        Categories.Add(new SettingsCategoryViewModel
        {
            Name = "Performance",
            Icon = "Speedometer",
            Description = "Performance and caching settings"
        });

        if (CanManageSecurity)
        {
            Categories.Add(new SettingsCategoryViewModel
            {
                Name = "Security",
                Icon = "Security",
                Description = "Security and authentication settings"
            });
        }

        Categories.Add(new SettingsCategoryViewModel
        {
            Name = "Backup",
            Icon = "Backup",
            Description = "Backup and restore settings"
        });

        Categories.Add(new SettingsCategoryViewModel
        {
            Name = "Print",
            Icon = "Printer",
            Description = "Printing preferences"
        });

        Categories.Add(new SettingsCategoryViewModel
        {
            Name = "Bank Accounts",
            Icon = "Bank",
            Description = "Manage bank account information"
        });

        if (CanManageUsers)
        {
            Categories.Add(new SettingsCategoryViewModel
            {
                Name = "Users",
                Icon = "Account",
                Description = "User management"
            });
        }
    }

    private async Task LoadSettingsAsync()
    {
        try
        {
            // Load all settings from service
            CompanyName = await _settingsService.GetSettingAsync("company_name", CompanyName);
            CompanyTagline = await _settingsService.GetSettingAsync("company_tagline", CompanyTagline);
            DefaultInvoicePlace = await _settingsService.GetSettingAsync("invoice_place", DefaultInvoicePlace);
            DefaultVatPercentage = await _settingsService.GetSettingAsync("default_vat_percentage", DefaultVatPercentage);
            InvoiceNumberFormat = await _settingsService.GetSettingAsync("invoice_number_format", InvoiceNumberFormat);
            AutoSaveInterval = await _settingsService.GetSettingAsync("auto_save_interval", AutoSaveInterval);
            EnableAutoSave = await _settingsService.GetSettingAsync("enable_auto_save", EnableAutoSave);

            // Appearance settings
            var themeString = await _settingsService.GetSettingAsync("ui_theme", SelectedTheme.ToString());
            if (Enum.TryParse<ThemeMode>(themeString, out var theme))
                SelectedTheme = theme;

            SelectedLanguage = await _settingsService.GetSettingAsync("language", SelectedLanguage);
            
            var dateFormatString = await _settingsService.GetSettingAsync("date_format", SelectedDateFormat.ToString());
            if (Enum.TryParse<DateFormat>(dateFormatString, out var dateFormat))
                SelectedDateFormat = dateFormat;

            EnableAnimations = await _settingsService.GetSettingAsync("enable_animations", EnableAnimations);
            EnableSounds = await _settingsService.GetSettingAsync("enable_sounds", EnableSounds);

            // Database settings
            DatabaseHost = await _settingsService.GetSettingAsync("db_host", DatabaseHost);
            DatabasePort = await _settingsService.GetSettingAsync("db_port", DatabasePort);
            DatabaseName = await _settingsService.GetSettingAsync("db_name", DatabaseName);
            DatabaseUsername = await _settingsService.GetSettingAsync("db_username", DatabaseUsername);
            ConnectionTimeout = await _settingsService.GetSettingAsync("db_connection_timeout", ConnectionTimeout);
            CommandTimeout = await _settingsService.GetSettingAsync("db_command_timeout", CommandTimeout);
            EnableConnectionPooling = await _settingsService.GetSettingAsync("db_enable_pooling", EnableConnectionPooling);
            MaxPoolSize = await _settingsService.GetSettingAsync("db_max_pool_size", MaxPoolSize);

            // Continue loading other settings...
            
            HasUnsavedChanges = false;
            _logger.LogDebug("Settings loaded successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load settings");
            throw;
        }
    }

    private async Task SaveAllSettingsAsync()
    {
        // Save all settings
        await _settingsService.SetSettingAsync("company_name", CompanyName);
        await _settingsService.SetSettingAsync("company_tagline", CompanyTagline);
        await _settingsService.SetSettingAsync("invoice_place", DefaultInvoicePlace);
        await _settingsService.SetSettingAsync("default_vat_percentage", DefaultVatPercentage);
        await _settingsService.SetSettingAsync("invoice_number_format", InvoiceNumberFormat);
        await _settingsService.SetSettingAsync("auto_save_interval", AutoSaveInterval);
        await _settingsService.SetSettingAsync("enable_auto_save", EnableAutoSave);

        // Appearance settings
        await _settingsService.SetSettingAsync("ui_theme", SelectedTheme.ToString());
        await _settingsService.SetSettingAsync("language", SelectedLanguage);
        await _settingsService.SetSettingAsync("date_format", SelectedDateFormat.ToString());
        await _settingsService.SetSettingAsync("enable_animations", EnableAnimations);
        await _settingsService.SetSettingAsync("enable_sounds", EnableSounds);

        // Database settings
        await _settingsService.SetSettingAsync("db_host", DatabaseHost);
        await _settingsService.SetSettingAsync("db_port", DatabasePort);
        await _settingsService.SetSettingAsync("db_name", DatabaseName);
        await _settingsService.SetSettingAsync("db_username", DatabaseUsername);
        await _settingsService.SetSettingAsync("db_connection_timeout", ConnectionTimeout);
        await _settingsService.SetSettingAsync("db_command_timeout", CommandTimeout);
        await _settingsService.SetSettingAsync("db_enable_pooling", EnableConnectionPooling);
        await _settingsService.SetSettingAsync("db_max_pool_size", MaxPoolSize);

        // Continue saving other settings...
    }

    private async Task ResetSettingsToDefaultsAsync()
    {
        // Reset all settings to default values
        CompanyName = "PT. FORTUNA SADA NIOGA";
        CompanyTagline = "Spirit of Services";
        DefaultInvoicePlace = "Jakarta";
        DefaultVatPercentage = 11.0m;
        InvoiceNumberFormat = "INV-{YYYY}{MM}-{0000}";
        AutoSaveInterval = 30;
        EnableAutoSave = true;

        SelectedTheme = ThemeMode.Modern;
        SelectedLanguage = "en-US";
        SelectedDateFormat = DateFormat.DD_MM_YYYY;
        EnableAnimations = true;
        EnableSounds = false;

        // Reset other settings...
        MarkAsChanged();
    }

    private async Task LoadBankAccountsAsync()
    {
        try
        {
            // Load bank accounts from service
            var bankAccounts = await _settingsService.GetBankAccountsAsync();
            
            BankAccounts.Clear();
            foreach (var account in bankAccounts)
            {
                BankAccounts.Add(account);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load bank accounts");
        }
    }

    private async Task LoadUsersAsync()
    {
        try
        {
            var users = await _userService.GetAllUsersAsync();
            
            Users.Clear();
            foreach (var user in users)
            {
                Users.Add(user);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load users");
        }
    }

    private string BuildConnectionString()
    {
        return $"Host={DatabaseHost};Port={DatabasePort};Database={DatabaseName};Username={DatabaseUsername};Timeout={ConnectionTimeout};CommandTimeout={CommandTimeout};Pooling={EnableConnectionPooling};MaxPoolSize={MaxPoolSize};";
    }

    private void MarkAsChanged()
    {
        HasUnsavedChanges = true;
    }

    #endregion

    #region Property Change Notifications

    // Mark as changed when any setting property changes
    partial void OnCompanyNameChanged(string value) => MarkAsChanged();
    partial void OnCompanyTaglineChanged(string value) => MarkAsChanged();
    partial void OnDefaultInvoicePlaceChanged(string value) => MarkAsChanged();
    partial void OnDefaultVatPercentageChanged(decimal value) => MarkAsChanged();
    partial void OnInvoiceNumberFormatChanged(string value) => MarkAsChanged();
    partial void OnAutoSaveIntervalChanged(int value) => MarkAsChanged();
    partial void OnEnableAutoSaveChanged(bool value) => MarkAsChanged();
    partial void OnSelectedThemeChanged(ThemeMode value) => MarkAsChanged();
    partial void OnSelectedLanguageChanged(string value) => MarkAsChanged();
    partial void OnSelectedDateFormatChanged(DateFormat value) => MarkAsChanged();
    partial void OnEnableAnimationsChanged(bool value) => MarkAsChanged();
    partial void OnEnableSoundsChanged(bool value) => MarkAsChanged();

    #endregion
}

#region Helper Classes

public class SettingsCategoryViewModel
{
    public string Name { get; set; }
    public string Icon { get; set; }
    public string Description { get; set; }
}

// Placeholder ViewModels
public class UserManagementViewModel : BaseViewModel
{
    public UserManagementViewModel(ILogger<UserManagementViewModel> logger, IDialogService dialogService, 
        INotificationService notificationService, INavigationService navigationService) 
        : base(logger, dialogService, notificationService, navigationService) { }
}

#endregion