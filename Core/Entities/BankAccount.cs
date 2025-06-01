// E:\kp\4 invoice\Core\Entities\BankAccount.cs
namespace InvoiceApp.Core.Entities;

public class BankAccount
{
    public int Id { get; set; }
    public Guid BankUuid { get; set; } = Guid.NewGuid();
    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string? BranchName { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
}