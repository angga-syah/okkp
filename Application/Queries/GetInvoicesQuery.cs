// E:\kp\4 invoice\Application\Queries\GetInvoicesQuery.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;
using MediatR;

namespace InvoiceApp.Application.Queries;

public class GetInvoicesQuery : IRequest<PagedResult<InvoiceDto>>
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? SearchTerm { get; set; }
    public int? CompanyId { get; set; }
    public InvoiceStatus? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? SortBy { get; set; } = "InvoiceDate";
    public string? SortDirection { get; set; } = "DESC";
    public bool IncludeLines { get; set; } = false;
    public bool IncludeCompany { get; set; } = true;
    public int? UserId { get; set; } // For user-specific filtering
}

public class GetInvoiceByIdQuery : IRequest<InvoiceDto?>
{
    public int InvoiceId { get; set; }
    public bool IncludeLines { get; set; } = true;
    public bool IncludeCompany { get; set; } = true;
    public bool IncludeBankAccount { get; set; } = true;
    public bool IncludeTkaWorkers { get; set; } = true;
}

public class GetInvoiceByNumberQuery : IRequest<InvoiceDto?>
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public bool IncludeLines { get; set; } = true;
    public bool IncludeCompany { get; set; } = true;
}

public class GetInvoiceStatsQuery : IRequest<InvoiceStatsDto>
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int? CompanyId { get; set; }
    public int? UserId { get; set; }
}

public class GetInvoiceHistoryQuery : IRequest<List<InvoiceHistoryDto>>
{
    public int InvoiceId { get; set; }
    public bool IncludeUserDetails { get; set; } = true;
}

public class SearchInvoicesQuery : IRequest<List<SearchResultDto>>
{
    public string SearchTerm { get; set; } = string.Empty;
    public int MaxResults { get; set; } = 50;
    public InvoiceSearchScope Scope { get; set; } = InvoiceSearchScope.All;
    public int? UserId { get; set; }
}

public enum InvoiceSearchScope
{
    All,
    InvoiceNumber,
    CompanyName,
    TkaName,
    JobDescription,
    Notes
}

public class GetRecentInvoicesQuery : IRequest<List<InvoiceDto>>
{
    public int Count { get; set; } = 10;
    public int? UserId { get; set; }
    public bool OnlyMyInvoices { get; set; } = false;
}

public class GetInvoicesByCompanyQuery : IRequest<PagedResult<InvoiceDto>>
{
    public int CompanyId { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public InvoiceStatus? Status { get; set; }
    public string? SortBy { get; set; } = "InvoiceDate";
    public string? SortDirection { get; set; } = "DESC";
}

public class GetDuplicateInvoicesQuery : IRequest<List<DuplicateInvoiceDto>>
{
    public string? InvoiceNumber { get; set; }
    public int? CompanyId { get; set; }
    public DateTime? InvoiceDate { get; set; }
    public bool ExactMatch { get; set; } = false;
}

public class GetInvoiceNextNumberQuery : IRequest<string>
{
    public int? CompanyId { get; set; }
    public DateTime? InvoiceDate { get; set; }
    public string? NumberFormat { get; set; }
}

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasPreviousPage => PageNumber > 1;
    public bool HasNextPage => PageNumber < TotalPages;
}

public class InvoiceStatsDto
{
    public int TotalInvoices { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TotalVat { get; set; }
    public int DraftInvoices { get; set; }
    public int FinalizedInvoices { get; set; }
    public int PaidInvoices { get; set; }
    public decimal AverageInvoiceAmount { get; set; }
    public InvoiceDto? HighestInvoice { get; set; }
    public InvoiceDto? LatestInvoice { get; set; }
    public Dictionary<string, int> InvoicesByMonth { get; set; } = new();
    public Dictionary<string, decimal> AmountsByMonth { get; set; } = new();
}

public class InvoiceHistoryDto
{
    public int Id { get; set; }
    public int InvoiceId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public DateTime ChangedAt { get; set; }
    public int ChangedBy { get; set; }
    public string? ChangedByName { get; set; }
    public string? ChangeReason { get; set; }
}

public class DuplicateInvoiceDto
{
    public InvoiceDto Invoice { get; set; } = new();
    public DuplicateReason Reason { get; set; }
    public double SimilarityScore { get; set; }
    public List<string> MatchingFields { get; set; } = new();
}

public enum DuplicateReason
{
    SameInvoiceNumber,
    SameCompanyAndDate,
    SimilarContent,
    ExactMatch
}