// E:\kp\4 invoice\Core\DTOs\TkaWorkerDto.cs
namespace InvoiceApp.Core.DTOs;

public class TkaWorkerDto
{
    public int Id { get; set; }
    public Guid TkaUuid { get; set; }
    public string Nama { get; set; } = string.Empty;
    public string Passport { get; set; } = string.Empty;
    public string? Divisi { get; set; }
    public string JenisKelaminText { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int FamilyMemberCount { get; set; }
    public int ActiveCompanyAssignments { get; set; }

    public List<TkaFamilyMemberDto> FamilyMembers { get; set; } = new();
}