// E:\kp\4 invoice\Core\DTOs\InvoiceDto.cs
namespace InvoiceApp.Core.DTOs;

public class InvoiceDto
{
    public int Id { get; set; }
    public Guid InvoiceUuid { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public int CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string CompanyNpwp { get; set; } = string.Empty;
    public string CompanyAddress { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public DateTime? DueDate { get; set; }
    public decimal Subtotal { get; set; }
    public decimal VatPercentage { get; set; }
    public decimal VatAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string StatusText { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public int? BankAccountId { get; set; }
    public string? BankAccountName { get; set; }
    public int PrintedCount { get; set; }
    public DateTime? LastPrintedAt { get; set; }
    public string? ImportedFrom { get; set; }
    public string? ImportBatchId { get; set; }
    public int CreatedBy { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int LineCount { get; set; }
    public string AmountInWords { get; set; } = string.Empty;

    public List<InvoiceLineDto> InvoiceLines { get; set; } = new();
}