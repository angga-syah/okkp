using System;
using System.Threading.Tasks;
using System.Windows.Input;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using InvoiceApp.Core.Interfaces.Services;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;
using InvoiceApp.WPF.Services;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.WPF.ViewModels
{
    public partial class LoginViewModel : ObservableObject
    {
        private readonly IUserService _userService;
        private readonly ISettingsService _settingsService;
        private readonly IDialogService _dialogService;
        private readonly INavigationService _navigationService;
        private readonly ILogger<LoginViewModel> _logger;

        [ObservableProperty]
        private string _username = string.Empty;

        [ObservableProperty]
        private string _password = string.Empty;

        [ObservableProperty]
        private bool _isLoading;

        [ObservableProperty]
        private bool _rememberMe;

        [ObservableProperty]
        private string _errorMessage = string.Empty;

        [ObservableProperty]
        private bool _hasError;

        [ObservableProperty]
        private string _connectionStatus = "Checking connection...";

        [ObservableProperty]
        private bool _isConnected;

        public ICommand LoginCommand { get; }
        public ICommand TestConnectionCommand { get; }
        public ICommand SettingsCommand { get; }

        public LoginViewModel(
            IUserService userService,
            ISettingsService settingsService,
            IDialogService dialogService,
            INavigationService navigationService,
            ILogger<LoginViewModel> logger)
        {
            _userService = userService;
            _settingsService = settingsService;
            _dialogService = dialogService;
            _navigationService = navigationService;
            _logger = logger;

            LoginCommand = new AsyncRelayCommand(LoginAsync, CanLogin);
            TestConnectionCommand = new AsyncRelayCommand(TestConnectionAsync);
            SettingsCommand = new RelayCommand(ShowSettings);

            LoadSavedCredentials();
            _ = CheckConnectionStatusAsync();
        }

        private bool CanLogin() => !IsLoading && !string.IsNullOrWhiteSpace(Username) && !string.IsNullOrWhiteSpace(Password);

        private async Task LoginAsync()
        {
            try
            {
                IsLoading = true;
                HasError = false;
                ErrorMessage = string.Empty;

                _logger.LogInformation("Attempting login for user: {Username}", Username);

                var result = await _userService.AuthenticateAsync(Username, Password);

                if (result.IsSuccess)
                {
                    if (RememberMe)
                    {
                        await SaveCredentialsAsync();
                    }
                    else
                    {
                        await ClearSavedCredentialsAsync();
                    }

                    _logger.LogInformation("Login successful for user: {Username}", Username);
                    
                    // Update last login
                    await _userService.UpdateLastLoginAsync(result.User.Id);

                    // Navigate to main window
                    _navigationService.NavigateToMain(result.User);
                }
                else
                {
                    HasError = true;
                    ErrorMessage = result.ErrorMessage ?? "Invalid username or password";
                    _logger.LogWarning("Login failed for user: {Username}. Error: {Error}", Username, ErrorMessage);
                }
            }
            catch (Exception ex)
            {
                HasError = true;
                ErrorMessage = "Connection error. Please check your database settings.";
                _logger.LogError(ex, "Login error for user: {Username}", Username);
            }
            finally
            {
                IsLoading = false;
            }
        }

        private async Task TestConnectionAsync()
        {
            try
            {
                IsLoading = true;
                ConnectionStatus = "Testing connection...";

                var isConnected = await _userService.TestConnectionAsync();
                
                if (isConnected)
                {
                    ConnectionStatus = "Connected to database";
                    IsConnected = true;
                    await _dialogService.ShowInfoAsync("Connection successful!", "Database Connection");
                }
                else
                {
                    ConnectionStatus = "Unable to connect to database";
                    IsConnected = false;
                    await _dialogService.ShowErrorAsync("Unable to connect to database. Please check your settings.", "Connection Error");
                }
            }
            catch (Exception ex)
            {
                ConnectionStatus = "Connection failed";
                IsConnected = false;
                _logger.LogError(ex, "Database connection test failed");
                await _dialogService.ShowErrorAsync($"Connection test failed: {ex.Message}", "Connection Error");
            }
            finally
            {
                IsLoading = false;
            }
        }

        private void ShowSettings()
        {
            // Navigate to database settings
            _navigationService.ShowDatabaseSettings();
        }

        private async Task CheckConnectionStatusAsync()
        {
            try
            {
                var isConnected = await _userService.TestConnectionAsync();
                ConnectionStatus = isConnected ? "Connected to database" : "Database connection not available";
                IsConnected = isConnected;
            }
            catch (Exception ex)
            {
                ConnectionStatus = "Database connection error";
                IsConnected = false;
                _logger.LogError(ex, "Error checking connection status");
            }
        }

        private void LoadSavedCredentials()
        {
            try
            {
                var savedUsername = _settingsService.GetUserSetting("SavedUsername", string.Empty);
                var rememberMe = _settingsService.GetUserSetting("RememberCredentials", false);

                if (rememberMe && !string.IsNullOrWhiteSpace(savedUsername))
                {
                    Username = savedUsername;
                    RememberMe = true;
                    // Note: For security, we don't save passwords in plain text
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading saved credentials");
            }
        }

        private async Task SaveCredentialsAsync()
        {
            try
            {
                await _settingsService.SetUserSettingAsync("SavedUsername", Username);
                await _settingsService.SetUserSettingAsync("RememberCredentials", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving credentials");
            }
        }

        private async Task ClearSavedCredentialsAsync()
        {
            try
            {
                await _settingsService.SetUserSettingAsync("SavedUsername", string.Empty);
                await _settingsService.SetUserSettingAsync("RememberCredentials", false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error clearing saved credentials");
            }
        }

        partial void OnUsernameChanged(string value)
        {
            HasError = false;
            ErrorMessage = string.Empty;
            ((AsyncRelayCommand)LoginCommand).NotifyCanExecuteChanged();
        }

        partial void OnPasswordChanged(string value)
        {
            HasError = false;
            ErrorMessage = string.Empty;
            ((AsyncRelayCommand)LoginCommand).NotifyCanExecuteChanged();
        }
    }
}