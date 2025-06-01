// E:\kp\4 invoice\Application\Handlers\InvoiceQueryHandler.cs
using AutoMapper;
using InvoiceApp.Application.Queries;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Interfaces;
using InvoiceApp.Core.Interfaces.Services;
using MediatR;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Application.Handlers;

public class InvoiceQueryHandler :
    IRequestHandler<GetInvoicesQuery, PagedResult<InvoiceDto>>,
    IRequestHandler<GetInvoiceByIdQuery, InvoiceDto?>,
    IRequestHandler<GetInvoiceByNumberQuery, InvoiceDto?>,
    IRequestHandler<GetInvoiceStatsQuery, InvoiceStatsDto>,
    IRequestHandler<SearchInvoicesQuery, List<SearchResultDto>>,
    IRequestHandler<GetRecentInvoicesQuery, List<InvoiceDto>>,
    IRequestHandler<GetInvoicesByCompanyQuery, PagedResult<InvoiceDto>>,
    IRequestHandler<GetDuplicateInvoicesQuery, List<DuplicateInvoiceDto>>,
    IRequestHandler<GetInvoiceNextNumberQuery, string>,
    IRequestHandler<GetInvoiceHistoryQuery, List<InvoiceHistoryDto>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<InvoiceQueryHandler> _logger;
    private readonly ISearchService _searchService;
    private readonly IInvoiceNumberService _invoiceNumberService;
    private readonly ICachingService _cachingService;

    public InvoiceQueryHandler(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        ILogger<InvoiceQueryHandler> logger,
        ISearchService searchService,
        IInvoiceNumberService invoiceNumberService,
        ICachingService cachingService)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _logger = logger;
        _searchService = searchService;
        _invoiceNumberService = invoiceNumberService;
        _cachingService = cachingService;
    }

    public async Task<PagedResult<InvoiceDto>> Handle(GetInvoicesQuery request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Getting invoices with pagination. Page: {Page}, Size: {Size}", 
            request.PageNumber, request.PageSize);

        var invoices = await _unitOfWork.InvoiceRepository.GetPagedAsync(
            pageNumber: request.PageNumber,
            pageSize: request.PageSize,
            searchTerm: request.SearchTerm,
            companyId: request.CompanyId,
            status: request.Status,
            fromDate: request.FromDate,
            toDate: request.ToDate,
            sortBy: request.SortBy,
            sortDirection: request.SortDirection,
            includeLines: request.IncludeLines,
            includeCompany: request.IncludeCompany);

        var totalCount = await _unitOfWork.InvoiceRepository.GetCountAsync(
            searchTerm: request.SearchTerm,
            companyId: request.CompanyId,
            status: request.Status,
            fromDate: request.FromDate,
            toDate: request.ToDate);

        var invoiceDtos = _mapper.Map<List<InvoiceDto>>(invoices);

        return new PagedResult<InvoiceDto>
        {
            Items = invoiceDtos,
            TotalCount = totalCount,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
    }

    public async Task<InvoiceDto?> Handle(GetInvoiceByIdQuery request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Getting invoice by ID: {InvoiceId}", request.InvoiceId);

        var cacheKey = $"invoice_{request.InvoiceId}_{request.IncludeLines}_{request.IncludeCompany}";
        
        return await _cachingService.GetOrSetAsync(cacheKey, async () =>
        {
            var invoice = await _unitOfWork.InvoiceRepository.GetByIdWithDetailsAsync(
                request.InvoiceId,
                request.IncludeLines,
                request.IncludeCompany,
                request.IncludeBankAccount,
                request.IncludeTkaWorkers);

            return invoice != null ? _mapper.Map<InvoiceDto>(invoice) : null;
        }, TimeSpan.FromMinutes(10));
    }

    public async Task<InvoiceDto?> Handle(GetInvoiceByNumberQuery request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Getting invoice by number: {InvoiceNumber}", request.InvoiceNumber);

        var invoice = await _unitOfWork.InvoiceRepository.GetByNumberWithDetailsAsync(
            request.InvoiceNumber,
            request.IncludeLines,
            request.IncludeCompany);

        return invoice != null ? _mapper.Map<InvoiceDto>(invoice) : null;
    }

    public async Task<InvoiceStatsDto> Handle(GetInvoiceStatsQuery request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Getting invoice statistics");

        var cacheKey = $"invoice_stats_{request.FromDate}_{request.ToDate}_{request.CompanyId}";
        
        return await _cachingService.GetOrSetAsync(cacheKey, async () =>
        {
            var stats = await _unitOfWork.InvoiceRepository.GetStatsAsync(
                request.FromDate,
                request.ToDate,
                request.CompanyId);

            return _mapper.Map<InvoiceStatsDto>(stats);
        }, TimeSpan.FromMinutes(30));
    }

    public async Task<List<SearchResultDto>> Handle(SearchInvoicesQuery request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Searching invoices with term: {SearchTerm}", request.SearchTerm);

        if (string.IsNullOrWhiteSpace(request.SearchTerm) || request.SearchTerm.Length < 2)
        {
            return new List<SearchResultDto>();
        }

        // Get all invoices for search (consider caching this)
        var allInvoices = await _unitOfWork.InvoiceRepository.GetAllForSearchAsync();
        
        // Perform smart search
        var searchResults = await _searchService.SearchInvoicesAsync(allInvoices, request.SearchTerm, request.Scope);
        
        return searchResults.Take(request.MaxResults).ToList();
    }

    public async Task<List<InvoiceDto>> Handle(GetRecentInvoicesQuery request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Getting recent invoices. Count: {Count}", request.Count);

        var cacheKey = $"recent_invoices_{request.Count}_{request.UserId}_{request.OnlyMyInvoices}";
        
        return await _cachingService.GetOrSetAsync(cacheKey, async () =>
        {
            var invoices = await _unitOfWork.InvoiceRepository.GetRecentAsync(
                request.Count,
                request.UserId,
                request.OnlyMyInvoices);

            return _mapper.Map<List<InvoiceDto>>(invoices);
        }, TimeSpan.FromMinutes(5));
    }

    public async Task<PagedResult<InvoiceDto>> Handle(GetInvoicesByCompanyQuery request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Getting invoices for company: {CompanyId}", request.CompanyId);

        var invoices = await _unitOfWork.InvoiceRepository.GetByCompanyPagedAsync(
            request.CompanyId,
            request.PageNumber,
            request.PageSize,
            request.FromDate,
            request.ToDate,
            request.Status,
            request.SortBy,
            request.SortDirection);

        var totalCount = await _unitOfWork.InvoiceRepository.GetCountByCompanyAsync(
            request.CompanyId,
            request.FromDate,
            request.ToDate,
            request.Status);

        var invoiceDtos = _mapper.Map<List<InvoiceDto>>(invoices);

        return new PagedResult<InvoiceDto>
        {
            Items = invoiceDtos,
            TotalCount = totalCount,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
    }

    public async Task<List<DuplicateInvoiceDto>> Handle(GetDuplicateInvoicesQuery request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Checking for duplicate invoices");

        var duplicates = await _unitOfWork.InvoiceRepository.FindDuplicatesAsync(
            request.InvoiceNumber,
            request.CompanyId,
            request.InvoiceDate,
            request.ExactMatch);

        var duplicateDtos = new List<DuplicateInvoiceDto>();

        foreach (var duplicate in duplicates)
        {
            var reason = DetermineDuplicateReason(duplicate, request);
            var similarityScore = CalculateSimilarityScore(duplicate, request);
            
            duplicateDtos.Add(new DuplicateInvoiceDto
            {
                Invoice = _mapper.Map<InvoiceDto>(duplicate),
                Reason = reason,
                SimilarityScore = similarityScore,
                MatchingFields = GetMatchingFields(duplicate, request)
            });
        }

        return duplicateDtos.OrderByDescending(d => d.SimilarityScore).ToList();
    }

    public async Task<string> Handle(GetInvoiceNextNumberQuery request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Generating next invoice number for company: {CompanyId}", request.CompanyId);

        return await _invoiceNumberService.GenerateNextNumberAsync(
            request.CompanyId,
            request.InvoiceDate ?? DateTime.Today,
            request.NumberFormat);
    }

    public async Task<List<InvoiceHistoryDto>> Handle(GetInvoiceHistoryQuery request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Getting invoice history for: {InvoiceId}", request.InvoiceId);

        var history = await _unitOfWork.InvoiceRepository.GetHistoryAsync(
            request.InvoiceId,
            request.IncludeUserDetails);

        return _mapper.Map<List<InvoiceHistoryDto>>(history);
    }

    private DuplicateReason DetermineDuplicateReason(object duplicate, GetDuplicateInvoicesQuery request)
    {
        // Implementation to determine why this is considered a duplicate
        // This would analyze the duplicate against the request criteria
        
        if (!string.IsNullOrEmpty(request.InvoiceNumber))
        {
            return DuplicateReason.SameInvoiceNumber;
        }
        
        if (request.CompanyId.HasValue && request.InvoiceDate.HasValue)
        {
            return DuplicateReason.SameCompanyAndDate;
        }
        
        return DuplicateReason.SimilarContent;
    }

    private double CalculateSimilarityScore(object duplicate, GetDuplicateInvoicesQuery request)
    {
        // Implementation to calculate how similar this duplicate is
        // Higher score means more similar
        double score = 0.0;
        
        // Add scoring logic based on matching fields
        // This is a simplified version
        
        return score;
    }

    private List<string> GetMatchingFields(object duplicate, GetDuplicateInvoicesQuery request)
    {
        var matchingFields = new List<string>();
        
        // Implementation to identify which fields match
        if (!string.IsNullOrEmpty(request.InvoiceNumber))
        {
            matchingFields.Add("InvoiceNumber");
        }
        
        if (request.CompanyId.HasValue)
        {
            matchingFields.Add("CompanyId");
        }
        
        if (request.InvoiceDate.HasValue)
        {
            matchingFields.Add("InvoiceDate");
        }
        
        return matchingFields;
    }
}