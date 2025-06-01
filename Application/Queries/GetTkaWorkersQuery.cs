// E:\kp\4 invoice\Application\Queries\GetTkaWorkersQuery.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;
using MediatR;

namespace InvoiceApp.Application.Queries;

public class GetTkaWorkersQuery : IRequest<PagedResult<TkaWorkerDto>>
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? SearchTerm { get; set; }
    public bool? IsActive { get; set; }
    public Gender? JenisKelamin { get; set; }
    public string? Divisi { get; set; }
    public string? SortBy { get; set; } = "Nama";
    public string? SortDirection { get; set; } = "ASC";
    public bool IncludeFamilyMembers { get; set; } = false;
    public bool IncludeCompanyAssignments { get; set; } = false;
}

public class GetTkaWorkerByIdQuery : IRequest<TkaWorkerDto?>
{
    public int TkaId { get; set; }
    public bool IncludeFamilyMembers { get; set; } = true;
    public bool IncludeCompanyAssignments { get; set; } = true;
    public bool IncludeInvoiceHistory { get; set; } = false;
}

public class GetTkaWorkerByPassportQuery : IRequest<TkaWorkerDto?>
{
    public string Passport { get; set; } = string.Empty;
    public bool IncludeFamilyMembers { get; set; } = false;
}

public class SearchTkaWorkersQuery : IRequest<List<SearchResultDto>>
{
    public string SearchTerm { get; set; } = string.Empty;
    public int MaxResults { get; set; } = 20;
    public TkaSearchScope Scope { get; set; } = TkaSearchScope.All;
    public bool OnlyActive { get; set; } = true;
    public int? CompanyId { get; set; } // Filter by company assignment
}

public enum TkaSearchScope
{
    All,
    Nama,
    Passport,
    Divisi
}

public class GetTkaWorkersByCompanyQuery : IRequest<List<TkaSelectionItem>>
{
    public int CompanyId { get; set; }
    public string? SearchTerm { get; set; }
    public bool IncludeFamilyMembers { get; set; } = true;
    public bool OnlyActiveAssignments { get; set; } = true;
    public DateTime? AssignmentDate { get; set; }
}

public class GetTkaFamilyMembersQuery : IRequest<List<TkaFamilyMemberDto>>
{
    public int TkaId { get; set; }
    public bool? IsActive { get; set; } = true;
    public FamilyRelationship? Relationship { get; set; }
}

public class GetTkaWithFamilyQuery : IRequest<TkaWithFamilyDto>
{
    public int TkaId { get; set; }
    public bool IncludeInactiveFamily { get; set; } = false;
}

public class GetTkaInvoiceHistoryQuery : IRequest<List<TkaInvoiceHistoryDto>>
{
    public int TkaId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int? CompanyId { get; set; }
    public bool IncludeFamilyInvoices { get; set; } = true;
}

public class GetTkaStatsQuery : IRequest<TkaStatsDto>
{
    public int TkaId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public bool IncludeFamilyStats { get; set; } = true;
}

public class GetTkaDivisionsQuery : IRequest<List<string>>
{
    public bool OnlyActive { get; set; } = true;
    public string? SearchTerm { get; set; }
}

public class GetUnassignedTkaWorkersQuery : IRequest<List<TkaWorkerDto>>
{
    public string? SearchTerm { get; set; }
    public bool IncludeFamilyMembers { get; set; } = false;
    public DateTime? AsOfDate { get; set; }
}

public class TkaWithFamilyDto : TkaWorkerDto
{
    public List<TkaFamilyMemberDto> FamilyMembers { get; set; } = new();
    public int ActiveFamilyCount { get; set; }
    public int TotalFamilyCount { get; set; }
}

public class TkaInvoiceHistoryDto
{
    public int InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public string JobDescription { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsMainTka { get; set; } // true if TKA, false if family member
    public string? FamilyMemberName { get; set; }
    public FamilyRelationship? Relationship { get; set; }
}

public class TkaStatsDto
{
    public int TkaId { get; set; }
    public string TkaName { get; set; } = string.Empty;
    public int TotalInvoices { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal AverageInvoiceAmount { get; set; }
    public int ActiveCompanyAssignments { get; set; }
    public int FamilyInvoices { get; set; }
    public decimal FamilyTotalAmount { get; set; }
    public InvoiceDto? LatestInvoice { get; set; }
    public InvoiceDto? HighestInvoice { get; set; }
    public Dictionary<string, int> InvoicesByMonth { get; set; } = new();
    public Dictionary<string, decimal> AmountsByMonth { get; set; } = new();
    public Dictionary<string, int> InvoicesByCompany { get; set; } = new();
    public Dictionary<string, int> InvoicesByJobType { get; set; } = new();
}