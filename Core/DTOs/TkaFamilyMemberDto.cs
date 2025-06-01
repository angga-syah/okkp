// E:\kp\4 invoice\Core\DTOs\TkaFamilyMemberDto.cs
namespace InvoiceApp.Core.DTOs;

public class TkaFamilyMemberDto
{
    public int Id { get; set; }
    public Guid FamilyUuid { get; set; }
    public int TkaId { get; set; }
    public string TkaName { get; set; } = string.Empty;
    public string Nama { get; set; } = string.Empty;
    public string Passport { get; set; } = string.Empty;
    public string JenisKelaminText { get; set; } = string.Empty;
    public string RelationshipText { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}