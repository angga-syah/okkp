// E:\kp\4 invoice\Application\Services\TkaWorkerService.cs
using AutoMapper;
using FluentValidation;
using InvoiceApp.Application.Mappers;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Enums;
using InvoiceApp.Core.Interfaces;
using InvoiceApp.Core.Interfaces.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Application.Services;

public class TkaWorkerService : ITkaWorkerService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<TkaWorkerService> _logger;
    private readonly IValidator<TkaWorkerDto> _validator;
    private readonly IMemoryCache _cache;
    private readonly ISearchService _searchService;

    public TkaWorkerService(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        ILogger<TkaWorkerService> logger,
        IValidator<TkaWorkerDto> validator,
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

    public async Task<PagedResult<TkaWorkerDto>> GetTkaWorkersAsync(
        int pageNumber = 1,
        int pageSize = 20,
        string? searchTerm = null,
        bool? isActive = null,
        Gender? jenisKelamin = null,
        string? divisi = null,
        string? sortBy = "Nama",
        string? sortDirection = "ASC")
    {
        _logger.LogInformation("Getting TKA workers with pagination");

        var tkaWorkers = await _unitOfWork.TkaWorkerRepository.GetPagedAsync(
            pageNumber, pageSize, searchTerm, isActive, jenisKelamin, divisi, 
            sortBy, sortDirection, true, true);

        var totalCount = await _unitOfWork.TkaWorkerRepository.GetCountAsync(
            searchTerm, isActive, jenisKelamin, divisi);

        return new PagedResult<TkaWorkerDto>
        {
            Items = TkaWorkerMapper.ToDtoList(tkaWorkers),
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
    }

    public async Task<TkaWorkerDto?> GetTkaWorkerByIdAsync(int id)
    {
        _logger.LogInformation("Getting TKA worker by ID: {TkaId}", id);

        var cacheKey = $"tka_{id}";
        if (_cache.TryGetValue(cacheKey, out TkaWorkerDto? cachedTka))
        {
            return cachedTka;
        }

        var tkaWorker = await _unitOfWork.TkaWorkerRepository.GetByIdWithDetailsAsync(id);
        if (tkaWorker == null) return null;

        var tkaDto = TkaWorkerMapper.ToDto(tkaWorker);
        _cache.Set(cacheKey, tkaDto, TimeSpan.FromMinutes(15));

        return tkaDto;
    }

    public async Task<TkaWorkerDto?> GetTkaWorkerByPassportAsync(string passport)
    {
        _logger.LogInformation("Getting TKA worker by passport: {Passport}", passport);

        var tkaWorker = await _unitOfWork.TkaWorkerRepository.GetByPassportAsync(passport);
        return tkaWorker != null ? TkaWorkerMapper.ToDto(tkaWorker) : null;
    }

    public async Task<List<TkaSelectionItem>> GetTkaWorkersByCompanyAsync(int companyId, string? searchTerm = null, bool includeFamilyMembers = true)
    {
        _logger.LogInformation("Getting TKA workers for company {CompanyId}", companyId);

        var cacheKey = $"tka_company_{companyId}_{searchTerm}_{includeFamilyMembers}";
        if (_cache.TryGetValue(cacheKey, out List<TkaSelectionItem>? cachedTkas))
        {
            return cachedTkas!;
        }

        var tkaWorkers = await _unitOfWork.TkaWorkerRepository.GetByCompanyAsync(companyId, true);
        
        // Apply search if provided
        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var searchResults = await _searchService.SearchTkaWorkersAsync(tkaWorkers, searchTerm);
            tkaWorkers = searchResults.Select(r => r.Item).ToList();
        }

        var selectionItems = TkaWorkerMapper.ToSelectionItemList(tkaWorkers, includeFamilyMembers);
        _cache.Set(cacheKey, selectionItems, TimeSpan.FromMinutes(10));

        return selectionItems;
    }

    public async Task<int> CreateTkaWorkerAsync(TkaWorkerDto tkaWorkerDto)
    {
        _logger.LogInformation("Creating new TKA worker: {TkaName}", tkaWorkerDto.Nama);

        // Validate
        var validationResult = await _validator.ValidateAsync(tkaWorkerDto);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        // Check for duplicate passport
        var existingTka = await _unitOfWork.TkaWorkerRepository.GetByPassportAsync(tkaWorkerDto.Passport);
        if (existingTka != null)
        {
            throw new InvalidOperationException($"TKA worker with passport {tkaWorkerDto.Passport} already exists");
        }

        // Create entity
        var tkaWorker = TkaWorkerMapper.ToEntity(tkaWorkerDto);
        tkaWorker.CreatedAt = DateTime.UtcNow;
        tkaWorker.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.TkaWorkerRepository.AddAsync(tkaWorker);
        await _unitOfWork.SaveChangesAsync();

        // Clear related caches
        ClearTkaCaches();

        _logger.LogInformation("TKA worker created with ID: {TkaId}", tkaWorker.Id);
        return tkaWorker.Id;
    }

    public async Task<bool> UpdateTkaWorkerAsync(TkaWorkerDto tkaWorkerDto)
    {
        _logger.LogInformation("Updating TKA worker {TkaId}", tkaWorkerDto.Id);

        var tkaWorker = await _unitOfWork.TkaWorkerRepository.GetByIdAsync(tkaWorkerDto.Id);
        if (tkaWorker == null)
        {
            throw new InvalidOperationException($"TKA worker with ID {tkaWorkerDto.Id} not found");
        }

        // Check for duplicate passport (excluding current TKA)
        var existingTka = await _unitOfWork.TkaWorkerRepository.GetByPassportAsync(tkaWorkerDto.Passport);
        if (existingTka != null && existingTka.Id != tkaWorkerDto.Id)
        {
            throw new InvalidOperationException($"Another TKA worker with passport {tkaWorkerDto.Passport} already exists");
        }

        // Update properties
        TkaWorkerMapper.UpdateEntityFromDto(tkaWorker, tkaWorkerDto);

        _unitOfWork.TkaWorkerRepository.Update(tkaWorker);
        await _unitOfWork.SaveChangesAsync();

        // Clear caches
        _cache.Remove($"tka_{tkaWorkerDto.Id}");
        ClearTkaCaches();

        return true;
    }

    public async Task<bool> DeleteTkaWorkerAsync(int id, bool hardDelete = false)
    {
        _logger.LogInformation("Deleting TKA worker {TkaId} (hard: {HardDelete})", id, hardDelete);

        var tkaWorker = await _unitOfWork.TkaWorkerRepository.GetByIdAsync(id);
        if (tkaWorker == null)
        {
            throw new InvalidOperationException($"TKA worker with ID {id} not found");
        }

        // Check if TKA has invoice lines
        var hasInvoiceLines = await _unitOfWork.InvoiceRepository.HasInvoiceLinesByTkaAsync(id);
        if (hasInvoiceLines && hardDelete)
        {
            throw new InvalidOperationException("Cannot delete TKA worker with existing invoice lines");
        }

        if (hardDelete)
        {
            await _unitOfWork.TkaWorkerRepository.DeleteAsync(tkaWorker);
        }
        else
        {
            tkaWorker.IsActive = false;
            tkaWorker.UpdatedAt = DateTime.UtcNow;
            _unitOfWork.TkaWorkerRepository.Update(tkaWorker);
        }

        await _unitOfWork.SaveChangesAsync();

        // Clear caches
        _cache.Remove($"tka_{id}");
        ClearTkaCaches();

        return true;
    }

    public async Task<List<TkaFamilyMemberDto>> GetTkaFamilyMembersAsync(int tkaId, bool? isActive = true)
    {
        _logger.LogInformation("Getting family members for TKA {TkaId}", tkaId);

        var cacheKey = $"tka_family_{tkaId}_{isActive}";
        if (_cache.TryGetValue(cacheKey, out List<TkaFamilyMemberDto>? cachedFamily))
        {
            return cachedFamily!;
        }

        var familyMembers = await _unitOfWork.TkaWorkerRepository.GetFamilyMembersAsync(tkaId, isActive);
        var familyDtos = TkaFamilyMemberMapper.ToDtoList(familyMembers);

        _cache.Set(cacheKey, familyDtos, TimeSpan.FromMinutes(20));
        return familyDtos;
    }

    public async Task<int> CreateFamilyMemberAsync(TkaFamilyMemberDto familyMemberDto)
    {
        _logger.LogInformation("Creating family member for TKA {TkaId}", familyMemberDto.TkaId);

        // Check for duplicate passport
        var existingFamily = await _unitOfWork.TkaWorkerRepository.GetFamilyMemberByPassportAsync(familyMemberDto.Passport);
        if (existingFamily != null)
        {
            throw new InvalidOperationException($"Family member with passport {familyMemberDto.Passport} already exists");
        }

        var familyMember = TkaFamilyMemberMapper.ToEntity(familyMemberDto);
        familyMember.CreatedAt = DateTime.UtcNow;

        await _unitOfWork.TkaWorkerRepository.AddFamilyMemberAsync(familyMember);
        await _unitOfWork.SaveChangesAsync();

        // Clear cache
        _cache.Remove($"tka_family_{familyMemberDto.TkaId}_True");
        _cache.Remove($"tka_family_{familyMemberDto.TkaId}_");
        ClearTkaCaches();

        return familyMember.Id;
    }

    public async Task<bool> UpdateFamilyMemberAsync(TkaFamilyMemberDto familyMemberDto)
    {
        _logger.LogInformation("Updating family member {FamilyId}", familyMemberDto.Id);

        var familyMember = await _unitOfWork.TkaWorkerRepository.GetFamilyMemberByIdAsync(familyMemberDto.Id);
        if (familyMember == null)
        {
            throw new InvalidOperationException($"Family member with ID {familyMemberDto.Id} not found");
        }

        // Check for duplicate passport (excluding current family member)
        var existingFamily = await _unitOfWork.TkaWorkerRepository.GetFamilyMemberByPassportAsync(familyMemberDto.Passport);
        if (existingFamily != null && existingFamily.Id != familyMemberDto.Id)
        {
            throw new InvalidOperationException($"Another family member with passport {familyMemberDto.Passport} already exists");
        }

        TkaFamilyMemberMapper.UpdateEntityFromDto(familyMember, familyMemberDto);

        await _unitOfWork.SaveChangesAsync();

        // Clear cache
        _cache.Remove($"tka_family_{familyMemberDto.TkaId}_True");
        _cache.Remove($"tka_family_{familyMemberDto.TkaId}_");
        ClearTkaCaches();

        return true;
    }

    public async Task<bool> DeleteFamilyMemberAsync(int id, bool hardDelete = false)
    {
        _logger.LogInformation("Deleting family member {FamilyId}", id);

        var familyMember = await _unitOfWork.TkaWorkerRepository.GetFamilyMemberByIdAsync(id);
        if (familyMember == null)
        {
            throw new InvalidOperationException($"Family member with ID {id} not found");
        }

        // Check if family member has invoice lines
        var hasInvoiceLines = await _unitOfWork.InvoiceRepository.HasInvoiceLinesByFamilyMemberAsync(id);
        if (hasInvoiceLines && hardDelete)
        {
            throw new InvalidOperationException("Cannot delete family member with existing invoice lines");
        }

        if (hardDelete)
        {
            await _unitOfWork.TkaWorkerRepository.DeleteFamilyMemberAsync(familyMember);
        }
        else
        {
            familyMember.IsActive = false;
        }

        await _unitOfWork.SaveChangesAsync();

        // Clear cache
        _cache.Remove($"tka_family_{familyMember.TkaId}_True");
        _cache.Remove($"tka_family_{familyMember.TkaId}_");
        ClearTkaCaches();

        return true;
    }

    public async Task<List<string>> GetTkaDivisionsAsync(bool onlyActive = true)
    {
        _logger.LogInformation("Getting TKA divisions");

        var cacheKey = $"tka_divisions_{onlyActive}";
        if (_cache.TryGetValue(cacheKey, out List<string>? cachedDivisions))
        {
            return cachedDivisions!;
        }

        var divisions = await _unitOfWork.TkaWorkerRepository.GetDivisionsAsync(onlyActive);
        _cache.Set(cacheKey, divisions, TimeSpan.FromHours(1));

        return divisions;
    }

    public async Task<TkaStatsDto> GetTkaStatsAsync(int tkaId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        _logger.LogInformation("Getting stats for TKA {TkaId}", tkaId);

        var cacheKey = $"tka_stats_{tkaId}_{fromDate}_{toDate}";
        if (_cache.TryGetValue(cacheKey, out TkaStatsDto? cachedStats))
        {
            return cachedStats!;
        }

        var stats = await _unitOfWork.TkaWorkerRepository.GetTkaStatsAsync(tkaId, fromDate, toDate);
        _cache.Set(cacheKey, stats, TimeSpan.FromMinutes(30));

        return stats;
    }

    public async Task<List<SearchResultDto>> SearchTkaWorkersAsync(string searchTerm, int maxResults = 20, int? companyId = null)
    {
        _logger.LogInformation("Searching TKA workers with term: {SearchTerm}", searchTerm);

        if (string.IsNullOrWhiteSpace(searchTerm) || searchTerm.Length < 2)
        {
            return new List<SearchResultDto>();
        }

        List<TkaWorker> tkaWorkers;
        
        if (companyId.HasValue)
        {
            tkaWorkers = await _unitOfWork.TkaWorkerRepository.GetByCompanyAsync(companyId.Value, true);
        }
        else
        {
            tkaWorkers = await _unitOfWork.TkaWorkerRepository.GetActiveAsync();
        }

        var searchResults = await _searchService.SearchTkaWorkersAsync(tkaWorkers, searchTerm);
        return searchResults.Take(maxResults).ToList();
    }

    public async Task<List<TkaWorkerDto>> GetUnassignedTkaWorkersAsync(string? searchTerm = null)
    {
        _logger.LogInformation("Getting unassigned TKA workers");

        var tkaWorkers = await _unitOfWork.TkaWorkerRepository.GetUnassignedAsync();
        
        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var searchResults = await _searchService.SearchTkaWorkersAsync(tkaWorkers, searchTerm);
            tkaWorkers = searchResults.Select(r => r.Item).ToList();
        }

        return TkaWorkerMapper.ToDtoList(tkaWorkers);
    }

    private void ClearTkaCaches()
    {
        // Clear all TKA-related caches
        // Note: In production, you might want to use a more sophisticated cache invalidation strategy
    }
}