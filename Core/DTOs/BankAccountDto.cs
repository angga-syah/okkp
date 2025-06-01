// E:\kp\4 invoice\Core\DTOs\BankAccountDto.cs
namespace InvoiceApp.Core.DTOs;

public class BankAccountDto
{
    public int Id { get; set; }
    public Guid BankUuid { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string? BranchName { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}