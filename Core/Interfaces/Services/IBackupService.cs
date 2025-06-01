// E:\kp\4 invoice\Core\Interfaces\Services\IBackupService.cs
using InvoiceApp.Core.Enums;

namespace InvoiceApp.Core.Interfaces.Services;

public interface IBackupService
{
    Task<string> CreateBackupAsync(BackupType type = BackupType.Full, string? customPath = null);
    Task<bool> RestoreBackupAsync(string backupPath);
    Task<bool> ValidateBackupAsync(string backupPath);
    Task<List<BackupInfo>> GetBackupHistoryAsync();
    Task<bool> DeleteBackupAsync(string backupPath);
    Task<BackupInfo> GetBackupInfoAsync(string backupPath);
    Task ScheduleAutomaticBackupAsync(BackupType type, TimeSpan interval);
    Task CancelAutomaticBackupAsync();
    Task<bool> IsAutomaticBackupEnabledAsync();
    Task<long> GetBackupSizeAsync(string backupPath);
    Task<bool> CompressBackupAsync(string backupPath, string compressedPath);
    Task<bool> DecompressBackupAsync(string compressedPath, string extractPath);
    event EventHandler<BackupEventArgs>? BackupStarted;
    event EventHandler<BackupEventArgs>? BackupCompleted;
    event EventHandler<BackupEventArgs>? BackupFailed;
}

public class BackupInfo
{
    public string FilePath { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public BackupType Type { get; set; }
    public DateTime CreatedAt { get; set; }
    public long SizeBytes { get; set; }
    public string Description { get; set; } = string.Empty;
    public bool IsCompressed { get; set; }
    public string CheckSum { get; set; } = string.Empty;
}

public class BackupEventArgs : EventArgs
{
    public string BackupPath { get; set; } = string.Empty;
    public BackupType Type { get; set; }
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public TimeSpan Duration { get; set; }
    public long SizeBytes { get; set; }
}