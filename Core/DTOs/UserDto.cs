// E:\kp\4 invoice\Core\DTOs\UserDto.cs
namespace InvoiceApp.Core.DTOs;

public class UserDto
{
    public int Id { get; set; }
    public Guid UserUuid { get; set; }
    public string Username { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime? LastLogin { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}