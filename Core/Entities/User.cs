using System;
using System.Collections.Generic;
using InvoiceApp.Core.Enums;

namespace InvoiceApp.Core.Entities;

public class User
{
    public int Id { get; set; }
    public Guid UserUuid { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Viewer;
    public string FullName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime? LastLogin { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public virtual ICollection<Invoice> CreatedInvoices { get; set; } = new List<Invoice>();
    public virtual ICollection<ImportLog> ImportLogs { get; set; } = new List<ImportLog>();
    public virtual ICollection<UserPreference> UserPreferences { get; set; } = new List<UserPreference>();
}