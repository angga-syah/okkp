// E:\kp\4 invoice\Core\DTOs\InvoiceLineDto.cs
namespace InvoiceApp.Core.DTOs;

public class InvoiceLineDto
{
    public int Id { get; set; }
    public Guid LineUuid { get; set; }
    public int InvoiceId { get; set; }
    public int Baris { get; set; }
    public int LineOrder { get; set; }
    public int TkaId { get; set; }
    public string TkaName { get; set; } = string.Empty;
    public string TkaPassport { get; set; } = string.Empty;
    public int JobDescriptionId { get; set; }
    public string JobName { get; set; } = string.Empty;
    public string JobDescriptionText { get; set; } = string.Empty;
    public string? CustomJobName { get; set; }
    public string? CustomJobDescription { get; set; }
    public decimal? CustomPrice { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public string DisplayJobName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}