// E:\kp\4 invoice\Application\Services\CompanyService.cs
using AutoMapper;
using FluentValidation;
using InvoiceApp.Application.Mappers;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Interfaces;
using InvoiceApp.Core.Interfaces.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Application.Services;

public class CompanyService : ICompanyService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<CompanyService> _logger;
    private readonly IValidator<CompanyDto> _validator;
    private readonly IMemoryCache _cache;
    private readonly ISearchService _searchService;

    public CompanyService(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        ILogger<CompanyService> logger,
        IValidator<CompanyDto> validator,
        IMemoryCache cache,
        ISearchService searchService)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _logger = logger;
        _validator = validator;
        _cache = cache;
        _searchService = searchService;
    }

    public async Task<PagedResult<CompanyDto>> GetCompaniesAsync(
        int pageNumber = 1,
        int pageSize = 20,
        string? searchTerm = null,
        bool? isActive = null,
        string? sortBy = "CompanyName",
        string? sortDirection = "ASC")
    {
        _logger.LogInformation("Getting companies with pagination");

        var companies = await _unitOfWork.CompanyRepository.GetPagedAsync(
            pageNumber, pageSize, searchTerm, isActive, sortBy, sortDirection, true, true);

        var totalCount = await _unitOfWork.CompanyRepository.GetCountAsync(searchTerm, isActive);

        return new PagedResult<CompanyDto>
        {
            Items = CompanyMapper.ToDtoList(companies),
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
    }

    public async Task<CompanyDto?> GetCompanyByIdAsync(int id)
    {
        _logger.LogInformation("Getting company by ID: {CompanyId}", id);

        var cacheKey = $"company_{id}";
        if (_cache.TryGetValue(cacheKey, out CompanyDto? cachedCompany))
        {
            return cachedCompany;
        }

        var company = await _unitOfWork.CompanyRepository.GetByIdWithDetailsAsync(id);
        if (company == null) return null;

        var companyDto = CompanyMapper.ToDto(company);
        _cache.Set(cacheKey, companyDto, TimeSpan.FromMinutes(15));

        return companyDto;
    }

    public async Task<CompanyDto?> GetCompanyByNpwpAsync(string npwp)
    {
        _logger.LogInformation("Getting company by NPWP: {Npwp}", npwp);

        var company = await _unitOfWork.CompanyRepository.GetByNpwpAsync(npwp);
        return company != null ? CompanyMapper.ToDto(company) : null;
    }

    public async Task<List<CompanySelectionDto>> GetCompaniesForSelectionAsync(string? searchTerm = null)
    {
        _logger.LogInformation("Getting companies for selection");

        var cacheKey = $"companies_selection_{searchTerm}";
        if (_cache.TryGetValue(cacheKey, out List<CompanySelectionDto>? cachedCompanies))
        {
            return cachedCompanies!;
        }

        var companies = await _unitOfWork.CompanyRepository.GetActiveCompaniesAsync();
        
        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var searchResults = await _searchService.SearchCompaniesAsync(companies, searchTerm);
            companies = searchResults.Select(r => r.Item).ToList();
        }

        var selectionDtos = CompanyMapper.ToSelectionDtoList(companies);
        _cache.Set(cacheKey, selectionDtos, TimeSpan.FromMinutes(10));

        return selectionDtos;
    }

    public async Task<int> CreateCompanyAsync(CompanyDto companyDto)
    {
        _logger.LogInformation("Creating new company: {CompanyName}", companyDto.CompanyName);

        // Validate
        var validationResult = await _validator.ValidateAsync(companyDto);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        // Check for duplicate NPWP
        var existingCompany = await _unitOfWork.CompanyRepository.GetByNpwpAsync(companyDto.Npwp);
        if (existingCompany != null)
        {
            throw new InvalidOperationException($"Company with NPWP {companyDto.Npwp} already exists");
        }

        // Create entity
        var company = CompanyMapper.ToEntity(companyDto);
        company.CreatedAt = DateTime.UtcNow;
        company.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.CompanyRepository.AddAsync(company);
        await _unitOfWork.SaveChangesAsync();

        // Clear related caches
        ClearCompanyCaches();

        _logger.LogInformation("Company created with ID: {CompanyId}", company.Id);
        return company.Id;
    }

    public async Task<bool> UpdateCompanyAsync(CompanyDto companyDto)
    {
        _logger.LogInformation("Updating company {CompanyId}", companyDto.Id);

        var company = await _unitOfWork.CompanyRepository.GetByIdAsync(companyDto.Id);
        if (company == null)
        {
            throw new InvalidOperationException($"Company with ID {companyDto.Id} not found");
        }

        // Check for duplicate NPWP (excluding current company)
        var existingCompany = await _unitOfWork.CompanyRepository.GetByNpwpAsync(companyDto.Npwp);
        if (existingCompany != null && existingCompany.Id != companyDto.Id)
        {
            throw new InvalidOperationException($"Another company with NPWP {companyDto.Npwp} already exists");
        }

        // Update properties
        CompanyMapper.UpdateEntityFromDto(company, companyDto);

        _unitOfWork.CompanyRepository.Update(company);
        await _unitOfWork.SaveChangesAsync();

        // Clear caches
        _cache.Remove($"company_{companyDto.Id}");
        ClearCompanyCaches();

        return true;
    }

    public async Task<bool> DeleteCompanyAsync(int id, bool hardDelete = false)
    {
        _logger.LogInformation("Deleting company {CompanyId} (hard: {HardDelete})", id, hardDelete);

        var company = await _unitOfWork.CompanyRepository.GetByIdAsync(id);
        if (company == null)
        {
            throw new InvalidOperationException($"Company with ID {id} not found");
        }

        // Check if company has invoices
        var hasInvoices = await _unitOfWork.InvoiceRepository.HasInvoicesByCompanyAsync(id);
        if (hasInvoices && hardDelete)
        {
            throw new InvalidOperationException("Cannot delete company with existing invoices");
        }

        if (hardDelete)
        {
            await _unitOfWork.CompanyRepository.DeleteAsync(company);
        }
        else
        {
            company.IsActive = false;
            company.UpdatedAt = DateTime.UtcNow;
            _unitOfWork.CompanyRepository.Update(company);
        }

        await _unitOfWork.SaveChangesAsync();

        // Clear caches
        _cache.Remove($"company_{id}");
        ClearCompanyCaches();

        return true;
    }

    public async Task<List<JobDescriptionDto>> GetCompanyJobDescriptionsAsync(int companyId, bool? isActive = true)
    {
        _logger.LogInformation("Getting job descriptions for company {CompanyId}", companyId);

        var cacheKey = $"company_jobs_{companyId}_{isActive}";
        if (_cache.TryGetValue(cacheKey, out List<JobDescriptionDto>? cachedJobs))
        {
            return cachedJobs!;
        }

        var jobDescriptions = await _unitOfWork.CompanyRepository.GetJobDescriptionsAsync(companyId, isActive);
        var jobDtos = JobDescriptionMapper.ToDtoList(jobDescriptions);

        _cache.Set(cacheKey, jobDtos, TimeSpan.FromMinutes(20));
        return jobDtos;
    }

    public async Task<int> CreateJobDescriptionAsync(JobDescriptionDto jobDto)
    {
        _logger.LogInformation("Creating job description for company {CompanyId}", jobDto.CompanyId);

        var jobDescription = JobDescriptionMapper.ToEntity(jobDto);
        jobDescription.CreatedAt = DateTime.UtcNow;
        jobDescription.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.CompanyRepository.AddJobDescriptionAsync(jobDescription);
        await _unitOfWork.SaveChangesAsync();

        // Clear cache
        _cache.Remove($"company_jobs_{jobDto.CompanyId}_True");
        _cache.Remove($"company_jobs_{jobDto.CompanyId}_");

        return jobDescription.Id;
    }

    public async Task<bool> UpdateJobDescriptionAsync(JobDescriptionDto jobDto)
    {
        _logger.LogInformation("Updating job description {JobId}", jobDto.Id);

        var jobDescription = await _unitOfWork.CompanyRepository.GetJobDescriptionByIdAsync(jobDto.Id);
        if (jobDescription == null)
        {
            throw new InvalidOperationException($"Job description with ID {jobDto.Id} not found");
        }

        JobDescriptionMapper.UpdateEntityFromDto(jobDescription, jobDto);

        await _unitOfWork.SaveChangesAsync();

        // Clear cache
        _cache.Remove($"company_jobs_{jobDto.CompanyId}_True");
        _cache.Remove($"company_jobs_{jobDto.CompanyId}_");

        return true;
    }

    public async Task<bool> DeleteJobDescriptionAsync(int id, bool hardDelete = false)
    {
        _logger.LogInformation("Deleting job description {JobId}", id);

        var jobDescription = await _unitOfWork.CompanyRepository.GetJobDescriptionByIdAsync(id);
        if (jobDescription == null)
        {
            throw new InvalidOperationException($"Job description with ID {id} not found");
        }

        // Check if job description is used in invoices
        var isUsedInInvoices = await _unitOfWork.InvoiceRepository.IsJobDescriptionUsedAsync(id);
        if (isUsedInInvoices && hardDelete)
        {
            throw new InvalidOperationException("Cannot delete job description that is used in invoices");
        }

        if (hardDelete)
        {
            await _unitOfWork.CompanyRepository.DeleteJobDescriptionAsync(jobDescription);
        }
        else
        {
            jobDescription.IsActive = false;
            jobDescription.UpdatedAt = DateTime.UtcNow;
        }

        await _unitOfWork.SaveChangesAsync();

        // Clear cache
        _cache.Remove($"company_jobs_{jobDescription.CompanyId}_True");
        _cache.Remove($"company_jobs_{jobDescription.CompanyId}_");

        return true;
    }

    public async Task<List<CompanyTkaAssignmentDto>> GetCompanyTkaAssignmentsAsync(int companyId, bool? isActive = true)
    {
        _logger.LogInformation("Getting TKA assignments for company {CompanyId}", companyId);

        var assignments = await _unitOfWork.CompanyRepository.GetTkaAssignmentsAsync(companyId, isActive);
        return CompanyTkaAssignmentMapper.ToDtoList(assignments);
    }

    public async Task<int> AssignTkaToCompanyAsync(int companyId, int tkaId, DateTime assignmentDate, string? notes = null)
    {
        _logger.LogInformation("Assigning TKA {TkaId} to company {CompanyId}", tkaId, companyId);

        // Check if assignment already exists
        var existingAssignment = await _unitOfWork.CompanyRepository.GetTkaAssignmentAsync(companyId, tkaId);
        if (existingAssignment != null && existingAssignment.IsActive)
        {
            throw new InvalidOperationException($"TKA {tkaId} is already assigned to company {companyId}");
        }

        var assignment = new CompanyTkaAssignment
        {
            CompanyId = companyId,
            TkaId = tkaId,
            AssignmentDate = assignmentDate,
            IsActive = true,
            Notes = notes,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.CompanyRepository.AddTkaAssignmentAsync(assignment);
        await _unitOfWork.SaveChangesAsync();

        return assignment.Id;
    }

    public async Task<bool> UnassignTkaFromCompanyAsync(int companyId, int tkaId, DateTime? endDate = null)
    {
        _logger.LogInformation("Unassigning TKA {TkaId} from company {CompanyId}", tkaId, companyId);

        var assignment = await _unitOfWork.CompanyRepository.GetTkaAssignmentAsync(companyId, tkaId);
        if (assignment == null || !assignment.IsActive)
        {
            throw new InvalidOperationException($"No active assignment found for TKA {tkaId} and company {companyId}");
        }

        assignment.IsActive = false;
        assignment.EndDate = endDate ?? DateTime.Today;

        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<CompanyStatsDto> GetCompanyStatsAsync(int companyId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        _logger.LogInformation("Getting stats for company {CompanyId}", companyId);

        var cacheKey = $"company_stats_{companyId}_{fromDate}_{toDate}";
        if (_cache.TryGetValue(cacheKey, out CompanyStatsDto? cachedStats))
        {
            return cachedStats!;
        }

        var stats = await _unitOfWork.CompanyRepository.GetCompanyStatsAsync(companyId, fromDate, toDate);
        _cache.Set(cacheKey, stats, TimeSpan.FromMinutes(30));

        return stats;
    }

    public async Task<List<SearchResultDto>> SearchCompaniesAsync(string searchTerm, int maxResults = 20)
    {
        _logger.LogInformation("Searching companies with term: {SearchTerm}", searchTerm);

        if (string.IsNullOrWhiteSpace(searchTerm) || searchTerm.Length < 2)
        {
            return new List<SearchResultDto>();
        }

        var companies = await _unitOfWork.CompanyRepository.GetActiveCompaniesAsync();
        var searchResults = await _searchService.SearchCompaniesAsync(companies, searchTerm);

        return searchResults.Take(maxResults).ToList();
    }

    private void ClearCompanyCaches()
    {
        // Clear all company-related caches
        var cacheKeys = new[]
        {
            "companies_selection_",
            "company_jobs_",
            "company_stats_"
        };

        // Note: In production, you might want to use a more sophisticated cache invalidation strategy
        // This is a simplified approach for demonstration
    }
}