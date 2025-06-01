using InvoiceApp.Core.Enums;

namespace InvoiceApp.Infrastructure.Seed;

public static class DefaultSettings
{
    public static readonly Dictionary<string, string> AppSettings = new()
    {
        // Invoice Settings
        ["VAT_PERCENTAGE"] = "11.00",
        ["INVOICE_NUMBER_PREFIX"] = "INV",
        ["INVOICE_NUMBER_FORMAT"] = "INV-{0:yyyy}-{1:D4}",
        ["INVOICE_PLACE"] = "Jakarta",
        ["DATE_FORMAT"] = "dd MMMM yyyy",
        ["CURRENCY_FORMAT"] = "N2",
        
        // Company Information
        ["COMPANY_NAME"] = "PT. FORTUNA SADA NIOGA",
        ["COMPANY_TAGLINE"] = "Spirit of Services",
        ["OFFICE_ADDRESS"] = "Jl. Example Street No. 123\nJakarta 12345",
        ["OFFICE_PHONE"] = "Tel: (021) 1234-5678\nFax: (021) 1234-5679",
        ["SIGNATORY_NAME"] = "Manager",
        ["INVOICE_TERMS"] = "Pembayaran dilakukan dalam 30 hari",
        
        // UI Settings
        ["THEME_MODE"] = "Modern",
        ["ENABLE_ANIMATIONS"] = "true",
        ["LANGUAGE_CODE"] = "id-ID",
        ["PAGE_SIZE_DEFAULT"] = "50",
        
        // Performance Settings
        ["CACHE_EXPIRATION_MINUTES"] = "30",
        ["CONNECTION_TIMEOUT_SECONDS"] = "30",
        ["SEARCH_MIN_LENGTH"] = "2",
        ["ENABLE_MEMORY_CACHE"] = "true",
        ["ENABLE_VIRTUAL_SCROLLING"] = "true",
        
        // Security Settings
        ["PASSWORD_MIN_LENGTH"] = "6",
        ["SESSION_TIMEOUT_MINUTES"] = "480",
        ["MAX_LOGIN_ATTEMPTS"] = "5",
        
        // Backup Settings
        ["AUTO_BACKUP_ENABLED"] = "true",
        ["BACKUP_INTERVAL_HOURS"] = "24",
        ["BACKUP_RETENTION_DAYS"] = "30",
        
        // Print Settings
        ["PRINT_MARGIN_TOP"] = "2.5",
        ["PRINT_MARGIN_BOTTOM"] = "2.5",
        ["PRINT_MARGIN_LEFT"] = "2.0",
        ["PRINT_MARGIN_RIGHT"] = "2.0",
        ["PRINT_ORIENTATION"] = "Portrait",
        
        // Export Settings
        ["DEFAULT_EXPORT_FORMAT"] = "PDF",
        ["EXCEL_TEMPLATE_ENABLED"] = "true",
        ["PDF_COMPRESSION_ENABLED"] = "true",
        
        // Search Settings
        ["FUZZY_SEARCH_ENABLED"] = "true",
        ["SEARCH_DELAY_MS"] = "300",
        ["MAX_SEARCH_RESULTS"] = "100",
        
        // Database Settings
        ["CONNECTION_POOL_SIZE"] = "20",
        ["COMMAND_TIMEOUT_SECONDS"] = "30",
        ["ENABLE_QUERY_LOGGING"] = "false"
    };

    public static readonly Dictionary<UserRole, List<string>> RolePermissions = new()
    {
        [UserRole.Admin] = new List<string>
        {
            "invoice.create",
            "invoice.edit",
            "invoice.delete",
            "invoice.view",
            "invoice.print",
            "invoice.export",
            "invoice.import",
            "company.create",
            "company.edit",
            "company.delete",
            "company.view",
            "tka.create",
            "tka.edit",
            "tka.delete",
            "tka.view",
            "user.create",
            "user.edit",
            "user.delete",
            "user.view",
            "settings.edit",
            "settings.view",
            "reports.view",
            "reports.export",
            "backup.create",
            "backup.restore"
        },
        [UserRole.Viewer] = new List<string>
        {
            "invoice.view",
            "invoice.print",
            "invoice.export",
            "company.view",
            "tka.view",
            "reports.view",
            "reports.export"
        }
    };

    public static readonly Dictionary<string, object> UIDefaults = new()
    {
        // Colors (Material Design)
        ["PrimaryColor"] = "#1976D2",
        ["SecondaryColor"] = "#424242",
        ["AccentColor"] = "#FF9800",
        ["ErrorColor"] = "#F44336",
        ["WarningColor"] = "#FF9800",
        ["SuccessColor"] = "#4CAF50",
        ["InfoColor"] = "#2196F3",
        
        // Fonts
        ["PrimaryFont"] = "Segoe UI",
        ["SecondaryFont"] = "Arial",
        ["MonospaceFont"] = "Consolas",
        
        // Sizes
        ["FontSizeSmall"] = 12,
        ["FontSizeMedium"] = 14,
        ["FontSizeLarge"] = 16,
        ["FontSizeTitle"] = 20,
        
        // Spacing
        ["SpacingSmall"] = 4,
        ["SpacingMedium"] = 8,
        ["SpacingLarge"] = 16,
        ["SpacingXLarge"] = 24,
        
        // Animations
        ["AnimationDuration"] = 300,
        ["AnimationEasing"] = "ease-out",
        
        // Layout
        ["CardElevation"] = 2,
        ["CornerRadius"] = 8,
        ["BorderWidth"] = 1
    };

