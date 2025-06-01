// E:\kp\4 invoice\Infrastructure\Services\Core\InvoiceNumberService.cs
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Interfaces;
using InvoiceApp.Core.Interfaces.Services;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Infrastructure.Services.Core;

public class InvoiceNumberService : IInvoiceNumberService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<InvoiceNumberService> _logger;
    private readonly ISettingsService _settingsService;

    public InvoiceNumberService(
        IUnitOfWork unitOfWork, 
        ILogger<InvoiceNumberService> logger,
        ISettingsService settingsService)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
        _settingsService = settingsService;
    }

    public async Task<string> GenerateNextNumberAsync(int? companyId = null, DateTime? invoiceDate = null)
    {
        try
        {
            var date = invoiceDate ?? DateTime.Today;
            _logger.LogDebug("Generating next invoice number for company {CompanyId} on {Date}", companyId, date);

            // Get or create sequence for the company
            var sequence = await GetOrCreateSequenceAsync(companyId);
            
            // Generate the next number
            var nextNumber = sequence.GenerateNext(date);
            
            // Update sequence in database
            await UpdateSequenceAsync(sequence);
            
            _logger.LogInformation("Generated invoice number: {InvoiceNumber}", nextNumber);
            return nextNumber;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating invoice number");
            throw;
        }
    }

    public async Task<string> PreviewNextNumberAsync(int? companyId = null, DateTime? invoiceDate = null)
    {
        try
        {
            var date = invoiceDate ?? DateTime.Today;
            var sequence = await GetOrCreateSequenceAsync(companyId, false);
            return sequence.PreviewNext(date);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error previewing next invoice number");
            throw;
        }
    }

    public async Task<bool> IsNumberAvailableAsync(string invoiceNumber)
    {
        try
        {
            var existingInvoice = await _unitOfWork.InvoiceRepository.GetByNumberAsync(invoiceNumber);
            return existingInvoice == null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if invoice number is available: {InvoiceNumber}", invoiceNumber);
            throw;
        }
    }

    public async Task<bool> ValidateNumberFormatAsync(string invoiceNumber, int? companyId = null)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(invoiceNumber))
                return false;

            // Get the sequence for validation
            var sequence = await GetOrCreateSequenceAsync(companyId, false);
            
            // Basic format validation
            if (invoiceNumber.Length < 3)
                return false;

            // Check if it matches the expected pattern for the sequence
            var expectedFormat = sequence.Format;
            var sampleNumber = sequence.PreviewNext(DateTime.Today);
            
            // Extract the pattern (simplified validation)
            var parts = expectedFormat.Split('-');
            var numberParts = invoiceNumber.Split('-');
            
            if (parts.Length != numberParts.Length)
                return false;

            // Validate year part if present
            if (expectedFormat.Contains("{YYYY}"))
            {
                var yearIndex = Array.IndexOf(parts, parts.First(p => p.Contains("{YYYY}")));
                if (yearIndex >= 0 && yearIndex < numberParts.Length)
                {
                    if (!int.TryParse(numberParts[yearIndex], out var year) || year < 2020 || year > 2050)
                        return false;
                }
            }

            // Validate month part if present
            if (expectedFormat.Contains("{MM}"))
            {
                var monthIndex = Array.IndexOf(parts, parts.First(p => p.Contains("{MM}")));
                if (monthIndex >= 0 && monthIndex < numberParts.Length)
                {
                    if (!int.TryParse(numberParts[monthIndex], out var month) || month < 1 || month > 12)
                        return false;
                }
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating invoice number format: {InvoiceNumber}", invoiceNumber);
            return false;
        }
    }

    public async Task<bool> ResetSequenceAsync(int? companyId = null, DateTime? resetDate = null)
    {
        try
        {
            var sequence = await GetOrCreateSequenceAsync(companyId, false);
            var date = resetDate ?? DateTime.Today;
            
            sequence.SetCurrentNumber(sequence.StartNumber - 1, date);
            await UpdateSequenceAsync(sequence);
            
            _logger.LogInformation("Reset invoice sequence for company {CompanyId}", companyId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting invoice sequence");
            return false;
        }
    }

    public async Task<bool> SetCurrentNumberAsync(int currentNumber, int? companyId = null, DateTime? setDate = null)
    {
        try
        {
            var sequence = await GetOrCreateSequenceAsync(companyId, false);
            var date = setDate ?? DateTime.Today;
            
            sequence.SetCurrentNumber(currentNumber, date);
            await UpdateSequenceAsync(sequence);
            
            _logger.LogInformation("Set current invoice number to {CurrentNumber} for company {CompanyId}", 
                currentNumber, companyId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting current invoice number");
            return false;
        }
    }

    public async Task<string> GetNumberFormatAsync(int? companyId = null)
    {
        try
        {
            var sequence = await GetOrCreateSequenceAsync(companyId, false);
            return sequence.Format;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting number format");
            throw;
        }
    }

    public async Task<bool> UpdateNumberFormatAsync(string format, int? companyId = null)
    {
        try
        {
            var sequence = await GetOrCreateSequenceAsync(companyId, false);
            sequence.Format = format;
            sequence.UpdatedAt = DateTime.UtcNow;
            
            // Validate the new format
            if (!sequence.IsValidFormat())
            {
                throw new ArgumentException("Invalid number format");
            }
            
            await UpdateSequenceAsync(sequence);
            
            _logger.LogInformation("Updated invoice number format to {Format} for company {CompanyId}", 
                format, companyId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating number format");
            return false;
        }
    }

    public async Task<Dictionary<string, object>> GetSequenceInfoAsync(int? companyId = null)
    {
        try
        {
            var sequence = await GetOrCreateSequenceAsync(companyId, false);
            return sequence.GetSequenceInfo();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting sequence info");
            return new Dictionary<string, object>();
        }
    }

    #region Private Methods

    private async Task<InvoiceNumberSequence> GetOrCreateSequenceAsync(int? companyId, bool createIfMissing = true)
    {
        // For this implementation, we'll use in-memory sequences
        // In a full implementation, these would be stored in the database
        
        var defaultFormat = await _settingsService.GetInvoiceNumberFormatAsync();
        
        // Create a new sequence with default settings
        var sequence = new InvoiceNumberSequence
        {
            Id = companyId ?? 0,
            SequenceName = companyId.HasValue ? $"Company_{companyId}" : "Default",
            Format = defaultFormat,
            CurrentNumber = 0,
            StartNumber = 1,
            Length = 4,
            PaddingChar = '0',
            ResetAnnually = true,
            ResetMonthly = true,
            ResetDaily = false,
            CompanyId = companyId,
            CurrentYear = DateTime.Today.Year,
            CurrentMonth = DateTime.Today.Month,
            CurrentDay = DateTime.Today.Day,
            IsActive = true,
            IsDefault = !companyId.HasValue,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = 1 // System user
        };

        return sequence;
    }

    private async Task UpdateSequenceAsync(InvoiceNumberSequence sequence)
    {
        // In a full implementation, this would update the sequence in the database
        // For now, we'll just log the update
        _logger.LogDebug("Updated invoice number sequence: {SequenceName}, Current: {CurrentNumber}", 
            sequence.SequenceName, sequence.CurrentNumber);
        
        await Task.CompletedTask;
    }

    #endregion
}