// E:\kp\4 invoice\WPF\App.xaml.cs
using System.IO;
using System.Windows;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using InvoiceApp.Infrastructure.Data;
using InvoiceApp.Core.Interfaces;
using InvoiceApp.Core.Interfaces.Services;
using InvoiceApp.Infrastructure.Repositories;
using InvoiceApp.Application.Services;
using InvoiceApp.Infrastructure.Services.Core;
using InvoiceApp.Infrastructure.Services.Caching;
using InvoiceApp.Infrastructure.Services.Performance;
using InvoiceApp.WPF.Services;
using InvoiceApp.WPF.ViewModels;
using InvoiceApp.WPF.Views.Authentication;
using FluentValidation;
using AutoMapper;
using Serilog;
using System.Reflection;

namespace InvoiceApp.WPF;

public partial class App : Application
{
    private readonly IHost _host;
    private readonly ILogger<App> _logger;

    public App()
    {
        _host = CreateHostBuilder().Build();
        _logger = _host.Services.GetRequiredService<ILogger<App>>();
    }

    public static IHostBuilder CreateHostBuilder() =>
        Host.CreateDefaultBuilder()
            .ConfigureAppConfiguration((context, config) =>
            {
                config.SetBasePath(Directory.GetCurrentDirectory());
                config.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);
                config.AddJsonFile($"appsettings.{context.HostingEnvironment.EnvironmentName}.json", optional: true);
                config.AddEnvironmentVariables();
            })
            .ConfigureLogging((context, logging) =>
            {
                logging.ClearProviders();
                
                var logger = new LoggerConfiguration()
                    .ReadFrom.Configuration(context.Configuration)
                    .Enrich.FromLogContext()
                    .WriteTo.Console()
                    .WriteTo.File("logs/invoice-app-.log", 
                        rollingInterval: RollingInterval.Day,
                        retainedFileCountLimit: 30,
                        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
                    .CreateLogger();
                
                logging.AddSerilog(logger);
            })
            .ConfigureServices((context, services) =>
            {
                ConfigureServices(services, context.Configuration);
            })
            .UseDefaultServiceProvider((context, options) =>
            {
                options.ValidateScopes = context.HostingEnvironment.IsDevelopment();
                options.ValidateOnBuild = true;
            });

    private static void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        // Configuration
        services.AddSingleton<IConfiguration>(configuration);

        // Database
        services.AddDbContext<InvoiceDbContext>(options =>
        {
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection"));
            options.EnableSensitiveDataLogging();
            options.EnableDetailedErrors();
        });

        // AutoMapper
        services.AddAutoMapper(typeof(App).Assembly, typeof(CompanyService).Assembly);

        // Memory Caching
        services.AddMemoryCache();
        services.AddStackExchangeRedisCache(options =>
        {
            var connectionString = configuration.GetConnectionString("Redis");
            if (!string.IsNullOrEmpty(connectionString))
            {
                options.Configuration = connectionString;
            }
        });

        // Validators
        services.AddValidatorsFromAssembly(typeof(CompanyService).Assembly);

        // Unit of Work & Repositories
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<ICompanyRepository, CompanyRepository>();
        services.AddScoped<ITkaWorkerRepository, TkaWorkerRepository>();
        services.AddScoped<IInvoiceRepository, InvoiceRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IImportRepository, ImportRepository>();

        // Application Services
        services.AddScoped<ICompanyService, CompanyService>();
        services.AddScoped<ITkaWorkerService, TkaWorkerService>();
        services.AddScoped<IInvoiceService, InvoiceService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<ISettingsService, SettingsService>();
        services.AddScoped<IImportExportService, ImportExportService>();

        // Infrastructure Services
        services.AddScoped<IExcelService, ExcelService>();
        services.AddScoped<IPdfService, PdfService>();
        services.AddScoped<IPrintService, PrintService>();
        services.AddScoped<IInvoiceNumberService, InvoiceNumberService>();
        services.AddScoped<IInvoiceFormatService, InvoiceFormatService>();
        services.AddScoped<ISearchService, SmartSearchService>();
        services.AddScoped<IBackupService, BackupService>();

        // Caching Services
        services.AddSingleton<ICachingService, MemoryCacheService>();
        services.AddScoped<IPerformanceService, PerformanceService>();

        // Background Services
        services.AddHostedService<BackgroundTaskService>();
        services.AddSingleton<ConnectionPoolService>();
        services.AddSingleton<QueryOptimizationService>();

        // WPF Services
        services.AddSingleton<INavigationService, NavigationService>();
        services.AddSingleton<IDialogService, DialogService>();
        services.AddSingleton<INotificationService, NotificationService>();
        services.AddSingleton<IThemeService, ThemeService>();
        services.AddSingleton<PerformanceMonitorService>();

        // ViewModels
        services.AddTransient<MainViewModel>();
        services.AddTransient<LoginViewModel>();
        services.AddTransient<DashboardViewModel>();
        services.AddTransient<CompanyListViewModel>();
        services.AddTransient<CompanyDetailViewModel>();
        services.AddTransient<TkaListViewModel>();
        services.AddTransient<TkaDetailViewModel>();
        services.AddTransient<InvoiceListViewModel>();
        services.AddTransient<InvoiceCreateViewModel>();
        services.AddTransient<InvoiceEditViewModel>();
        services.AddTransient<InvoiceImportViewModel>();
        services.AddTransient<ReportsViewModel>();
        services.AddTransient<SettingsViewModel>();

        // Performance Optimization
        services.Configure<MemoryCacheEntryOptions>(options =>
        {
            options.SlidingExpiration = TimeSpan.FromMinutes(30);
            options.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(2);
            options.Priority = Microsoft.Extensions.Caching.Memory.CacheItemPriority.Normal;
        });
    }

    protected override async void OnStartup(StartupEventArgs e)
    {
        try
        {
            await _host.StartAsync();

            _logger.LogInformation("Invoice Management System starting up...");

            // Initialize database
            await InitializeDatabaseAsync();

            // Initialize services
            await InitializeServicesAsync();

            // Set global exception handling
            SetupExceptionHandling();

            // Show login window
            var loginWindow = new LoginWindow
            {
                DataContext = _host.Services.GetRequiredService<LoginViewModel>()
            };

            loginWindow.Show();
            
            base.OnStartup(e);

            _logger.LogInformation("Invoice Management System started successfully");
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "Fatal error during application startup");
            MessageBox.Show($"Failed to start application: {ex.Message}", "Startup Error", 
                MessageBoxButton.OK, MessageBoxImage.Error);
            Shutdown(1);
        }
    }

    protected override async void OnExit(ExitEventArgs e)
    {
        try
        {
            _logger.LogInformation("Invoice Management System shutting down...");

            // Cleanup services
            await CleanupServicesAsync();

            // Stop host
            await _host.StopAsync();
            _host.Dispose();

            _logger.LogInformation("Invoice Management System shut down completed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during application shutdown");
        }
        finally
        {
            base.OnExit(e);
        }
    }

    private async Task InitializeDatabaseAsync()
    {
        try
        {
            using var scope = _host.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<InvoiceDbContext>();
            
            _logger.LogInformation("Initializing database connection...");
            
            // Test connection
            await context.Database.CanConnectAsync();
            
            // Apply any pending migrations
            if (context.Database.GetPendingMigrations().Any())
            {
                _logger.LogInformation("Applying database migrations...");
                await context.Database.MigrateAsync();
            }

            _logger.LogInformation("Database initialized successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize database");
            throw;
        }
    }

    private async Task InitializeServicesAsync()
    {
        try
        {
            using var scope = _host.Services.CreateScope();
            
            // Initialize caching service
            var cachingService = scope.ServiceProvider.GetRequiredService<ICachingService>();
            await cachingService.ClearAsync(); // Clear any stale cache on startup

            // Initialize performance monitoring
            var performanceService = scope.ServiceProvider.GetRequiredService<IPerformanceService>();
            await performanceService.StartPerformanceMonitoringAsync();

            // Initialize theme service
            var themeService = scope.ServiceProvider.GetRequiredService<IThemeService>();
            await themeService.ApplyThemeAsync(Core.Enums.ThemeMode.Modern);

            _logger.LogInformation("Services initialized successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize services");
            throw;
        }
    }

    private async Task CleanupServicesAsync()
    {
        try
        {
            using var scope = _host.Services.CreateScope();
            
            // Stop performance monitoring
            var performanceService = scope.ServiceProvider.GetRequiredService<IPerformanceService>();
            await performanceService.StopPerformanceMonitoringAsync();

            // Save any pending user preferences
            var settingsService = scope.ServiceProvider.GetRequiredService<ISettingsService>();
            // Additional cleanup if needed

            _logger.LogInformation("Services cleanup completed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during services cleanup");
        }
    }

    private void SetupExceptionHandling()
    {
        // Handle WPF UI thread exceptions
        DispatcherUnhandledException += (sender, e) =>
        {
            _logger.LogError(e.Exception, "Unhandled dispatcher exception");
            
            var result = MessageBox.Show(
                $"An unexpected error occurred:\n\n{e.Exception.Message}\n\nWould you like to continue?",
                "Application Error",
                MessageBoxButton.YesNo,
                MessageBoxImage.Error);

            if (result == MessageBoxResult.No)
            {
                Shutdown(1);
            }
            else
            {
                e.Handled = true;
            }
        };

        // Handle non-UI thread exceptions
        AppDomain.CurrentDomain.UnhandledException += (sender, e) =>
        {
            _logger.LogCritical((Exception)e.ExceptionObject, "Unhandled domain exception");
            
            if (e.IsTerminating)
            {
                MessageBox.Show(
                    $"A fatal error occurred and the application must close:\n\n{((Exception)e.ExceptionObject).Message}",
                    "Fatal Error",
                    MessageBoxButton.OK,
                    MessageBoxImage.Stop);
            }
        };

        // Handle task exceptions
        TaskScheduler.UnobservedTaskException += (sender, e) =>
        {
            _logger.LogError(e.Exception, "Unhandled task exception");
            e.SetObserved(); // Prevent process termination
        };
    }

    // Helper method to get services from anywhere in the application
    public static T GetService<T>() where T : class
    {
        return ((App)Current)._host.Services.GetRequiredService<T>();
    }

    public static IServiceScope CreateScope()
    {
        return ((App)Current)._host.Services.CreateScope();
    }
}