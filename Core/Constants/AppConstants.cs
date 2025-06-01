// E:\kp\4 invoice\Core\Constants\AppConstants.cs
namespace InvoiceApp.Core.Constants;

public static class AppConstants
{
    // Application Info
    public const string ApplicationName = "Invoice Management System";
    public const string ApplicationVersion = "1.0.0";
    public const string CompanyName = "PT. FORTUNA SADA NIOGA";
    public const string CompanyTagline = "Spirit of Services";

    // Default Values
    public const decimal DefaultVatPercentage = 11.00m;
    public const string DefaultInvoicePlace = "Jakarta";
    public const string DefaultCurrency = "IDR";
    public const string DefaultDateFormat = "dd/MM/yyyy";
    public const string DefaultNumberFormat = "#,##0";

    // Invoice Settings
    public const string DefaultInvoiceNumberFormat = "INV-{YYYY}-{MM}-{NNNN}";
    public const int MaxInvoiceLineCount = 1000;
    public const int MaxInvoiceAttachmentSize = 10485760; // 10MB
    public const int DefaultAutoSaveInterval = 30; // seconds

    // Validation Rules
    public const int MinCompanyNameLength = 2;
    public const int MaxCompanyNameLength = 200;
    public const int MinTkaNameLength = 2;
    public const int MaxTkaNameLength = 100;
    public const int MinPassportLength = 6;
    public const int MaxPassportLength = 20;
    public const int MaxNotesLength = 1000;
    public const int MaxJobDescriptionLength = 1000;

    // Search Settings
    public const int DefaultSearchResultLimit = 20;
    public const int MaxSearchResultLimit = 100;
    public const int MinSearchTermLength = 2;
    public const int SearchCacheExpirationMinutes = 10;

    // File Settings
    public const int MaxImportFileSize = 52428800; // 50MB

    // Arrays must be static readonly, not const
    public static readonly string[] AllowedImportExtensions = { ".xlsx", ".xls", ".csv", ".json" };
    public static readonly string[] AllowedExportExtensions = { ".xlsx", ".pdf", ".csv", ".json" };

    // User Interface
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;
    public const int DefaultCacheExpirationMinutes = 30;
    public const int DefaultAnimationDurationMs = 300;

    // Indonesian Rounding Rules
    public const decimal RoundingThreshold = 0.50m;

    // System Limits
    public const int MaxConcurrentUsers = 100;
    public const int MaxSessionTimeoutMinutes = 480; // 8 hours
    public const int PasswordMinLength = 6;
    public const int MaxLoginAttempts = 5;

    // Report Settings
    public const int MaxReportRecords = 10000;
    public const int ReportCacheExpirationMinutes = 60;
    public const string DefaultReportDateFormat = "yyyy-MM-dd";

    // Print Settings
    public const string DefaultPrintMargin = "20mm";
    public const string DefaultPrintOrientation = "Portrait";
    public const bool ShowBankInfoOnLastPageOnly = true;

    // Feature Flags
    public const bool EnableAdvancedSearch = true;
    public const bool EnableBulkOperations = true;
    public const bool EnableDataExport = true;
    public const bool EnableDataImport = true;
    public const bool EnableReports = true;
    public const bool EnableUserPreferences = true;
}