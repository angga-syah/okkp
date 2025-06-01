// E:\kp\4 invoice\Core\Entities\Company.cs
using System;
using System.Collections.Generic;

namespace InvoiceApp.Core.Entities;

public class Company
{
    public int Id { get; set; }
    public Guid CompanyUuid { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string Npwp { get; set; } = string.Empty;
    public string Idtku { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? ContactPerson { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public virtual ICollection<JobDescription> JobDescriptions { get; set; } = new List<JobDescription>();
    public virtual ICollection<CompanyTkaAssignment> TkaAssignments { get; set; } = new List<CompanyTkaAssignment>();
    public virtual ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();

    // Computed properties
    public int InvoiceCount => Invoices?.Count ?? 0;
}