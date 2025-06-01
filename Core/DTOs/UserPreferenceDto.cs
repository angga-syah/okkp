// E:\kp\4 invoice\Core\DTOs\UserPreferenceDto.cs
namespace InvoiceApp.Core.DTOs;

public class UserPreferenceDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string PreferenceKey { get; set; } = string.Empty;
    public string PreferenceValue { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}