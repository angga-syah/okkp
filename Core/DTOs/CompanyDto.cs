// E:\kp\4 invoice\Core\DTOs\CompanyDto.cs
namespace InvoiceApp.Core.DTOs;

public class CompanyDto
{
    public int Id { get; set; }
    public Guid CompanyUuid { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string Npwp { get; set; } = string.Empty;
    public string Idtku { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? ContactPerson { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int InvoiceCount { get; set; }
    public decimal TotalInvoiceAmount { get; set; }
    public int ActiveTkaCount { get; set; }

    public List<JobDescriptionDto> JobDescriptions { get; set; } = new();
}