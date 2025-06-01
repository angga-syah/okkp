// E:\kp\4 invoice\Core\Entities\InvoiceAuditLog.cs
using InvoiceApp.Core.Enums;

namespace InvoiceApp.Core.Entities;

public class InvoiceAuditLog
{
    public int Id { get; set; }
    public Guid AuditUuid { get; set; } = Guid.NewGuid();
    
    // Referenced Invoice
    public int InvoiceId { get; set; }
    public virtual Invoice Invoice { get; set; } = null!;
    
    // Audit Information
    public string Action { get; set; } = string.Empty; // Created, Updated, Deleted, Finalized, Printed, etc.
    public string TableName { get; set; } = string.Empty;
    public string PrimaryKey { get; set; } = string.Empty;
    
    // Change Details
    public string? OldValues { get; set; } // JSON string of old values
    public string? NewValues { get; set; } // JSON string of new values
    public string? ChangedFields { get; set; } // Comma-separated list of changed fields
    
    // User Context
    public int UserId { get; set; }
    public virtual User User { get; set; } = null!;
    public string UserName { get; set; } = string.Empty;
    public UserRole UserRole { get; set; }
    
    // System Context
    public string IpAddress { get; set; } = string.Empty;
    public string UserAgent { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    
    // Timing
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public DateTime? EffectiveDate { get; set; }
    
    // Additional Context
    public string? Reason { get; set; }
    public string? Comments { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
    
    // Status
    public bool IsDeleted { get; set; }
    public bool IsSystemGenerated { get; set; }
}