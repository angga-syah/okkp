// E:\kp\4 invoice\Application\Commands\ImportInvoiceCommand.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;
using MediatR;

namespace InvoiceApp.Application.Commands;

public class ImportInvoiceCommand : IRequest<ImportResultDto>
{
    public string FilePath { get; set; } = string.Empty;
    public ImportFileType FileType { get; set; }
    public int ImportedBy { get; set; }
    public ImportOptions Options { get; set; } = new();
}

public class ImportOptions
{
    public bool SkipDuplicates { get; set; } = true;
    public bool CreateMissingEntities { get; set; } = true;
    public bool ValidateBeforeImport { get; set; } = true;
    public bool ImportAsDraft { get; set; } = true;
    public string? DefaultCompanyName { get; set; }
    public decimal DefaultVatPercentage { get; set; } = 11.00m;
    public DuplicateHandling DuplicateHandling { get; set; } = DuplicateHandling.Skip;
    public bool PreviewMode { get; set; } = false;
}

public enum DuplicateHandling
{
    Skip,
    Overwrite,
    CreateNew,
    Merge
}

public class ImportInvoiceFromExcelCommand : IRequest<ImportResultDto>
{
    public byte[] FileData { get; set; } = Array.Empty<byte>();
    public string FileName { get; set; } = string.Empty;
    public int ImportedBy { get; set; }
    public ImportOptions Options { get; set; } = new();
    public string? TemplateVersion { get; set; }
}

public class ImportInvoiceFromCsvCommand : IRequest<ImportResultDto>
{
    public string CsvContent { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public int ImportedBy { get; set; }
    public CsvImportOptions CsvOptions { get; set; } = new();
    public ImportOptions Options { get; set; } = new();
}

public class CsvImportOptions
{
    public string Delimiter { get; set; } = ",";
    public bool HasHeader { get; set; } = true;
    public string TextQualifier { get; set; } = "\"";
    public Dictionary<string, string> ColumnMapping { get; set; } = new();
}

public class ImportInvoiceFromJsonCommand : IRequest<ImportResultDto>
{
    public string JsonContent { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public int ImportedBy { get; set; }
    public ImportOptions Options { get; set; } = new();
    public string? SchemaVersion { get; set; }
}

public class ValidateImportFileCommand : IRequest<ImportValidationResult>
{
    public string FilePath { get; set; } = string.Empty;
    public ImportFileType FileType { get; set; }
    public ImportOptions Options { get; set; } = new();
}

public class ImportValidationResult
{
    public bool IsValid { get; set; }
    public List<ImportValidationError> Errors { get; set; } = new();
    public List<ImportValidationWarning> Warnings { get; set; } = new();
    public ImportPreviewData? PreviewData { get; set; }
    public int EstimatedRecordCount { get; set; }
}

public class ImportValidationError
{
    public int RowNumber { get; set; }
    public string ColumnName { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
    public string ErrorCode { get; set; } = string.Empty;
    public object? InvalidValue { get; set; }
}

public class ImportValidationWarning
{
    public int RowNumber { get; set; }
    public string ColumnName { get; set; } = string.Empty;
    public string WarningMessage { get; set; } = string.Empty;
    public string WarningCode { get; set; } = string.Empty;
    public object? Value { get; set; }
}

public class ImportPreviewData
{
    public List<ImportInvoiceHeaderPreview> Headers { get; set; } = new();
    public List<ImportInvoiceLinePreview> Lines { get; set; } = new();
    public Dictionary<string, object> Statistics { get; set; } = new();
}

public class ImportInvoiceHeaderPreview
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public decimal EstimatedTotal { get; set; }
    public int LineCount { get; set; }
    public List<string> Issues { get; set; } = new();
}

public class ImportInvoiceLinePreview
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public string TkaName { get; set; } = string.Empty;
    public string JobDescription { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public List<string> Issues { get; set; } = new();
}