    public static readonly Dictionary<ThemeMode, Dictionary<string, string>> ThemeColors = new()
    {
        [ThemeMode.Light] = new Dictionary<string, string>
        {
            ["Background"] = "#FFFFFF",
            ["Surface"] = "#F5F5F5",
            ["Primary"] = "#1976D2",
            ["Secondary"] = "#424242",
            ["OnBackground"] = "#000000",
            ["OnSurface"] = "#000000",
            ["OnPrimary"] = "#FFFFFF",
            ["OnSecondary"] = "#FFFFFF"
        },
        [ThemeMode.Dark] = new Dictionary<string, string>
        {
            ["Background"] = "#121212",
            ["Surface"] = "#1E1E1E",
            ["Primary"] = "#BB86FC",
            ["Secondary"] = "#03DAC6",
            ["OnBackground"] = "#FFFFFF",
            ["OnSurface"] = "#FFFFFF",
            ["OnPrimary"] = "#000000",
            ["OnSecondary"] = "#000000"
        },
        [ThemeMode.Modern] = new Dictionary<string, string>
        {
            ["Background"] = "#FAFAFA",
            ["Surface"] = "#FFFFFF",
            ["Primary"] = "#6200EE",
            ["Secondary"] = "#03DAC6",
            ["OnBackground"] = "#000000",
            ["OnSurface"] = "#000000",
            ["OnPrimary"] = "#FFFFFF",
            ["OnSecondary"] = "#000000"
        }
    };

    public static readonly Dictionary<ExportFormat, string> ExportTemplates = new()
    {
        [ExportFormat.PDF] = "Templates/InvoicePdfTemplate.html",
        [ExportFormat.Excel] = "Templates/InvoiceExcelTemplate.xlsx",
        [ExportFormat.CSV] = "Templates/InvoiceCsvTemplate.csv"
    };

    public static readonly Dictionary<ReportType, string> ReportTemplates = new()
    {
        [ReportType.InvoiceSummary] = "Templates/InvoiceSummaryReport.html",
        [ReportType.CompanyReport] = "Templates/CompanyReport.html",
        [ReportType.TkaReport] = "Templates/TkaReport.html",
        [ReportType.FinancialReport] = "Templates/FinancialReport.html"
    };

    public static readonly List<string> DefaultBankAccounts = new()
    {
        "Bank Central Asia (BCA)",
        "Bank Mandiri",
        "Bank Negara Indonesia (BNI)",
        "Bank Rakyat Indonesia (BRI)",
        "Bank CIMB Niaga",
        "Bank Danamon",
        "Bank Permata",
        "Bank OCBC NISP"
    };

    public static readonly Dictionary<string, string> InvoiceFieldLabels = new()
    {
        ["InvoiceNumber"] = "No. Invoice",
        ["InvoiceDate"] = "Tanggal",
        ["DueDate"] = "Jatuh Tempo",
        ["CompanyName"] = "Nama Perusahaan",
        ["TkaName"] = "Nama TKA",
        ["JobDescription"] = "Keterangan",
        ["Quantity"] = "Jumlah",
        ["UnitPrice"] = "Harga Satuan",
        ["LineTotal"] = "Total",
        ["Subtotal"] = "Sub Total",
        ["VatAmount"] = "PPN",
        ["TotalAmount"] = "Total Keseluruhan",
        ["AmountInWords"] = "Terbilang"
    };

    public static readonly Dictionary<InvoiceStatus, string> StatusLabels = new()
    {
        [InvoiceStatus.Draft] = "Draft",
        [InvoiceStatus.Finalized] = "Final",
        [InvoiceStatus.Paid] = "Lunas",
        [InvoiceStatus.Cancelled] = "Dibatalkan"
    };

    public static readonly Dictionary<Gender, string> GenderLabels = new()
    {
        [Gender.LakiLaki] = "Laki-laki",
        [Gender.Perempuan] = "Perempuan"
    };

    public static readonly Dictionary<FamilyRelationship, string> RelationshipLabels = new()
    {
        [FamilyRelationship.Spouse] = "Pasangan",
        [FamilyRelationship.Parent] = "Orang Tua",
        [FamilyRelationship.Child] = "Anak"
    };

    public static string GetSetting(string key, string defaultValue = "")
    {
        return AppSettings.TryGetValue(key, out var value) ? value : defaultValue;
    }

    public static T GetSetting<T>(string key, T defaultValue = default)
    {
        if (!AppSettings.TryGetValue(key, out var value))
            return defaultValue;

        try
        {
            return (T)Convert.ChangeType(value, typeof(T));
        }
        catch
        {
            return defaultValue;
        }
    }

    public static bool HasPermission(UserRole role, string permission)
    {
        return RolePermissions.TryGetValue(role, out var permissions) && 
               permissions.Contains(permission);
    }

    public static Dictionary<string, string> GetThemeColors(ThemeMode theme)
    {
        return ThemeColors.TryGetValue(theme, out var colors) ? colors : ThemeColors[ThemeMode.Modern];
    }
}