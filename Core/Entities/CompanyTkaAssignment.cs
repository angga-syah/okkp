// E:\kp\4 invoice\Core\Entities\CompanyTkaAssignment.cs
namespace InvoiceApp.Core.Entities;

public class CompanyTkaAssignment
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    public int TkaId { get; set; }
    public DateTime AssignmentDate { get; set; } = DateTime.Today;
    public DateTime? EndDate { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual Company Company { get; set; } = null!;
    public virtual TkaWorker TkaWorker { get; set; } = null!;
}