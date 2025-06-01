// E:\kp\4 invoice\Core\Entities\ImportLog.cs
namespace InvoiceApp.Core.Entities;

public class ImportLog
{
    public int Id { get; set; }
    public string ImportBatchId { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty;
    public int TotalRecords { get; set; }
    public int SuccessRecords { get; set; }
    public int FailedRecords { get; set; }
    public int ImportedBy { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string? ErrorSummary { get; set; }
    public string? ImportOptions { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual User ImportedByUser { get; set; } = null!;
}