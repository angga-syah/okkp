// E:\kp\4 invoice\Core\Entities\UserPreference.cs
namespace InvoiceApp.Core.Entities;

public class UserPreference
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string PreferenceKey { get; set; } = string.Empty;
    public string PreferenceValue { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual User User { get; set; } = null!;
}