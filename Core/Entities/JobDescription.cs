// E:\kp\4 invoice\Core\Entities\JobDescription.cs
namespace InvoiceApp.Core.Entities;

public class JobDescription
{
    public int Id { get; set; }
    public Guid JobUuid { get; set; } = Guid.NewGuid();
    public int CompanyId { get; set; }
    public string JobName { get; set; } = string.Empty;
    public string JobDescription { get; set; } = string.Empty;
    public decimal Price { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual Company Company { get; set; } = null!;
    public virtual ICollection<InvoiceLine> InvoiceLines { get; set; } = new List<InvoiceLine>();
}