// E:\kp\4 invoice\Infrastructure\Services\Core\InvoiceFormatService.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Interfaces.Services;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace InvoiceApp.Infrastructure.Services.Core;

public class InvoiceFormatService : IInvoiceFormatService
{
    private readonly ILogger<InvoiceFormatService> _logger;
    private readonly ISettingsService _settingsService;

    public InvoiceFormatService(ILogger<InvoiceFormatService> logger, ISettingsService settingsService)
    {
        _logger = logger;
        _settingsService = settingsService;
    }

    public async Task<InvoiceFormatDto> GetInvoiceFormatAsync(int? formatId = null)
    {
        try
        {
            if (formatId.HasValue)
            {
                // Load specific format (if we had a formats table)
                _logger.LogDebug("Loading invoice format: {FormatId}", formatId);
            }

            // For now, return the default format based on settings
            return await GetDefaultInvoiceFormatAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting invoice format");
            return GetFallbackFormat();
        }
    }

    public async Task<InvoiceFormatDto> GetDefaultInvoiceFormatAsync()
    {
        try
        {
            var formatSettings = await _settingsService.GetInvoiceFormatSettingsAsync();

            return new InvoiceFormatDto
            {
                Id = 1,
                FormatName = "Default Format",
                Description = "Default invoice format based on system settings",
                IsDefault = true,
                IsActive = true,

                Header = new HeaderSettingsDto
                {
                    CompanyName = formatSettings["company_name"].ToString() ?? "PT. FORTUNA SADA NIOGA",
                    CompanyTagline = formatSettings["company_tagline"].ToString() ?? "Spirit of Services",
                    ShowLogo = false,
                    HeaderFontSize = "20px",
                    HeaderColor = "#000000",
                    TaglineFontSize = "12px",
                    TaglineColor = "#666666"
                },

                CompanyInfo = new CompanyInfoSettingsDto
                {
                    InvoicePlace = formatSettings["invoice_place"].ToString() ?? "Jakarta",
                    OfficeLabel = "Kantor",
                    OfficeAddress = formatSettings["office_address"].ToString() ?? "Jakarta Office Address",
                    PhoneNumbers = new List<string> { formatSettings["office_phone"].ToString() ?? "+62-21-XXXXXXX" },
                    DateFormat = "dd/MM/yyyy",
                    ShowPageNumber = true,
                    PageNumberFormat = "Halaman {page}/{total}"
                },

                Table = new TableSettingsDto
                {
                    ColumnHeaders = new Dictionary<string, string>
                    {
                        ["No"] = "No.",
                        ["Date"] = "Tanggal",
                        ["PoNumber"] = "No. PO",
                        ["Expatriat"] = "Expatriat",
                        ["Description"] = "Keterangan",
                        ["Amount"] = "Harga"
                    },
                    ColumnWidths = new Dictionary<string, double>
                    {
                        ["No"] = 70,
                        ["Date"] = 70,
                        ["PoNumber"] = 70,
                        ["Expatriat"] = 140,
                        ["Description"] = 300,
                        ["Amount"] = 110
                    },
                    RowHeight = 32,
                    HeaderRowHeight = 42,
                    TableFontSize = "8px",
                    HeaderFontSize = "8px",
                    ShowBorders = true,
                    BorderColor = "#000000"
                },

                Footer = new FooterSettingsDto
                {
                    DppLabel = formatSettings["dpp_label"].ToString() ?? "DPP",
                    PpnLabel = formatSettings["ppn_label"].ToString() ?? "PPN",
                    TotalLabel = formatSettings["total_label"].ToString() ?? "Total",
                    ShowAmountInWords = true,
                    AmountInWordsLabel = "Terbilang",
                    AmountInWordsSuffix = "Rupiah",
                    CompanyNameInFooter = formatSettings["company_name"].ToString() ?? "",
                    SignatoryName = formatSettings["signatory_name"].ToString() ?? "Director Name",
                    ShowBankInfoOnLastPage = (bool)formatSettings["show_bank_info_last_page"]
                },

                Layout = new LayoutSettingsDto
                {
                    PageSize = "A4",
                    Orientation = "Portrait",
                    TopMargin = 20,
                    BottomMargin = 20,
                    LeftMargin = 20,
                    RightMargin = 20,
                    HeaderHeight = 80,
                    FooterHeight = 60,
                    FontFamily = "Arial",
                    DefaultFontSize = "10px"
                },

                Print = new PrintSettingsDto
                {
                    FitToPage = true,
                    ScaleFactor = 1.0,
                    PrintInColor = false,
                    PrintQuality = "Normal",
                    DuplexPrinting = false,
                    CopiesCount = 1,
                    CollatePages = true,
                    PaperSource = "Auto"
                },

                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating default invoice format");
            return GetFallbackFormat();
        }
    }

    public async Task<List<InvoiceFormatDto>> GetAvailableFormatsAsync()
    {
        try
        {
            // For now, return just the default format
            // In a full implementation, this would query a formats table
            var defaultFormat = await GetDefaultInvoiceFormatAsync();
            return new List<InvoiceFormatDto> { defaultFormat };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available formats");
            return new List<InvoiceFormatDto> { GetFallbackFormat() };
        }
    }

    public async Task<int> SaveInvoiceFormatAsync(InvoiceFormatDto format)
    {
        try
        {
            _logger.LogInformation("Saving invoice format: {FormatName}", format.FormatName);

            // Save format settings back to the settings service
            var formatSettings = new Dictionary<string, object>
            {
                ["company_name"] = format.Header.CompanyName,
                ["company_tagline"] = format.Header.CompanyTagline,
                ["invoice_place"] = format.CompanyInfo.InvoicePlace,
                ["office_address"] = format.CompanyInfo.OfficeAddress,
                ["office_phone"] = format.CompanyInfo.PhoneNumbers.FirstOrDefault() ?? "",
                ["signatory_name"] = format.Footer.SignatoryName,
                ["dpp_label"] = format.Footer.DppLabel,
                ["ppn_label"] = format.Footer.PpnLabel,
                ["total_label"] = format.Footer.TotalLabel,
                ["show_bank_info_last_page"] = format.Footer.ShowBankInfoOnLastPage
            };

            await _settingsService.SaveInvoiceFormatSettingsAsync(formatSettings);

            _logger.LogInformation("Invoice format saved successfully");
            return format.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving invoice format");
            throw;
        }
    }

    public async Task<bool> DeleteInvoiceFormatAsync(int formatId)
    {
        try
        {
            // In a full implementation, this would delete from a formats table
            // For now, we can't delete the default format
            _logger.LogInformation("Cannot delete default invoice format");
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting invoice format");
            return false;
        }
    }

    public async Task<InvoiceFormatDto> DuplicateInvoiceFormatAsync(int formatId, string newName)
    {
        try
        {
            var originalFormat = await GetInvoiceFormatAsync(formatId);
            
            var duplicatedFormat = JsonSerializer.Deserialize<InvoiceFormatDto>(
                JsonSerializer.Serialize(originalFormat));

            if (duplicatedFormat != null)
            {
                duplicatedFormat.Id = 0; // New format
                duplicatedFormat.FormatName = newName;
                duplicatedFormat.IsDefault = false;
                duplicatedFormat.CreatedAt = DateTime.UtcNow;
                duplicatedFormat.UpdatedAt = DateTime.UtcNow;

                return duplicatedFormat;
            }

            throw new InvalidOperationException("Failed to duplicate format");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error duplicating invoice format");
            throw;
        }
    }

    public async Task<bool> ValidateInvoiceFormatAsync(InvoiceFormatDto format)
    {
        try
        {
            var errors = new List<string>();

            // Validate required fields
            if (string.IsNullOrWhiteSpace(format.FormatName))
                errors.Add("Format name is required");

            if (string.IsNullOrWhiteSpace(format.Header.CompanyName))
                errors.Add("Company name is required");

            if (string.IsNullOrWhiteSpace(format.Footer.SignatoryName))
                errors.Add("Signatory name is required");

            // Validate table settings
            if (format.Table.ColumnWidths.Values.Any(w => w <= 0))
                errors.Add("All column widths must be greater than 0");

            if (format.Table.RowHeight <= 0)
                errors.Add("Row height must be greater than 0");

            // Validate layout settings
            if (format.Layout.TopMargin < 0 || format.Layout.BottomMargin < 0 ||
                format.Layout.LeftMargin < 0 || format.Layout.RightMargin < 0)
                errors.Add("Margins cannot be negative");

            // Validate print settings
            if (format.Print.ScaleFactor <= 0 || format.Print.ScaleFactor > 5)
                errors.Add("Scale factor must be between 0 and 5");

            if (format.Print.CopiesCount <= 0)
                errors.Add("Copies count must be greater than 0");

            if (errors.Any())
            {
                _logger.LogWarning("Invoice format validation failed: {Errors}", string.Join("; ", errors));
                return false;
            }

            await Task.CompletedTask;
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating invoice format");
            return false;
        }
    }

    public async Task<string> ExportInvoiceFormatAsync(int formatId)
    {
        try
        {
            var format = await GetInvoiceFormatAsync(formatId);
            return JsonSerializer.Serialize(format, new JsonSerializerOptions 
            { 
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting invoice format");
            throw;
        }
    }

    public async Task<InvoiceFormatDto> ImportInvoiceFormatAsync(string formatJson)
    {
        try
        {
            var format = JsonSerializer.Deserialize<InvoiceFormatDto>(formatJson, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            if (format == null)
                throw new InvalidOperationException("Invalid format JSON");

            // Validate imported format
            if (!await ValidateInvoiceFormatAsync(format))
                throw new InvalidOperationException("Imported format is invalid");

            // Reset ID and timestamps for import
            format.Id = 0;
            format.CreatedAt = DateTime.UtcNow;
            format.UpdatedAt = DateTime.UtcNow;
            format.IsDefault = false;

            return format;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing invoice format");
            throw;
        }
    }

    private InvoiceFormatDto GetFallbackFormat()
    {
        return new InvoiceFormatDto
        {
            Id = 1,
            FormatName = "Fallback Format",
            Description = "Basic fallback format",
            IsDefault = true,
            IsActive = true,
            Header = new HeaderSettingsDto
            {
                CompanyName = "PT. FORTUNA SADA NIOGA",
                CompanyTagline = "Spirit of Services"
            },
            Footer = new FooterSettingsDto
            {
                DppLabel = "DPP",
                PpnLabel = "PPN",
                TotalLabel = "Total"
            },
            Layout = new LayoutSettingsDto
            {
                PageSize = "A4",
                Orientation = "Portrait"
            }
        };
    }
}