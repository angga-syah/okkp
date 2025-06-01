// E:\kp\4 invoice\Application\Validators\ImportDataValidator.cs
using FluentValidation;
using InvoiceApp.Application.Commands;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;
using InvoiceApp.Core.Interfaces;
using System.Text.RegularExpressions;

namespace InvoiceApp.Application.Validators;

public class ImportDataValidator : AbstractValidator<ImportResultDto>
{
    public ImportDataValidator()
    {
        RuleFor(x => x.FileName)
            .NotEmpty().WithMessage("File name is required")
            .Must(HaveValidFileExtension).WithMessage("Invalid file extension");

        RuleFor(x => x.FileType)
            .IsInEnum().WithMessage("Invalid file type");

        RuleFor(x => x.ImportedBy)
            .GreaterThan(0).WithMessage("Imported by user must be specified");

        RuleFor(x => x.TotalRecords)
            .GreaterThanOrEqualTo(0).WithMessage("Total records cannot be negative");

        RuleFor(x => x.SuccessRecords)
            .GreaterThanOrEqualTo(0).WithMessage("Success records cannot be negative")
            .LessThanOrEqualTo(x => x.TotalRecords).WithMessage("Success records cannot exceed total records");

        RuleFor(x => x.FailedRecords)
            .GreaterThanOrEqualTo(0).WithMessage("Failed records cannot be negative")
            .LessThanOrEqualTo(x => x.TotalRecords).WithMessage("Failed records cannot exceed total records");

        RuleFor(x => x)
            .Must(HaveValidRecordCounts).WithMessage("Success + Failed records must equal Total records");
    }

    private bool HaveValidFileExtension(string fileName)
    {
        if (string.IsNullOrEmpty(fileName)) return false;
        
        var validExtensions = new[] { ".xlsx", ".xls", ".csv", ".json" };
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        return validExtensions.Contains(extension);
    }

    private bool HaveValidRecordCounts(ImportResultDto result)
    {
        return result.SuccessRecords + result.FailedRecords == result.TotalRecords;
    }
}

public class ImportOptionsValidator : AbstractValidator<ImportOptions>
{
    public ImportOptionsValidator()
    {
        RuleFor(x => x.DefaultVatPercentage)
            .GreaterThanOrEqualTo(0).WithMessage("Default VAT percentage cannot be negative")
            .LessThanOrEqualTo(100).WithMessage("Default VAT percentage cannot exceed 100%");

        RuleFor(x => x.DefaultCompanyName)
            .MaximumLength(200).WithMessage("Default company name cannot exceed 200 characters")
            .When(x => !string.IsNullOrEmpty(x.DefaultCompanyName));

        RuleFor(x => x.DuplicateHandling)
            .IsInEnum().WithMessage("Invalid duplicate handling option");
    }
}

public class ImportInvoiceHeaderValidator : AbstractValidator<ImportInvoiceHeaderDto>
{
    public ImportInvoiceHeaderValidator()
    {
        RuleFor(x => x.InvoiceNumber)
            .NotEmpty().WithMessage("Invoice number is required")
            .MaximumLength(50).WithMessage("Invoice number cannot exceed 50 characters")
            .Matches(@"^[A-Z0-9\-\/]+$").WithMessage("Invoice number format is invalid");

        RuleFor(x => x.CompanyName)
            .NotEmpty().WithMessage("Company name is required")
            .MaximumLength(200).WithMessage("Company name cannot exceed 200 characters");

        RuleFor(x => x.CompanyNpwp)
            .NotEmpty().WithMessage("Company NPWP is required")
            .Must(BeValidNpwpFormat).WithMessage("NPWP format is invalid");

        RuleFor(x => x.InvoiceDate)
            .NotEmpty().WithMessage("Invoice date is required")
            .LessThanOrEqualTo(DateTime.Today.AddDays(30)).WithMessage("Invoice date cannot be more than 30 days in the future");

        RuleFor(x => x.DueDate)
            .GreaterThanOrEqualTo(x => x.InvoiceDate).WithMessage("Due date must be on or after invoice date")
            .When(x => x.DueDate.HasValue);

        RuleFor(x => x.VatPercentage)
            .GreaterThanOrEqualTo(0).WithMessage("VAT percentage cannot be negative")
            .LessThanOrEqualTo(100).WithMessage("VAT percentage cannot exceed 100%");

        RuleFor(x => x.Notes)
            .MaximumLength(1000).WithMessage("Notes cannot exceed 1000 characters");
    }

