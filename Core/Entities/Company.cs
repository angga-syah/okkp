// E:\kp\4 invoice\Core\Entities\Company.cs
namespace InvoiceApp.Core.Entities;

public class Company
{
    public int Id { get; set; }
    public Guid CompanyUuid { get; set; } = Guid.NewGuid();
    public string CompanyName { get; set; } = string.Empty;
    public string Npwp { get; set; } = string.Empty;
    public string Idtku { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? ContactPerson { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    public virtual ICollection<JobDescription> JobDescriptions { get; set; } = new List<JobDescription>();
    public virtual ICollection<CompanyTkaAssignment> CompanyTkaAssignments { get; set; } = new List<CompanyTkaAssignment>();
}