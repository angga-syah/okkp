// E:\kp\4 invoice\Core\Entities\Invoice.cs
using InvoiceApp.Core.Enums;

namespace InvoiceApp.Core.Entities;

public class Invoice
{
    public int Id { get; set; }
    public Guid InvoiceUuid { get; set; } = Guid.NewGuid();
    public string InvoiceNumber { get; set; } = string.Empty;
    public int CompanyId { get; set; }
    public DateTime InvoiceDate { get; set; } = DateTime.Today;
    public DateTime? DueDate { get; set; }
    public decimal Subtotal { get; set; } = 0;
    public decimal VatPercentage { get; set; } = 11.00m;
    public decimal VatAmount { get; set; } = 0;
    public decimal TotalAmount { get; set; } = 0;
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    public string? Notes { get; set; }
    public int? BankAccountId { get; set; }
    public int PrintedCount { get; set; } = 0;
    public DateTime? LastPrintedAt { get; set; }
    public string? ImportedFrom { get; set; }
    public string? ImportBatchId { get; set; }
    public int CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual Company Company { get; set; } = null!;
    public virtual BankAccount? BankAccount { get; set; }
    public virtual User CreatedByUser { get; set; } = null!;
    public virtual ICollection<InvoiceLine> InvoiceLines { get; set; } = new List<InvoiceLine>();
}