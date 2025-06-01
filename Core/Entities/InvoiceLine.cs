// E:\kp\4 invoice\Core\Entities\InvoiceLine.cs
namespace InvoiceApp.Core.Entities;

public class InvoiceLine
{
    public int Id { get; set; }
    public Guid LineUuid { get; set; } = Guid.NewGuid();
    
    // Parent Invoice
    public int InvoiceId { get; set; }
    public virtual Invoice Invoice { get; set; } = null!;
    
    // Line Ordering
    public int Baris { get; set; } // Group number (multiple lines can share same baris)
    public int LineOrder { get; set; } // Order within the baris
    
    // TKA Worker (can be main worker or family member)
    public int TkaId { get; set; }
    public virtual TkaWorker TkaWorker { get; set; } = null!;
    
    // Job Description
    public int JobDescriptionId { get; set; }
    public virtual JobDescription JobDescription { get; set; } = null!;
    
    // Custom Override Values (when different from job description)
    public string? CustomJobName { get; set; }
    public string? CustomJobDescription { get; set; }
    public decimal? CustomPrice { get; set; }
    
    // Line Details
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    
    // Additional Information
    public string? Notes { get; set; }
    public string? PoNumber { get; set; }
    public DateTime? ServiceDate { get; set; }
    
    // Audit Fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public int? CreatedBy { get; set; }
    public int? UpdatedBy { get; set; }
    
    // Computed Properties
    public string DisplayName => !string.IsNullOrEmpty(CustomJobName) ? CustomJobName : JobDescription?.JobName ?? "";
    public string DisplayDescription => !string.IsNullOrEmpty(CustomJobDescription) ? CustomJobDescription : JobDescription?.JobDescription ?? "";
    public decimal EffectiveUnitPrice => CustomPrice ?? JobDescription?.Price ?? UnitPrice;
    
    // Business Logic Methods
    public void CalculateTotal()
    {
        LineTotal = Quantity * UnitPrice;
    }
    
    public void UpdateFromJobDescription()
    {
        if (JobDescription != null)
        {
            UnitPrice = CustomPrice ?? JobDescription.Price;
            CalculateTotal();
        }
    }
    
    public bool HasCustomValues()
    {
        return !string.IsNullOrEmpty(CustomJobName) || 
               !string.IsNullOrEmpty(CustomJobDescription) || 
               CustomPrice.HasValue;
    }
}