    private bool BeValidNpwpFormat(string npwp)
    {
        if (string.IsNullOrEmpty(npwp)) return false;
        
        // NPWP format: XX.XXX.XXX.X-XXX.XXX
        var npwpPattern = @"^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$";
        return Regex.IsMatch(npwp, npwpPattern);
    }
}

public class ImportInvoiceLineValidator : AbstractValidator<ImportInvoiceLineDto>
{
    public ImportInvoiceLineValidator()
    {
        RuleFor(x => x.InvoiceNumber)
            .NotEmpty().WithMessage("Invoice number is required")
            .MaximumLength(50).WithMessage("Invoice number cannot exceed 50 characters");

        RuleFor(x => x.Baris)
            .GreaterThan(0).WithMessage("Baris number must be greater than zero");

        RuleFor(x => x.TkaName)
            .NotEmpty().WithMessage("TKA name is required")
            .MaximumLength(100).WithMessage("TKA name cannot exceed 100 characters");

        RuleFor(x => x.TkaPassport)
            .NotEmpty().WithMessage("TKA passport is required")
            .MinimumLength(6).WithMessage("Passport number must be at least 6 characters")
            .MaximumLength(20).WithMessage("Passport number cannot exceed 20 characters")
            .Matches(@"^[A-Z0-9]+$").WithMessage("Passport number can only contain uppercase letters and numbers");

        RuleFor(x => x.JobName)
            .NotEmpty().WithMessage("Job name is required")
            .MaximumLength(200).WithMessage("Job name cannot exceed 200 characters");

        RuleFor(x => x.JobDescription)
            .NotEmpty().WithMessage("Job description is required")
            .MaximumLength(1000).WithMessage("Job description cannot exceed 1000 characters");

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Quantity must be greater than zero");

        RuleFor(x => x.UnitPrice)
            .GreaterThanOrEqualTo(0).WithMessage("Unit price cannot be negative");

        RuleFor(x => x.LineTotal)
            .GreaterThanOrEqualTo(0).WithMessage("Line total cannot be negative");

        RuleFor(x => x)
            .Must(HaveValidLineTotal).WithMessage("Line total does not match quantity × unit price");
    }

    private bool HaveValidLineTotal(ImportInvoiceLineDto line)
    {
        var expectedTotal = line.Quantity * line.UnitPrice;
        return Math.Abs(line.LineTotal - expectedTotal) < 0.01m;
    }
}

public class ImportValidationResultValidator : AbstractValidator<ImportValidationResult>
{
    public ImportValidationResultValidator()
    {
        RuleFor(x => x.EstimatedRecordCount)
            .GreaterThanOrEqualTo(0).WithMessage("Estimated record count cannot be negative");

        RuleForEach(x => x.Errors).SetValidator(new ImportValidationErrorValidator());
        RuleForEach(x => x.Warnings).SetValidator(new ImportValidationWarningValidator());
    }
}

public class ImportValidationErrorValidator : AbstractValidator<ImportValidationError>
{
    public ImportValidationErrorValidator()
    {
        RuleFor(x => x.RowNumber)
            .GreaterThan(0).WithMessage("Row number must be greater than zero")
            .When(x => x.RowNumber > 0);

        RuleFor(x => x.ErrorMessage)
            .NotEmpty().WithMessage("Error message is required")
            .MaximumLength(500).WithMessage("Error message cannot exceed 500 characters");

        RuleFor(x => x.ErrorCode)
            .MaximumLength(20).WithMessage("Error code cannot exceed 20 characters");
    }
}

