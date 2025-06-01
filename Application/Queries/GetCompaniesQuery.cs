// E:\kp\4 invoice\Application\Queries\GetCompaniesQuery.cs
using InvoiceApp.Core.DTOs;
using MediatR;

namespace InvoiceApp.Application.Queries;

public class GetCompaniesQuery : IRequest<PagedResult<CompanyDto>>
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? SearchTerm { get; set; }
    public bool? IsActive { get; set; }
    public string? SortBy { get; set; } = "CompanyName";
    public string? SortDirection { get; set; } = "ASC";
    public bool IncludeJobDescriptions { get; set; } = false;
    public bool IncludeTkaAssignments { get; set; } = false;
    public bool IncludeInvoiceStats { get; set; } = false;
}

public class GetCompanyByIdQuery : IRequest<CompanyDto?>
{
    public int CompanyId { get; set; }
    public bool IncludeJobDescriptions { get; set; } = true;
    public bool IncludeTkaAssignments { get; set; } = true;
    public bool IncludeInvoiceStats { get; set; } = true;
}

public class GetCompanyByNpwpQuery : IRequest<CompanyDto?>
{
    public string Npwp { get; set; } = string.Empty;
    public bool IncludeJobDescriptions { get; set; } = false;
}

public class SearchCompaniesQuery : IRequest<List<SearchResultDto>>
{
    public string SearchTerm { get; set; } = string.Empty;
    public int MaxResults { get; set; } = 20;
    public CompanySearchScope Scope { get; set; } = CompanySearchScope.All;
    public bool OnlyActive { get; set; } = true;
}

public enum CompanySearchScope
{
    All,
    CompanyName,
    Npwp,
    Idtku,
    Address,
    ContactPerson
}

public class GetCompanyJobDescriptionsQuery : IRequest<List<JobDescriptionDto>>
{
    public int CompanyId { get; set; }
    public bool? IsActive { get; set; } = true;
    public string? SortBy { get; set; } = "SortOrder";
    public string? SortDirection { get; set; } = "ASC";
}

public class GetCompaniesWithJobsQuery : IRequest<List<CompanyWithJobsDto>>
{
    public bool OnlyActive { get; set; } = true;
    public string? SearchTerm { get; set; }
    public int? MinJobCount { get; set; }
}

public class GetCompanyTkaAssignmentsQuery : IRequest<List<CompanyTkaAssignmentDto>>
{
    public int CompanyId { get; set; }
    public bool? IsActive { get; set; } = true;
    public DateTime? AssignmentDate { get; set; }
    public bool IncludeFamilyMembers { get; set; } = true;
}

public class GetCompanyStatsQuery : IRequest<CompanyStatsDto>
{
    public int CompanyId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

public class GetCompanyInvoiceSummaryQuery : IRequest<List<CompanyInvoiceSummaryDto>>
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public bool OnlyActive { get; set; } = true;
    public string? SortBy { get; set; } = "TotalAmount";
    public string? SortDirection { get; set; } = "DESC";
}

public class CompanyWithJobsDto : CompanyDto
{
    public List<JobDescriptionDto> JobDescriptions { get; set; } = new();
    public int ActiveJobCount { get; set; }
    public decimal AverageJobPrice { get; set; }
    public decimal TotalJobValue { get; set; }
}

public class CompanyTkaAssignmentDto
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    public int TkaId { get; set; }
    public string TkaName { get; set; } = string.Empty;
    public string TkaPassport { get; set; } = string.Empty;
    public string TkaDivisi { get; set; } = string.Empty;
    public DateTime AssignmentDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsActive { get; set; }
    public string? Notes { get; set; }
    public List<TkaFamilyMemberDto> FamilyMembers { get; set; } = new();
}

public class CompanyStatsDto
{
    public int CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public int TotalInvoices { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TotalVat { get; set; }
    public decimal AverageInvoiceAmount { get; set; }
    public int ActiveTkaCount { get; set; }
    public int ActiveJobDescriptions { get; set; }
    public InvoiceDto? LatestInvoice { get; set; }
    public InvoiceDto? HighestInvoice { get; set; }
    public Dictionary<string, int> InvoicesByMonth { get; set; } = new();
    public Dictionary<string, decimal> AmountsByMonth { get; set; } = new();
}

public class CompanyInvoiceSummaryDto
{
    public int CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string Npwp { get; set; } = string.Empty;
    public int InvoiceCount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TotalVat { get; set; }
    public decimal AverageAmount { get; set; }
    public DateTime? LastInvoiceDate { get; set; }
    public string? LastInvoiceNumber { get; set; }
    public int DraftCount { get; set; }
    public int FinalizedCount { get; set; }
    public int PaidCount { get; set; }
}