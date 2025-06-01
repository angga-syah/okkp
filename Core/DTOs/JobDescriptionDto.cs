// E:\kp\4 invoice\Core\DTOs\JobDescriptionDto.cs
namespace InvoiceApp.Core.DTOs;

public class JobDescriptionDto
{
    public int Id { get; set; }
    public Guid JobUuid { get; set; }
    public int CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string JobName { get; set; } = string.Empty;
    public string JobDescription { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}