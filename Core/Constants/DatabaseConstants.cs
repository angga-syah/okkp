// E:\kp\4 invoice\Core\Constants\DatabaseConstants.cs
namespace InvoiceApp.Core.Constants;

public static class DatabaseConstants
{
    // Table Names
    public const string UsersTable = "users";
    public const string CompaniesTable = "companies";
    public const string TkaWorkersTable = "tka_workers";
    public const string CompanyTkaAssignmentsTable = "company_tka_assignments";
    public const string TkaFamilyMembersTable = "tka_family_members";
    public const string JobDescriptionsTable = "job_descriptions";
    public const string InvoicesTable = "invoices";
    public const string InvoiceLinesTable = "invoice_lines";
    public const string BankAccountsTable = "bank_accounts";
    public const string ImportLogsTable = "import_logs";
    public const string SettingsTable = "settings";
    public const string UserPreferencesTable = "user_preferences";

    // Index Names
    public const string UsersUsernameIndex = "ix_users_username";
    public const string CompaniesNpwpIndex = "ix_companies_npwp";
    public const string CompaniesIdtkuIndex = "ix_companies_idtku";
    public const string TkaWorkersPassportIndex = "ix_tka_workers_passport";
    public const string InvoicesNumberIndex = "ix_invoices_number";
    public const string InvoicesDateIndex = "ix_invoices_date";
    public const string InvoicesCompanyIndex = "ix_invoices_company";
    public const string InvoicesStatusIndex = "ix_invoices_status";
    public const string InvoiceLinesInvoiceIndex = "ix_invoice_lines_invoice";
    public const string InvoiceLinesTkaIndex = "ix_invoice_lines_tka";
    public const string InvoiceLinesJobIndex = "ix_invoice_lines_job";
    public const string SettingsKeyIndex = "ix_settings_key";
    public const string UserPreferencesUserKeyIndex = "ix_user_preferences_user_key";

    // Full-Text Search Indexes
    public const string CompaniesSearchIndex = "ix_companies_search";
    public const string TkaWorkersSearchIndex = "ix_tka_workers_search";
    public const string InvoicesSearchIndex = "ix_invoices_search";
    public const string JobDescriptionsSearchIndex = "ix_job_descriptions_search";

    // Connection Settings
    public const int DefaultCommandTimeout = 30;
    public const int DefaultConnectionTimeout = 15;
    public const int DefaultMinPoolSize = 5;
    public const int DefaultMaxPoolSize = 100;
    public const int DefaultConnectionLifetime = 300; // 5 minutes

    // Column Lengths
    public const int UsernamMaxLength = 50;
    public const int PasswordHashMaxLength = 255;
    public const int FullNameMaxLength = 100;
    public const int CompanyNameMaxLength = 200;
    public const int NpwpMaxLength = 20;
    public const int IdtkuMaxLength = 20;
    public const int AddressMaxLength = 500;
    public const int EmailMaxLength = 100;
    public const int PhoneMaxLength = 20;
    public const int ContactPersonMaxLength = 100;
    public const int TkaNameMaxLength = 100;
    public const int PassportMaxLength = 20;
    public const int DivisiMaxLength = 100;
    public const int InvoiceNumberMaxLength = 50;
    public const int JobNameMaxLength = 200;
    public const int JobDescriptionMaxLength = 1000;
    public const int NotesMaxLength = 1000;
    public const int BankNameMaxLength = 100;
    public const int AccountNumberMaxLength = 50;
    public const int AccountNameMaxLength = 100;
    public const int BranchNameMaxLength = 100;
    public const int SettingKeyMaxLength = 100;
    public const int SettingValueMaxLength = 2000;
    public const int PreferenceKeyMaxLength = 100;
    public const int PreferenceValueMaxLength = 2000;
    public const int FileNameMaxLength = 255;
    public const int ImportBatchIdMaxLength = 50;

    // Decimal Precision
    public const int PricePrecision = 15;
    public const int PriceScale = 2;
    public const int VatPercentagePrecision = 5;
    public const int VatPercentageScale = 2;

    // Unique Constraints
    public const string UsersUsernameUnique = "uq_users_username";
    public const string CompaniesNpwpUnique = "uq_companies_npwp";
    public const string CompaniesIdtkuUnique = "uq_companies_idtku";
    public const string TkaWorkersPassportUnique = "uq_tka_workers_passport";
    public const string InvoicesNumberUnique = "uq_invoices_number";
    public const string SettingsKeyUnique = "uq_settings_key";
    public const string UserPreferencesUserKeyUnique = "uq_user_preferences_user_key";

    // Foreign Key Constraints
    public const string CompanyTkaAssignmentsCompanyFk = "fk_company_tka_assignments_company";
    public const string CompanyTkaAssignmentsTkaFk = "fk_company_tka_assignments_tka";
    public const string TkaFamilyMembersTkaFk = "fk_tka_family_members_tka";
    public const string JobDescriptionsCompanyFk = "fk_job_descriptions_company";
    public const string InvoicesCompanyFk = "fk_invoices_company";
    public const string InvoicesCreatedByFk = "fk_invoices_created_by";
    public const string InvoicesBankAccountFk = "fk_invoices_bank_account";
    public const string InvoiceLinesInvoiceFk = "fk_invoice_lines_invoice";
    public const string InvoiceLinesTkaFk = "fk_invoice_lines_tka";
    public const string InvoiceLinesJobFk = "fk_invoice_lines_job";
    public const string ImportLogsUserFk = "fk_import_logs_user";
    public const string UserPreferencesUserFk = "fk_user_preferences_user";

    // Check Constraints
    public const string InvoicesSubtotalCheck = "ck_invoices_subtotal_positive";
    public const string InvoicesVatAmountCheck = "ck_invoices_vat_amount_positive";
    public const string InvoicesTotalAmountCheck = "ck_invoices_total_amount_positive";
    public const string InvoiceLinesQuantityCheck = "ck_invoice_lines_quantity_positive";
    public const string InvoiceLinesUnitPriceCheck = "ck_invoice_lines_unit_price_positive";
    public const string InvoiceLinesLineTotalCheck = "ck_invoice_lines_line_total_positive";
    public const string JobDescriptionsPriceCheck = "ck_job_descriptions_price_positive";

    // Default Values
    public const string DefaultUserRole = "viewer";
    public const string DefaultInvoiceStatus = "draft";
    public const string DefaultGender = "Laki-laki";
    public const string DefaultFamilyRelationship = "spouse";
    public const bool DefaultIsActive = true;
    public const int DefaultSortOrder = 0;
    public const int DefaultQuantity = 1;
    public const decimal DefaultVatPercentage = 11.00m;
    public const int DefaultPrintedCount = 0;

    // PostgreSQL Specific
    public const string UuidExtension = "uuid-ossp";
    public const string UuidGenerateFunction = "uuid_generate_v4()";
    public const string CurrentTimestampFunction = "CURRENT_TIMESTAMP";
    public const string PostgresTextSearchConfig = "indonesian";
}