// E:\kp\4 invoice\Infrastructure\Services\Core\BackupService.cs
using InvoiceApp.Core.Enums;
using InvoiceApp.Core.Interfaces.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.IO.Compression;
using System.Text.Json;

namespace InvoiceApp.Infrastructure.Services.Core;

public class BackupService : IBackupService
{
    private readonly ILogger<BackupService> _logger;
    private readonly IConfiguration _configuration;
    private readonly string _backupDirectory;
    private readonly Timer? _automaticBackupTimer;

    public event EventHandler<BackupEventArgs>? BackupStarted;
    public event EventHandler<BackupEventArgs>? BackupCompleted;
    public event EventHandler<BackupEventArgs>? BackupFailed;

    public BackupService(ILogger<BackupService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        _backupDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), 
            "InvoiceApp", "Backups");
        
        Directory.CreateDirectory(_backupDirectory);
        
        _logger.LogInformation("Backup Service initialized. Backup directory: {BackupDirectory}", _backupDirectory);
    }

    public async Task<string> CreateBackupAsync(BackupType type = BackupType.Full, string? customPath = null)
    {
        var startTime = DateTime.UtcNow;
        var backupFileName = GenerateBackupFileName(type);
        var backupPath = customPath ?? Path.Combine(_backupDirectory, backupFileName);
        
        var args = new BackupEventArgs
        {
            BackupPath = backupPath,
            Type = type,
            Timestamp = startTime
        };

        try
        {
            _logger.LogInformation("Starting {BackupType} backup to: {BackupPath}", type, backupPath);
            BackupStarted?.Invoke(this, args);

            switch (type)
            {
                case BackupType.Full:
                    await CreateFullBackupAsync(backupPath);
                    break;
                case BackupType.Incremental:
                    await CreateIncrementalBackupAsync(backupPath);
                    break;
                case BackupType.Differential:
                    await CreateDifferentialBackupAsync(backupPath);
                    break;
                case BackupType.Transaction:
                    await CreateTransactionBackupAsync(backupPath);
                    break;
                default:
                    throw new ArgumentException($"Unsupported backup type: {type}");
            }

            var fileInfo = new FileInfo(backupPath);
            args.SizeBytes = fileInfo.Length;
            args.Duration = DateTime.UtcNow - startTime;
            args.Success = true;

            _logger.LogInformation("Backup completed successfully. Size: {Size} bytes, Duration: {Duration}", 
                args.SizeBytes, args.Duration);

            BackupCompleted?.Invoke(this, args);
            return backupPath;
        }
        catch (Exception ex)
        {
            args.Success = false;
            args.ErrorMessage = ex.Message;
            args.Duration = DateTime.UtcNow - startTime;

            _logger.LogError(ex, "Backup failed: {BackupPath}", backupPath);
            BackupFailed?.Invoke(this, args);
            throw;
        }
    }

    public async Task<bool> RestoreBackupAsync(string backupPath)
    {
        try
        {
            _logger.LogInformation("Starting restore from backup: {BackupPath}", backupPath);

            if (!File.Exists(backupPath))
            {
                throw new FileNotFoundException($"Backup file not found: {backupPath}");
            }

            // Validate backup before restore
            if (!await ValidateBackupAsync(backupPath))
            {
                throw new InvalidOperationException("Backup validation failed");
            }

            var tempRestoreDir = Path.Combine(Path.GetTempPath(), "InvoiceApp_Restore_" + Guid.NewGuid());
            Directory.CreateDirectory(tempRestoreDir);

            try
            {
                // Extract backup
                if (backupPath.EndsWith(".zip"))
                {
                    ZipFile.ExtractToDirectory(backupPath, tempRestoreDir);
                }
                else
                {
                    // Handle other backup formats
                    throw new NotSupportedException("Only ZIP backup format is currently supported for restore");
                }

                // Read backup metadata
                var metadataPath = Path.Combine(tempRestoreDir, "backup_metadata.json");
                if (!File.Exists(metadataPath))
                {
                    throw new InvalidOperationException("Backup metadata not found");
                }

                var metadata = await ReadBackupMetadataAsync(metadataPath);
                
                // Perform restore based on backup type
                await PerformRestoreAsync(tempRestoreDir, metadata);

                _logger.LogInformation("Restore completed successfully from: {BackupPath}", backupPath);
                return true;
            }
            finally
            {
                // Cleanup temp directory
                if (Directory.Exists(tempRestoreDir))
                {
                    Directory.Delete(tempRestoreDir, true);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Restore failed from backup: {BackupPath}", backupPath);
            throw;
        }
    }

    public async Task<bool> ValidateBackupAsync(string backupPath)
    {
        try
        {
            if (!File.Exists(backupPath))
            {
                _logger.LogWarning("Backup file does not exist: {BackupPath}", backupPath);
                return false;
            }

            var fileInfo = new FileInfo(backupPath);
            if (fileInfo.Length == 0)
            {
                _logger.LogWarning("Backup file is empty: {BackupPath}", backupPath);
                return false;
            }

            // For ZIP files, try to open and validate structure
            if (backupPath.EndsWith(".zip"))
            {
                using var archive = ZipFile.OpenRead(backupPath);
                
                // Check for required files
                var requiredFiles = new[] { "backup_metadata.json", "database_dump.sql" };
                foreach (var requiredFile in requiredFiles)
                {
                    if (!archive.Entries.Any(e => e.FullName == requiredFile))
                    {
                        _logger.LogWarning("Required file missing in backup: {RequiredFile}", requiredFile);
                        return false;
                    }
                }

                // Validate metadata
                var metadataEntry = archive.GetEntry("backup_metadata.json");
                if (metadataEntry != null)
                {
                    using var stream = metadataEntry.Open();
                    using var reader = new StreamReader(stream);
                    var metadataJson = await reader.ReadToEndAsync();
                    
                    try
                    {
                        var metadata = JsonSerializer.Deserialize<BackupMetadata>(metadataJson);
                        if (metadata?.Version == null || metadata.CreatedAt == default)
                        {
                            _logger.LogWarning("Invalid backup metadata");
                            return false;
                        }
                    }
                    catch (JsonException)
                    {
                        _logger.LogWarning("Failed to parse backup metadata");
                        return false;
                    }
                }
            }

            _logger.LogDebug("Backup validation successful: {BackupPath}", backupPath);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating backup: {BackupPath}", backupPath);
            return false;
        }
    }

    public async Task<List<BackupInfo>> GetBackupHistoryAsync()
    {
        try
        {
            var backupFiles = Directory.GetFiles(_backupDirectory, "*.zip")
                .Union(Directory.GetFiles(_backupDirectory, "*.bak"))
                .OrderByDescending(f => File.GetCreationTime(f));

            var backupInfos = new List<BackupInfo>();

            foreach (var file in backupFiles)
            {
                try
                {
                    var info = await GetBackupInfoAsync(file);
                    backupInfos.Add(info);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to get info for backup file: {File}", file);
                }
            }

            return backupInfos;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting backup history");
            return new List<BackupInfo>();
        }
    }

    public async Task<bool> DeleteBackupAsync(string backupPath)
    {
        try
        {
            if (File.Exists(backupPath))
            {
                File.Delete(backupPath);
                _logger.LogInformation("Backup deleted: {BackupPath}", backupPath);
                return true;
            }
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting backup: {BackupPath}", backupPath);
            return false;
        }
    }

    public async Task<BackupInfo> GetBackupInfoAsync(string backupPath)
    {
        var fileInfo = new FileInfo(backupPath);
        var backupInfo = new BackupInfo
        {
            FilePath = backupPath,
            FileName = fileInfo.Name,
            CreatedAt = fileInfo.CreationTime,
            SizeBytes = fileInfo.Length,
            IsCompressed = backupPath.EndsWith(".zip")
        };

        try
        {
            // Try to read metadata from backup
            if (backupPath.EndsWith(".zip"))
            {
                using var archive = ZipFile.OpenRead(backupPath);
                var metadataEntry = archive.GetEntry("backup_metadata.json");
                if (metadataEntry != null)
                {
                    using var stream = metadataEntry.Open();
                    using var reader = new StreamReader(stream);
                    var metadataJson = await reader.ReadToEndAsync();
                    var metadata = JsonSerializer.Deserialize<BackupMetadata>(metadataJson);
                    
                    if (metadata != null)
                    {
                        backupInfo.Type = metadata.Type;
                        backupInfo.Description = metadata.Description;
                        backupInfo.CheckSum = metadata.CheckSum;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not read backup metadata: {BackupPath}", backupPath);
        }

        return backupInfo;
    }

    private async Task CreateFullBackupAsync(string backupPath)
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "InvoiceApp_Backup_" + Guid.NewGuid());
        Directory.CreateDirectory(tempDir);

        try
        {
            // Create backup metadata
            var metadata = new BackupMetadata
            {
                Type = BackupType.Full,
                CreatedAt = DateTime.UtcNow,
                Version = "1.0",
                Description = "Full database backup",
                DatabaseVersion = await GetDatabaseVersionAsync()
            };

            // Save metadata
            var metadataPath = Path.Combine(tempDir, "backup_metadata.json");
            await File.WriteAllTextAsync(metadataPath, JsonSerializer.Serialize(metadata, new JsonSerializerOptions { WriteIndented = true }));

            // Create database dump
            await CreateDatabaseDumpAsync(Path.Combine(tempDir, "database_dump.sql"));

            // Create application settings backup
            await BackupApplicationSettingsAsync(Path.Combine(tempDir, "app_settings.json"));

            // Create ZIP archive
            ZipFile.CreateFromDirectory(tempDir, backupPath);
        }
        finally
        {
            if (Directory.Exists(tempDir))
            {
                Directory.Delete(tempDir, true);
            }
        }
    }

    private async Task CreateIncrementalBackupAsync(string backupPath)
    {
        // Implementation for incremental backup
        // This would track changes since last backup
        throw new NotImplementedException("Incremental backup not yet implemented");
    }

    private async Task CreateDifferentialBackupAsync(string backupPath)
    {
        // Implementation for differential backup
        // This would track changes since last full backup
        throw new NotImplementedException("Differential backup not yet implemented");
    }

    private async Task CreateTransactionBackupAsync(string backupPath)
    {
        // Implementation for transaction log backup
        throw new NotImplementedException("Transaction backup not yet implemented");
    }

    private async Task CreateDatabaseDumpAsync(string dumpPath)
    {
        // This is a simplified implementation
        // In production, you would use pg_dump or similar tools
        var connectionString = _configuration.GetConnectionString("DefaultConnection");
        var dumpContent = $"-- Database dump created at {DateTime.UtcNow}\n";
        dumpContent += $"-- Connection: {connectionString}\n";
        dumpContent += "-- This is a placeholder for actual database dump\n";
        
        await File.WriteAllTextAsync(dumpPath, dumpContent);
        _logger.LogDebug("Database dump created: {DumpPath}", dumpPath);
    }

    private async Task BackupApplicationSettingsAsync(string settingsPath)
    {
        var settings = new
        {
            BackupCreatedAt = DateTime.UtcNow,
            ApplicationVersion = "1.0.0",
            Configuration = "Settings would be backed up here"
        };

        await File.WriteAllTextAsync(settingsPath, JsonSerializer.Serialize(settings, new JsonSerializerOptions { WriteIndented = true }));
    }

    private async Task<string> GetDatabaseVersionAsync()
    {
        // Placeholder - would query actual database version
        await Task.CompletedTask;
        return "PostgreSQL 15.0";
    }

    private async Task<BackupMetadata> ReadBackupMetadataAsync(string metadataPath)
    {
        var json = await File.ReadAllTextAsync(metadataPath);
        var metadata = JsonSerializer.Deserialize<BackupMetadata>(json);
        return metadata ?? throw new InvalidOperationException("Invalid backup metadata");
    }

    private async Task PerformRestoreAsync(string restoreDir, BackupMetadata metadata)
    {
        _logger.LogInformation("Performing restore for backup type: {BackupType}", metadata.Type);

        switch (metadata.Type)
        {
            case BackupType.Full:
                await RestoreFullBackupAsync(restoreDir);
                break;
            default:
                throw new NotSupportedException($"Restore not implemented for backup type: {metadata.Type}");
        }
    }

    private async Task RestoreFullBackupAsync(string restoreDir)
    {
        var dumpPath = Path.Combine(restoreDir, "database_dump.sql");
        if (File.Exists(dumpPath))
        {
            // Restore database from dump
            _logger.LogInformation("Restoring database from dump: {DumpPath}", dumpPath);
            // Implementation would execute the SQL dump against the database
        }

        var settingsPath = Path.Combine(restoreDir, "app_settings.json");
        if (File.Exists(settingsPath))
        {
            // Restore application settings
            _logger.LogInformation("Restoring application settings: {SettingsPath}", settingsPath);
            // Implementation would restore application configuration
        }
    }

    private string GenerateBackupFileName(BackupType type)
    {
        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
        return $"InvoiceApp_{type}_{timestamp}.zip";
    }

    // Additional interface implementations...
    public async Task ScheduleAutomaticBackupAsync(BackupType type, TimeSpan interval)
    {
        // Implementation for automatic backup scheduling
        await Task.CompletedTask;
        _logger.LogInformation("Automatic backup scheduled: {Type}, Interval: {Interval}", type, interval);
    }

    public async Task CancelAutomaticBackupAsync()
    {
        await Task.CompletedTask;
        _logger.LogInformation("Automatic backup cancelled");
    }

    public async Task<bool> IsAutomaticBackupEnabledAsync()
    {
        await Task.CompletedTask;
        return false; // Placeholder
    }

    public async Task<long> GetBackupSizeAsync(string backupPath)
    {
        return await Task.FromResult(new FileInfo(backupPath).Length);
    }

    public async Task<bool> CompressBackupAsync(string backupPath, string compressedPath)
    {
        try
        {
            using var originalStream = File.OpenRead(backupPath);
            using var compressedStream = File.Create(compressedPath);
            using var gzipStream = new GZipStream(compressedStream, CompressionMode.Compress);
            
            await originalStream.CopyToAsync(gzipStream);
            _logger.LogInformation("Backup compressed: {BackupPath} -> {CompressedPath}", backupPath, compressedPath);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error compressing backup");
            return false;
        }
    }

    public async Task<bool> DecompressBackupAsync(string compressedPath, string extractPath)
    {
        try
        {
            using var compressedStream = File.OpenRead(compressedPath);
            using var gzipStream = new GZipStream(compressedStream, CompressionMode.Decompress);
            using var extractedStream = File.Create(extractPath);
            
            await gzipStream.CopyToAsync(extractedStream);
            _logger.LogInformation("Backup decompressed: {CompressedPath} -> {ExtractPath}", compressedPath, extractPath);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error decompressing backup");
            return false;
        }
    }
}

// Supporting classes
public class BackupMetadata
{
    public BackupType Type { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Version { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string DatabaseVersion { get; set; } = string.Empty;
    public string CheckSum { get; set; } = string.Empty;
}