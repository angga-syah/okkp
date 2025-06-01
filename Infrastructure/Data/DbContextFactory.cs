// E:\kp\4 invoice\Infrastructure\Data\DbContextFactory.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace InvoiceApp.Infrastructure.Data;

public class DbContextFactory : IDesignTimeDbContextFactory<InvoiceDbContext>
{
    public InvoiceDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<InvoiceDbContext>();
        
        // Build configuration
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? "Host=localhost;Database=invoice_management;Username=postgres;Password=password";

        optionsBuilder.UseNpgsql(connectionString, options =>
        {
            options.MigrationsAssembly("InvoiceApp.Infrastructure");
            options.CommandTimeout(30);
        });

        return new InvoiceDbContext(optionsBuilder.Options);
    }
}

public class InvoiceDbContextFactory
{
    private readonly IConfiguration _configuration;

    public InvoiceDbContextFactory(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public InvoiceDbContext CreateDbContext()
    {
        var optionsBuilder = new DbContextOptionsBuilder<InvoiceDbContext>();
        
        var connectionString = _configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

        optionsBuilder.UseNpgsql(connectionString, options =>
        {
            options.MigrationsAssembly("InvoiceApp.Infrastructure");
            options.CommandTimeout(30);
            options.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorCodesToAdd: null);
        });

        // Configure for different environments
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        if (environment == "Development")
        {
            optionsBuilder.EnableSensitiveDataLogging();
            optionsBuilder.EnableDetailedErrors();
        }

        return new InvoiceDbContext(optionsBuilder.Options);
    }

    public async Task<InvoiceDbContext> CreateDbContextAsync()
    {
        return await Task.FromResult(CreateDbContext());
    }
}

// Connection string builder for dynamic connection management
public static class ConnectionStringBuilder
{
    public static string BuildConnectionString(string host, string database, string username, string password, int port = 5432)
    {
        return $"Host={host};Port={port};Database={database};Username={username};Password={password};Pooling=true;MinPoolSize=5;MaxPoolSize=100;ConnectionLifeTime=300;";
    }

    public static string BuildConnectionStringFromSettings(DatabaseSettings settings)
    {
        return BuildConnectionString(
            settings.Host,
            settings.Database,
            settings.Username,
            settings.Password,
            settings.Port);
    }

    public static bool TestConnection(string connectionString)
    {
        try
        {
            var optionsBuilder = new DbContextOptionsBuilder<InvoiceDbContext>();
            optionsBuilder.UseNpgsql(connectionString);

            using var context = new InvoiceDbContext(optionsBuilder.Options);
            context.Database.CanConnect();
            return true;
        }
        catch
        {
            return false;
        }
    }

    public static async Task<bool> TestConnectionAsync(string connectionString)
    {
        try
        {
            var optionsBuilder = new DbContextOptionsBuilder<InvoiceDbContext>();
            optionsBuilder.UseNpgsql(connectionString);

            using var context = new InvoiceDbContext(optionsBuilder.Options);
            return await context.Database.CanConnectAsync();
        }
        catch
        {
            return false;
        }
    }
}

// Database settings model
public class DatabaseSettings
{
    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 5432;
    public string Database { get; set; } = "invoice_management";
    public string Username { get; set; } = "postgres";
    public string Password { get; set; } = "password";
    public int CommandTimeout { get; set; } = 30;
    public int ConnectionTimeout { get; set; } = 15;
    public int MinPoolSize { get; set; } = 5;
    public int MaxPoolSize { get; set; } = 100;
    public int ConnectionLifetime { get; set; } = 300;
    public bool EnableRetryOnFailure { get; set; } = true;
    public int MaxRetryCount { get; set; } = 3;
    public int MaxRetryDelay { get; set; } = 30;
    public bool EnableSensitiveDataLogging { get; set; } = false;
    public bool EnableDetailedErrors { get; set; } = false;
}

// Database initialization service
public interface IDatabaseInitializer
{
    Task InitializeAsync();
    Task SeedAsync();
    Task MigrateAsync();
}

public class DatabaseInitializer : IDatabaseInitializer
{
    private readonly InvoiceDbContext _context;
    private readonly ILogger<DatabaseInitializer> _logger;

    public DatabaseInitializer(InvoiceDbContext context, ILogger<DatabaseInitializer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task InitializeAsync()
    {
        try
        {
            _logger.LogInformation("Initializing database...");
            
            // Ensure database is created
            await _context.Database.EnsureCreatedAsync();
            
            // Run migrations
            await MigrateAsync();
            
            // Seed initial data
            await SeedAsync();
            
            _logger.LogInformation("Database initialization completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during database initialization");
            throw;
        }
    }

    public async Task MigrateAsync()
    {
        try
        {
            _logger.LogInformation("Running database migrations...");
            
            var pendingMigrations = await _context.Database.GetPendingMigrationsAsync();
            if (pendingMigrations.Any())
            {
                _logger.LogInformation("Found {Count} pending migrations", pendingMigrations.Count());
                await _context.Database.MigrateAsync();
                _logger.LogInformation("Database migrations completed");
            }
            else
            {
                _logger.LogInformation("No pending migrations found");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during database migration");
            throw;
        }
    }

    public async Task SeedAsync()
    {
        try
        {
            _logger.LogInformation("Seeding database...");
            
            // Check if admin user exists
            var adminExists = await _context.Users.AnyAsync(u => u.Username == "admin");
            if (!adminExists)
            {
                _logger.LogInformation("Creating default admin user");
                // Default admin user will be created by model seeding
            }
            
            // Check if default settings exist
            var settingsCount = await _context.Settings.CountAsync();
            if (settingsCount == 0)
            {
                _logger.LogInformation("Creating default settings");
                // Default settings will be created by model seeding
            }
            
            await _context.SaveChangesAsync();
            _logger.LogInformation("Database seeding completed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during database seeding");
            throw;
        }
    }
}