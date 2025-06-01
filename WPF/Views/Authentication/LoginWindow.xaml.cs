using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using InvoiceApp.WPF.ViewModels;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.WPF.Views.Authentication
{
    public partial class LoginWindow : Window
    {
        private LoginViewModel ViewModel => (LoginViewModel)DataContext;

        public LoginWindow()
        {
            InitializeComponent();
            
            // Set the DataContext using DI container
            DataContext = App.ServiceProvider.GetRequiredService<LoginViewModel>();
            
            // Focus on username field when window loads
            Loaded += (s, e) => MoveFocus(new TraversalRequest(FocusNavigationDirection.First));
        }

        private void PasswordBox_PasswordChanged(object sender, RoutedEventArgs e)
        {
            if (sender is PasswordBox passwordBox && DataContext is LoginViewModel viewModel)
            {
                viewModel.Password = passwordBox.Password;
            }
        }

        private void CloseButton_Click(object sender, RoutedEventArgs e)
        {
            Application.Current.Shutdown();
        }

        // Handle Enter key press for login
        private void OnEnterKeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter && ViewModel.LoginCommand.CanExecute(null))
            {
                ViewModel.LoginCommand.Execute(null);
            }
        }

        // Override to handle window dragging
        protected override void OnMouseLeftButtonDown(MouseButtonEventArgs e)
        {
            base.OnMouseLeftButtonDown(e);
            DragMove();
        }

        // Handle successful login navigation
        private void OnLoginSuccess()
        {
            // This would be called by the ViewModel through an event or service
            // Close login window and show main window
            var mainWindow = App.ServiceProvider.GetRequiredService<MainWindow>();
            Application.Current.MainWindow = mainWindow;
            mainWindow.Show();
            Close();
        }

        // Handle window closing
        protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
        {
            base.OnClosing(e);
            
            // Cleanup any resources if needed
            if (DataContext is IDisposable disposableViewModel)
            {
                disposableViewModel.Dispose();
            }
        }
    }
}