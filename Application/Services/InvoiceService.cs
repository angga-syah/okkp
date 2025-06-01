// E:\kp\4 invoice\Application\Services\InvoiceService.cs
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

public class InvoiceService : IInvoiceService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<InvoiceService> _logger;
    private readonly IValidator<InvoiceDto> _validator;
    private readonly IMemoryCache _cache;
    private readonly IInvoiceNumberService _invoiceNumberService;

    public InvoiceService(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        ILogger<InvoiceService> logger,
        IValidator<InvoiceDto> validator,
        IMemoryCache cache,
        IInvoiceNumberService invoiceNumberService)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _logger = logger;
        _validator = validator;
        _cache = cache;
        _invoiceNumberService = invoiceNumberService;
    }

    public async Task<PagedResult<InvoiceDto>> GetInvoicesAsync(
        int pageNumber = 1,
        int pageSize = 20,
        string? searchTerm = null,
        int? companyId = null,
        InvoiceStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? sortBy = "InvoiceDate",
        string? sortDirection = "DESC")
    {
        _logger.LogInformation("Getting invoices with filters");

        var invoices = await _unitOfWork.InvoiceRepository.GetPagedAsync(
            pageNumber, pageSize, searchTerm, companyId, status, 
            fromDate, toDate, sortBy, sortDirection, true, true);

        var totalCount = await _unitOfWork.InvoiceRepository.GetCountAsync(
            searchTerm, companyId, status, fromDate, toDate);

        return new PagedResult<InvoiceDto>
        {
            Items = InvoiceMapper.ToDtoList(invoices),
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
    }

    public async Task<InvoiceDto?> GetInvoiceByIdAsync(int id)
    {
        _logger.LogInformation("Getting invoice by ID: {InvoiceId}", id);

        var cacheKey = $"invoice_{id}";
        if (_cache.TryGetValue(cacheKey, out InvoiceDto? cachedInvoice))
        {
            return cachedInvoice;
        }

        var invoice = await _unitOfWork.InvoiceRepository.GetByIdWithDetailsAsync(id, true, true, true, true);
        if (invoice == null) return null;

        var invoiceDto = InvoiceMapper.ToDto(invoice);
        _cache.Set(cacheKey, invoiceDto, TimeSpan.FromMinutes(10));

        return invoiceDto;
    }

    public async Task<InvoiceDto?> GetInvoiceByNumberAsync(string invoiceNumber)
    {
        _logger.LogInformation("Getting invoice by number: {InvoiceNumber}", invoiceNumber);

        var invoice = await _unitOfWork.InvoiceRepository.GetByNumberWithDetailsAsync(invoiceNumber, true, true);
        return invoice != null ? InvoiceMapper.ToDto(invoice) : null;
    }

    public async Task<int> CreateInvoiceAsync(InvoiceDto invoiceDto, int createdBy)
    {
        _logger.LogInformation("Creating new invoice for company {CompanyId}", invoiceDto.CompanyId);

        // Validate
        var validationResult = await _validator.ValidateAsync(invoiceDto);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        // Generate invoice number if not provided
        if (string.IsNullOrWhiteSpace(invoiceDto.InvoiceNumber))
        {
            invoiceDto.InvoiceNumber = await _invoiceNumberService.GenerateNextNumberAsync(
                invoiceDto.CompanyId, invoiceDto.InvoiceDate);
        }

        // Check for duplicate
        var existingInvoice = await _unitOfWork.InvoiceRepository.GetByNumberAsync(invoiceDto.InvoiceNumber);
        if (existingInvoice != null)
        {
            throw new InvalidOperationException($"Invoice number {invoiceDto.InvoiceNumber} already exists");
        }

        // Create entity
        var invoice = new Invoice
        {
            InvoiceNumber = invoiceDto.InvoiceNumber,
            CompanyId = invoiceDto.CompanyId,
            InvoiceDate = invoiceDto.InvoiceDate,
            DueDate = invoiceDto.DueDate,
            Notes = invoiceDto.Notes,
            VatPercentage = invoiceDto.VatPercentage,
            BankAccountId = invoiceDto.BankAccountId,
            CreatedBy = createdBy,
            Status = Enum.Parse<InvoiceStatus>(invoiceDto.StatusText, true),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Add lines
        foreach (var lineDto in invoiceDto.InvoiceLines.OrderBy(l => l.Baris).ThenBy(l => l.LineOrder))
        {
            var line = new InvoiceLine
            {
                Baris = lineDto.Baris,
                LineOrder = lineDto.LineOrder,
                TkaId = lineDto.TkaId,
                JobDescriptionId = lineDto.JobDescriptionId,
                CustomJobName = lineDto.CustomJobName,
                CustomJobDescription = lineDto.CustomJobDescription,
                CustomPrice = lineDto.CustomPrice,
                Quantity = lineDto.Quantity,
                UnitPrice = lineDto.UnitPrice,
                LineTotal = lineDto.LineTotal,
                CreatedAt = DateTime.UtcNow
            };
            invoice.InvoiceLines.Add(line);
        }

        // Calculate totals
        CalculateInvoiceTotals(invoice);

        // Save
        await _unitOfWork.InvoiceRepository.AddAsync(invoice);
        await _unitOfWork.SaveChangesAsync();

        // Clear cache
        _cache.Remove($"invoice_{invoice.Id}");

        _logger.LogInformation("Invoice created with ID: {InvoiceId}", invoice.Id);
        return invoice.Id;
    }

    public async Task<bool> UpdateInvoiceAsync(InvoiceDto invoiceDto, int updatedBy)
    {
        _logger.LogInformation("Updating invoice {InvoiceId}", invoiceDto.Id);

        var invoice = await _unitOfWork.InvoiceRepository.GetByIdWithLinesAsync(invoiceDto.Id);
        if (invoice == null)
        {
            throw new InvalidOperationException($"Invoice with ID {invoiceDto.Id} not found");
        }

        if (invoice.Status == InvoiceStatus.Finalized)
        {
            throw new InvalidOperationException("Cannot edit finalized invoice");
        }

        // Update properties
        invoice.InvoiceNumber = invoiceDto.InvoiceNumber;
        invoice.CompanyId = invoiceDto.CompanyId;
        invoice.InvoiceDate = invoiceDto.InvoiceDate;
        invoice.DueDate = invoiceDto.DueDate;
        invoice.Notes = invoiceDto.Notes;
        invoice.VatPercentage = invoiceDto.VatPercentage;
        invoice.BankAccountId = invoiceDto.BankAccountId;
        invoice.Status = Enum.Parse<InvoiceStatus>(invoiceDto.StatusText, true);
        invoice.UpdatedAt = DateTime.UtcNow;

        // Update lines - remove existing and add new ones
        invoice.InvoiceLines.Clear();
        foreach (var lineDto in invoiceDto.InvoiceLines.OrderBy(l => l.Baris).ThenBy(l => l.LineOrder))
        {
            var line = new InvoiceLine
            {
                Baris = lineDto.Baris,
                LineOrder = lineDto.LineOrder,
                TkaId = lineDto.TkaId,
                JobDescriptionId = lineDto.JobDescriptionId,
                CustomJobName = lineDto.CustomJobName,
                CustomJobDescription = lineDto.CustomJobDescription,
                CustomPrice = lineDto.CustomPrice,
                Quantity = lineDto.Quantity,
                UnitPrice = lineDto.UnitPrice,
                LineTotal = lineDto.LineTotal,
                CreatedAt = DateTime.UtcNow
            };
            invoice.InvoiceLines.Add(line);
        }

        // Recalculate totals
        CalculateInvoiceTotals(invoice);

        // Save
        _unitOfWork.InvoiceRepository.Update(invoice);
        await _unitOfWork.SaveChangesAsync();

        // Clear cache
        _cache.Remove($"invoice_{invoice.Id}");

        return true;
    }

    public async Task<bool> DeleteInvoiceAsync(int id, int deletedBy, bool hardDelete = false)
    {
        _logger.LogInformation("Deleting invoice {InvoiceId} (hard: {HardDelete})", id, hardDelete);

        var invoice = await _unitOfWork.InvoiceRepository.GetByIdAsync(id);
        if (invoice == null)
        {
            throw new InvalidOperationException($"Invoice with ID {id} not found");
        }

        if (hardDelete)
        {
            await _unitOfWork.InvoiceRepository.DeleteAsync(invoice);
        }
        else
        {
            invoice.Status = InvoiceStatus.Cancelled;
            invoice.UpdatedAt = DateTime.UtcNow;
            _unitOfWork.InvoiceRepository.Update(invoice);
        }

        await _unitOfWork.SaveChangesAsync();

        // Clear cache
        _cache.Remove($"invoice_{id}");

        return true;
    }

    public async Task<bool> FinalizeInvoiceAsync(int id, int updatedBy)
    {
        _logger.LogInformation("Finalizing invoice {InvoiceId}", id);

        var invoice = await _unitOfWork.InvoiceRepository.GetByIdWithLinesAsync(id);
        if (invoice == null)
        {
            throw new InvalidOperationException($"Invoice with ID {id} not found");
        }

        if (invoice.Status == InvoiceStatus.Finalized)
        {
            throw new InvalidOperationException("Invoice is already finalized");
        }

        // Validate before finalizing
        await ValidateInvoiceForFinalization(invoice);

        invoice.Status = InvoiceStatus.Finalized;
        invoice.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.InvoiceRepository.Update(invoice);
        await _unitOfWork.SaveChangesAsync();

        // Clear cache
        _cache.Remove($"invoice_{id}");

        return true;
    }

    public async Task<InvoiceTotalsDto> RecalculateInvoiceTotalsAsync(int id, decimal? newVatPercentage = null)
    {
        var invoice = await _unitOfWork.InvoiceRepository.GetByIdWithLinesAsync(id);
        if (invoice == null)
        {
            throw new InvalidOperationException($"Invoice with ID {id} not found");
        }

        if (newVatPercentage.HasValue)
        {
            invoice.VatPercentage = newVatPercentage.Value;
        }

        CalculateInvoiceTotals(invoice);

        return new InvoiceTotalsDto
        {
            Subtotal = invoice.Subtotal,
            VatAmount = invoice.VatAmount,
            TotalAmount = invoice.TotalAmount,
            VatPercentage = invoice.VatPercentage,
            AmountInWords = ConvertAmountToWords(invoice.TotalAmount)
        };
    }

    public async Task<List<InvoiceDto>> GetRecentInvoicesAsync(int count = 10, int? userId = null)
    {
        _logger.LogInformation("Getting recent invoices");

        var cacheKey = $"recent_invoices_{count}_{userId}";
        if (_cache.TryGetValue(cacheKey, out List<InvoiceDto>? cachedInvoices))
        {
            return cachedInvoices!;
        }

        var invoices = await _unitOfWork.InvoiceRepository.GetRecentAsync(count, userId, false);
        var invoiceDtos = InvoiceMapper.ToDtoList(invoices);

        _cache.Set(cacheKey, invoiceDtos, TimeSpan.FromMinutes(5));
        return invoiceDtos;
    }

    public async Task<InvoiceStatsDto> GetInvoiceStatsAsync(DateTime? fromDate = null, DateTime? toDate = null, int? companyId = null)
    {
        _logger.LogInformation("Getting invoice statistics");

        var cacheKey = $"invoice_stats_{fromDate}_{toDate}_{companyId}";
        if (_cache.TryGetValue(cacheKey, out InvoiceStatsDto? cachedStats))
        {
            return cachedStats!;
        }

        var stats = await _unitOfWork.InvoiceRepository.GetStatsAsync(fromDate, toDate, companyId);
        _cache.Set(cacheKey, stats, TimeSpan.FromMinutes(15));

        return stats;
    }

    public async Task<string> GenerateNextInvoiceNumberAsync(int? companyId = null, DateTime? invoiceDate = null)
    {
        return await _invoiceNumberService.GenerateNextNumberAsync(companyId, invoiceDate ?? DateTime.Today);
    }

    private void CalculateInvoiceTotals(Invoice invoice)
    {
        invoice.Subtotal = invoice.InvoiceLines.Sum(l => l.LineTotal);
        invoice.VatAmount = Math.Round(invoice.Subtotal * invoice.VatPercentage / 100, 2);
        
        // Apply Indonesian rounding rules: 18.000,49 → 18.000 | 18.000,50 → 18.001
        var totalBeforeRounding = invoice.Subtotal + invoice.VatAmount;
        invoice.TotalAmount = ApplyIndonesianRounding(totalBeforeRounding);
    }

    private decimal ApplyIndonesianRounding(decimal amount)
    {
        var cents = amount - Math.Floor(amount);
        return cents < 0.50m ? Math.Floor(amount) : Math.Floor(amount) + 1;
    }

    private async Task ValidateInvoiceForFinalization(Invoice invoice)
    {
        var errors = new List<string>();

        if (!invoice.InvoiceLines.Any())
            errors.Add("Invoice must have at least one line item");

        if (invoice.TotalAmount <= 0)
            errors.Add("Invoice total amount must be greater than zero");

        if (string.IsNullOrWhiteSpace(invoice.InvoiceNumber))
            errors.Add("Invoice number is required");

        var company = await _unitOfWork.CompanyRepository.GetByIdAsync(invoice.CompanyId);
        if (company == null || !company.IsActive)
            errors.Add("Company is not found or inactive");

        foreach (var line in invoice.InvoiceLines)
        {
            var tka = await _unitOfWork.TkaWorkerRepository.GetByIdAsync(line.TkaId);
            if (tka == null || !tka.IsActive)
                errors.Add($"TKA worker ID {line.TkaId} is not found or inactive");
        }

        if (errors.Any())
            throw new ValidationException(string.Join("; ", errors));
    }

    private string ConvertAmountToWords(decimal amount)
    {
        // Simplified implementation - in real app, this would be comprehensive Indonesian number-to-words
        return $"{amount:N0} Rupiah";
    }
}