public class ImportValidationWarningValidator : AbstractValidator<ImportValidationWarning>
{
    public ImportValidationWarningValidator()
    {
        RuleFor(x => x.RowNumber)
            .GreaterThan(0).WithMessage("Row number must be greater than zero")
            .When(x => x.RowNumber > 0);

        RuleFor(x => x.WarningMessage)
            .NotEmpty().WithMessage("Warning message is required")
            .MaximumLength(500).WithMessage("Warning message cannot exceed 500 characters");

        RuleFor(x => x.WarningCode)
            .MaximumLength(20).WithMessage("Warning code cannot exceed 20 characters");
    }
}

public class CsvImportOptionsValidator : AbstractValidator<CsvImportOptions>
{
    public CsvImportOptionsValidator()
    {
        RuleFor(x => x.Delimiter)
            .NotEmpty().WithMessage("CSV delimiter is required")
            .MaximumLength(1).WithMessage("Delimiter must be a single character");

        RuleFor(x => x.TextQualifier)
            .MaximumLength(1).WithMessage("Text qualifier must be a single character")
            .When(x => !string.IsNullOrEmpty(x.TextQualifier));

        RuleFor(x => x.ColumnMapping)
            .NotNull().WithMessage("Column mapping is required");
    }
}

public class ImportCommandValidator : AbstractValidator<ImportInvoiceCommand>
{
    public ImportCommandValidator()
    {
        RuleFor(x => x.FilePath)
            .NotEmpty().WithMessage("File path is required")
            .Must(FileExists).WithMessage("Import file does not exist");

        RuleFor(x => x.FileType)
            .IsInEnum().WithMessage("Invalid file type");

        RuleFor(x => x.ImportedBy)
            .GreaterThan(0).WithMessage("Imported by user must be specified");

        RuleFor(x => x.Options)
            .NotNull().WithMessage("Import options are required")
            .SetValidator(new ImportOptionsValidator());
    }

    private bool FileExists(string filePath)
    {
        return !string.IsNullOrEmpty(filePath) && File.Exists(filePath);
    }
}

public class BulkImportValidator : AbstractValidator<List<ImportInvoiceHeaderDto>>
{
    public BulkImportValidator()
    {
        RuleFor(x => x)
            .NotEmpty().WithMessage("Import data cannot be empty")
            .Must(HaveUniqueInvoiceNumbers).WithMessage("Duplicate invoice numbers found in import data");

        RuleForEach(x => x).SetValidator(new ImportInvoiceHeaderValidator());
    }

    private bool HaveUniqueInvoiceNumbers(List<ImportInvoiceHeaderDto> headers)
    {
        var invoiceNumbers = headers.Where(h => !string.IsNullOrEmpty(h.InvoiceNumber))
                                   .Select(h => h.InvoiceNumber)
                                   .ToList();
        return invoiceNumbers.Count == invoiceNumbers.Distinct().Count();
    }
}

// Template validation for import files
public class ImportTemplateValidator : AbstractValidator<ImportTemplateDto>
{
    public ImportTemplateValidator()
    {
        RuleFor(x => x.TemplateName)
            .NotEmpty().WithMessage("Template name is required")
            .MaximumLength(100).WithMessage("Template name cannot exceed 100 characters");

        RuleFor(x => x.FileType)
            .IsInEnum().WithMessage("Invalid file type");

        RuleFor(x => x.RequiredColumns)
            .NotEmpty().WithMessage("Required columns must be specified");

        RuleFor(x => x.OptionalColumns)
            .NotNull().WithMessage("Optional columns list cannot be null");

        RuleFor(x => x.SampleData)
            .NotEmpty().WithMessage("Sample data is required for template")
            .When(x => x.IncludeSampleData);
    }
}

// Supporting DTOs for import validation
public class ImportTemplateDto
{
    public string TemplateName { get; set; } = string.Empty;
    public ImportFileType FileType { get; set; }
    public List<string> RequiredColumns { get; set; } = new();
    public List<string> OptionalColumns { get; set; } = new();
    public bool IncludeSampleData { get; set; }
    public Dictionary<string, object> SampleData { get; set; } = new();
}

public class ImportErrorDto
{
    public int RowNumber { get; set; }
    public string Field { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string ErrorCode { get; set; } = string.Empty;
    public object? Value { get; set; }
}