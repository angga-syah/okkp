// E:\kp\4 invoice\Core\Entities\TkaWorker.cs
using InvoiceApp.Core.Enums;

namespace InvoiceApp.Core.Entities;

public class TkaWorker
{
    public int Id { get; set; }
    public Guid TkaUuid { get; set; } = Guid.NewGuid();
    public string Nama { get; set; } = string.Empty;
    public string Passport { get; set; } = string.Empty;
    public string? Divisi { get; set; }
    public Gender JenisKelamin { get; set; } = Gender.LakiLaki;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual ICollection<TkaFamilyMember> FamilyMembers { get; set; } = new List<TkaFamilyMember>();
    public virtual ICollection<CompanyTkaAssignment> CompanyTkaAssignments { get; set; } = new List<CompanyTkaAssignment>();
    public virtual ICollection<InvoiceLine> InvoiceLines { get; set; } = new List<InvoiceLine>();
}