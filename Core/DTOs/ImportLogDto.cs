// E:\kp\4 invoice\Core\DTOs\ImportLogDto.cs
namespace InvoiceApp.Core.DTOs;

public class ImportLogDto
{
    public int Id { get; set; }
    public string ImportBatchId { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty;
    public int TotalRecords { get; set; }
    public int SuccessRecords { get; set; }
    public int FailedRecords { get; set; }
    public int ImportedBy { get; set; }
    public string ImportedByName { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string? ErrorSummary { get; set; }
    public DateTime CreatedAt { get; set; }
}