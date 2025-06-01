// E:\kp\4 invoice\Core\DTOs\TkaSelectionItem.cs
namespace InvoiceApp.Core.DTOs;

public class TkaSelectionItem
{
    public int Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string TkaMainName { get; set; } = string.Empty;
    public string Nama { get; set; } = string.Empty;
    public string Passport { get; set; } = string.Empty;
    public string? Divisi { get; set; }
    public string Relationship { get; set; } = string.Empty;
    public bool IsMainTka { get; set; }
}