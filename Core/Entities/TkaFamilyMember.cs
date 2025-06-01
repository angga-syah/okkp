// E:\kp\4 invoice\Core\Entities\TkaFamilyMember.cs
using InvoiceApp.Core.Enums;

namespace InvoiceApp.Core.Entities;

public class TkaFamilyMember
{
    public int Id { get; set; }
    public Guid FamilyUuid { get; set; } = Guid.NewGuid();
    public int TkaId { get; set; }
    public string Nama { get; set; } = string.Empty;
    public string Passport { get; set; } = string.Empty;
    public Gender JenisKelamin { get; set; } = Gender.LakiLaki;
    public FamilyRelationship Relationship { get; set; } = FamilyRelationship.Spouse;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual TkaWorker TkaWorker { get; set; } = null!;
}