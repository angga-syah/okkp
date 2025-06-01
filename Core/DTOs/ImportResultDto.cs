// E:\kp\4 invoice\Core\DTOs\ImportResultDto.cs
namespace InvoiceApp.Core.DTOs;

public class ImportResultDto
{
    public string ImportBatchId { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public ImportFileType FileType { get; set; }
    public int ImportedBy { get; set; }
    public string ImportedByName { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public bool Success { get; set; }
    
    public int TotalRecords { get; set; }
    public int SuccessRecords { get; set; }
    public int FailedRecords { get; set; }
    public int SkippedRecords { get; set; }
    
    public List<ImportErrorDto> Errors { get; set; } = new();
    public List<ImportWarningDto> Warnings { get; set; } = new();
    public ImportStatisticsDto Statistics { get; set; } = new();
    
    public TimeSpan ProcessingTime => EndTime.HasValue ? EndTime.Value - StartTime : TimeSpan.Zero;
    public double SuccessRate => TotalRecords > 0 ? (double)SuccessRecords / TotalRecords * 100 : 0;
}

public class ImportErrorDto
{
    public int RowNumber { get; set; }
    public string Field { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string ErrorCode { get; set; } = string.Empty;
    public ImportErrorSeverity Severity { get; set; } = ImportErrorSeverity.Error;
}

public class ImportWarningDto
{
    public int RowNumber { get; set; }
    public string Field { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string WarningCode { get; set; } = string.Empty;
}

public class ImportStatisticsDto
{
    public int NewCompanies { get; set; }
    public int NewTkaWorkers { get; set; }
    public int NewJobDescriptions { get; set; }
    public int NewInvoices { get; set; }
    public int UpdatedRecords { get; set; }
    public decimal TotalImportedAmount { get; set; }
    public Dictionary<string, int> StatusBreakdown { get; set; } = new();
    public Dictionary<string, int> CompanyBreakdown { get; set; } = new();
}

public enum ImportErrorSeverity
{
    Warning = 1,
    Error = 2,
    Critical = 3
}
