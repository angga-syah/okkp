// E:\kp\4 invoice\Infrastructure\Data\InvoiceDbContext.cs
using InvoiceApp.Core.Constants;
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace InvoiceApp.Infrastructure.Data;

public class InvoiceDbContext : DbContext
{
    public InvoiceDbContext(DbContextOptions<InvoiceDbContext> options) : base(options)
    {
    }

    // DbSets
    public DbSet<User> Users { get; set; }
    public DbSet<Company> Companies { get; set; }
    public DbSet<TkaWorker> TkaWorkers { get; set; }
    public DbSet<CompanyTkaAssignment> CompanyTkaAssignments { get; set; }
    public DbSet<TkaFamilyMember> TkaFamilyMembers { get; set; }
    public DbSet<JobDescription> JobDescriptions { get; set; }
    public DbSet<Invoice> Invoices { get; set; }
    public DbSet<InvoiceLine> InvoiceLines { get; set; }
    public DbSet<BankAccount> BankAccounts { get; set; }
    public DbSet<ImportLog> ImportLogs { get; set; }
    public DbSet<Setting> Settings { get; set; }
    public DbSet<UserPreference> UserPreferences { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply configurations
        ApplyEntityConfigurations(modelBuilder);
        
        // Configure enum conversions
        ConfigureEnumConversions(modelBuilder);
        
        // Configure indexes
        ConfigureIndexes(modelBuilder);
        
        // Configure relationships
        ConfigureRelationships(modelBuilder);
        
        // Configure constraints
        ConfigureConstraints(modelBuilder);
        
        // Seed default data
        SeedDefaultData(modelBuilder);
    }

    private void ApplyEntityConfigurations(ModelBuilder modelBuilder)
    {
        // User Configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable(DatabaseConstants.UsersTable);
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.UserUuid)
                .HasDefaultValueSql(DatabaseConstants.UuidGenerateFunction);
            
            entity.Property(e => e.Username)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.UsernamMaxLength);
            
            entity.Property(e => e.PasswordHash)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.PasswordHashMaxLength);
            
            entity.Property(e => e.FullName)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.FullNameMaxLength);
            
            entity.Property(e => e.IsActive)
                .HasDefaultValue(DatabaseConstants.DefaultIsActive);
            
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
            
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
        });

        // Company Configuration
        modelBuilder.Entity<Company>(entity =>
        {
            entity.ToTable(DatabaseConstants.CompaniesTable);
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.CompanyUuid)
                .HasDefaultValueSql(DatabaseConstants.UuidGenerateFunction);
            
            entity.Property(e => e.CompanyName)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.CompanyNameMaxLength);
            
            entity.Property(e => e.Npwp)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.NpwpMaxLength);
            
            entity.Property(e => e.Idtku)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.IdtkuMaxLength);
            
            entity.Property(e => e.Address)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.AddressMaxLength);
            
            entity.Property(e => e.Email)
                .HasMaxLength(DatabaseConstants.EmailMaxLength);
            
            entity.Property(e => e.Phone)
                .HasMaxLength(DatabaseConstants.PhoneMaxLength);
            
            entity.Property(e => e.ContactPerson)
                .HasMaxLength(DatabaseConstants.ContactPersonMaxLength);
            
            entity.Property(e => e.IsActive)
                .HasDefaultValue(DatabaseConstants.DefaultIsActive);
            
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
            
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
        });

        // TkaWorker Configuration
        modelBuilder.Entity<TkaWorker>(entity =>
        {
            entity.ToTable(DatabaseConstants.TkaWorkersTable);
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.TkaUuid)
                .HasDefaultValueSql(DatabaseConstants.UuidGenerateFunction);
            
            entity.Property(e => e.Nama)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.TkaNameMaxLength);
            
            entity.Property(e => e.Passport)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.PassportMaxLength);
            
            entity.Property(e => e.Divisi)
                .HasMaxLength(DatabaseConstants.DivisiMaxLength);
            
            entity.Property(e => e.IsActive)
                .HasDefaultValue(DatabaseConstants.DefaultIsActive);
            
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
            
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
        });

        // Invoice Configuration
        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.ToTable(DatabaseConstants.InvoicesTable);
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.InvoiceUuid)
                .HasDefaultValueSql(DatabaseConstants.UuidGenerateFunction);
            
            entity.Property(e => e.InvoiceNumber)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.InvoiceNumberMaxLength);
            
            entity.Property(e => e.Subtotal)
                .HasPrecision(DatabaseConstants.PricePrecision, DatabaseConstants.PriceScale)
                .HasDefaultValue(0);
            
            entity.Property(e => e.VatPercentage)
                .HasPrecision(DatabaseConstants.VatPercentagePrecision, DatabaseConstants.VatPercentageScale)
                .HasDefaultValue(DatabaseConstants.DefaultVatPercentage);
            
            entity.Property(e => e.VatAmount)
                .HasPrecision(DatabaseConstants.PricePrecision, DatabaseConstants.PriceScale)
                .HasDefaultValue(0);
            
            entity.Property(e => e.TotalAmount)
                .HasPrecision(DatabaseConstants.PricePrecision, DatabaseConstants.PriceScale)
                .HasDefaultValue(0);
            
            entity.Property(e => e.Notes)
                .HasMaxLength(DatabaseConstants.NotesMaxLength);
            
            entity.Property(e => e.PrintedCount)
                .HasDefaultValue(DatabaseConstants.DefaultPrintedCount);
            
            entity.Property(e => e.ImportedFrom)
                .HasMaxLength(DatabaseConstants.FileNameMaxLength);
            
            entity.Property(e => e.ImportBatchId)
                .HasMaxLength(DatabaseConstants.ImportBatchIdMaxLength);
            
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
            
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
        });

        // InvoiceLine Configuration
        modelBuilder.Entity<InvoiceLine>(entity =>
        {
            entity.ToTable(DatabaseConstants.InvoiceLinesTable);
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.LineUuid)
                .HasDefaultValueSql(DatabaseConstants.UuidGenerateFunction);
            
            entity.Property(e => e.CustomJobName)
                .HasMaxLength(DatabaseConstants.JobNameMaxLength);
            
            entity.Property(e => e.CustomJobDescription)
                .HasMaxLength(DatabaseConstants.JobDescriptionMaxLength);
            
            entity.Property(e => e.CustomPrice)
                .HasPrecision(DatabaseConstants.PricePrecision, DatabaseConstants.PriceScale);
            
            entity.Property(e => e.Quantity)
                .HasDefaultValue(DatabaseConstants.DefaultQuantity);
            
            entity.Property(e => e.UnitPrice)
                .HasPrecision(DatabaseConstants.PricePrecision, DatabaseConstants.PriceScale)
                .HasDefaultValue(0);
            
            entity.Property(e => e.LineTotal)
                .HasPrecision(DatabaseConstants.PricePrecision, DatabaseConstants.PriceScale)
                .HasDefaultValue(0);
            
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
        });

        // JobDescription Configuration
        modelBuilder.Entity<JobDescription>(entity =>
        {
            entity.ToTable(DatabaseConstants.JobDescriptionsTable);
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.JobUuid)
                .HasDefaultValueSql(DatabaseConstants.UuidGenerateFunction);
            
            entity.Property(e => e.JobName)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.JobNameMaxLength);
            
            entity.Property(e => e.JobDescription)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.JobDescriptionMaxLength);
            
            entity.Property(e => e.Price)
                .HasPrecision(DatabaseConstants.PricePrecision, DatabaseConstants.PriceScale)
                .HasDefaultValue(0);
            
            entity.Property(e => e.IsActive)
                .HasDefaultValue(DatabaseConstants.DefaultIsActive);
            
            entity.Property(e => e.SortOrder)
                .HasDefaultValue(DatabaseConstants.DefaultSortOrder);
            
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
            
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
        });

        // BankAccount Configuration
        modelBuilder.Entity<BankAccount>(entity =>
        {
            entity.ToTable(DatabaseConstants.BankAccountsTable);
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.BankUuid)
                .HasDefaultValueSql(DatabaseConstants.UuidGenerateFunction);
            
            entity.Property(e => e.BankName)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.BankNameMaxLength);
            
            entity.Property(e => e.AccountNumber)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.AccountNumberMaxLength);
            
            entity.Property(e => e.AccountName)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.AccountNameMaxLength);
            
            entity.Property(e => e.BranchName)
                .HasMaxLength(DatabaseConstants.BranchNameMaxLength);
            
            entity.Property(e => e.IsActive)
                .HasDefaultValue(DatabaseConstants.DefaultIsActive);
            
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
            
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
        });

        // Additional entity configurations for other entities...
        ConfigureRemainingEntities(modelBuilder);
    }

    private void ConfigureRemainingEntities(ModelBuilder modelBuilder)
    {
        // CompanyTkaAssignment Configuration
        modelBuilder.Entity<CompanyTkaAssignment>(entity =>
        {
            entity.ToTable(DatabaseConstants.CompanyTkaAssignmentsTable);
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.AssignmentDate)
                .HasDefaultValueSql("CURRENT_DATE");
            
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true);
            
            entity.Property(e => e.Notes)
                .HasMaxLength(500);
            
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
        });

        // TkaFamilyMember Configuration
        modelBuilder.Entity<TkaFamilyMember>(entity =>
        {
            entity.ToTable(DatabaseConstants.TkaFamilyMembersTable);
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.FamilyUuid)
                .HasDefaultValueSql(DatabaseConstants.UuidGenerateFunction);
            
            entity.Property(e => e.Nama)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.TkaNameMaxLength);
            
            entity.Property(e => e.Passport)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.PassportMaxLength);
            
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true);
            
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
        });

        // ImportLog Configuration
        modelBuilder.Entity<ImportLog>(entity =>
        {
            entity.ToTable(DatabaseConstants.ImportLogsTable);
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.ImportBatchId)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.ImportBatchIdMaxLength);
            
            entity.Property(e => e.FileName)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.FileNameMaxLength);
            
            entity.Property(e => e.FileType)
                .IsRequired()
                .HasMaxLength(20);
            
            entity.Property(e => e.ErrorSummary)
                .HasColumnType("TEXT");
            
            entity.Property(e => e.ImportOptions)
                .HasColumnType("TEXT");
            
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
        });

        // Setting Configuration
        modelBuilder.Entity<Setting>(entity =>
        {
            entity.ToTable(DatabaseConstants.SettingsTable);
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.SettingKey)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.SettingKeyMaxLength);
            
            entity.Property(e => e.SettingValue)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.SettingValueMaxLength);
            
            entity.Property(e => e.Description)
                .HasMaxLength(500);
            
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
            
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
        });

        // UserPreference Configuration
        modelBuilder.Entity<UserPreference>(entity =>
        {
            entity.ToTable(DatabaseConstants.UserPreferencesTable);
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.PreferenceKey)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.PreferenceKeyMaxLength);
            
            entity.Property(e => e.PreferenceValue)
                .IsRequired()
                .HasMaxLength(DatabaseConstants.PreferenceValueMaxLength);
            
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
            
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql(DatabaseConstants.CurrentTimestampFunction);
        });
    }

    private void ConfigureEnumConversions(ModelBuilder modelBuilder)
    {
        // UserRole enum conversion
        modelBuilder.Entity<User>()
            .Property(e => e.Role)
            .HasConversion(
                v => v.ToString().ToLower(),
                v => Enum.Parse<UserRole>(v, true))
            .HasMaxLength(20)
            .HasDefaultValue(DatabaseConstants.DefaultUserRole);

        // InvoiceStatus enum conversion
        modelBuilder.Entity<Invoice>()
            .Property(e => e.Status)
            .HasConversion(
                v => v.ToString().ToLower(),
                v => Enum.Parse<InvoiceStatus>(v, true))
            .HasMaxLength(20)
            .HasDefaultValue(DatabaseConstants.DefaultInvoiceStatus);

        // Gender enum conversion
        modelBuilder.Entity<TkaWorker>()
            .Property(e => e.JenisKelamin)
            .HasConversion(
                v => v.ToString(),
                v => Enum.Parse<Gender>(v, true))
            .HasMaxLength(20)
            .HasDefaultValue(DatabaseConstants.DefaultGender);

        modelBuilder.Entity<TkaFamilyMember>()
            .Property(e => e.JenisKelamin)
            .HasConversion(
                v => v.ToString(),
                v => Enum.Parse<Gender>(v, true))
            .HasMaxLength(20)
            .HasDefaultValue(DatabaseConstants.DefaultGender);

        // FamilyRelationship enum conversion
        modelBuilder.Entity<TkaFamilyMember>()
            .Property(e => e.Relationship)
            .HasConversion(
                v => v.ToString().ToLower(),
                v => Enum.Parse<FamilyRelationship>(v, true))
            .HasMaxLength(20)
            .HasDefaultValue(DatabaseConstants.DefaultFamilyRelationship);
    }

    private void ConfigureIndexes(ModelBuilder modelBuilder)
    {
        // Unique indexes
        modelBuilder.Entity<User>()
            .HasIndex(e => e.Username)
            .IsUnique()
            .HasDatabaseName(DatabaseConstants.UsersUsernameIndex);

        modelBuilder.Entity<Company>()
            .HasIndex(e => e.Npwp)
            .IsUnique()
            .HasDatabaseName(DatabaseConstants.CompaniesNpwpIndex);

        modelBuilder.Entity<Company>()
            .HasIndex(e => e.Idtku)
            .IsUnique()
            .HasDatabaseName(DatabaseConstants.CompaniesIdtkuIndex);

        modelBuilder.Entity<TkaWorker>()
            .HasIndex(e => e.Passport)
            .IsUnique()
            .HasDatabaseName(DatabaseConstants.TkaWorkersPassportIndex);

        modelBuilder.Entity<Invoice>()
            .HasIndex(e => e.InvoiceNumber)
            .IsUnique()
            .HasDatabaseName(DatabaseConstants.InvoicesNumberIndex);

        modelBuilder.Entity<Setting>()
            .HasIndex(e => e.SettingKey)
            .IsUnique()
            .HasDatabaseName(DatabaseConstants.SettingsKeyIndex);

        // Performance indexes
        modelBuilder.Entity<Invoice>()
            .HasIndex(e => e.InvoiceDate)
            .HasDatabaseName(DatabaseConstants.InvoicesDateIndex);

        modelBuilder.Entity<Invoice>()
            .HasIndex(e => e.CompanyId)
            .HasDatabaseName(DatabaseConstants.InvoicesCompanyIndex);

        modelBuilder.Entity<Invoice>()
            .HasIndex(e => e.Status)
            .HasDatabaseName(DatabaseConstants.InvoicesStatusIndex);

        modelBuilder.Entity<InvoiceLine>()
            .HasIndex(e => e.InvoiceId)
            .HasDatabaseName(DatabaseConstants.InvoiceLinesInvoiceIndex);

        modelBuilder.Entity<InvoiceLine>()
            .HasIndex(e => e.TkaId)
            .HasDatabaseName(DatabaseConstants.InvoiceLinesTkaIndex);

        modelBuilder.Entity<InvoiceLine>()
            .HasIndex(e => e.JobDescriptionId)
            .HasDatabaseName(DatabaseConstants.InvoiceLinesJobIndex);

        modelBuilder.Entity<UserPreference>()
            .HasIndex(e => new { e.UserId, e.PreferenceKey })
            .IsUnique()
            .HasDatabaseName(DatabaseConstants.UserPreferencesUserKeyIndex);
    }

    private void ConfigureRelationships(ModelBuilder modelBuilder)
    {
        // Invoice -> Company
        modelBuilder.Entity<Invoice>()
            .HasOne(e => e.Company)
            .WithMany(e => e.Invoices)
            .HasForeignKey(e => e.CompanyId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName(DatabaseConstants.InvoicesCompanyFk);

        // Invoice -> User (CreatedBy)
        modelBuilder.Entity<Invoice>()
            .HasOne(e => e.CreatedByUser)
            .WithMany(e => e.CreatedInvoices)
            .HasForeignKey(e => e.CreatedBy)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName(DatabaseConstants.InvoicesCreatedByFk);

        // Invoice -> BankAccount
        modelBuilder.Entity<Invoice>()
            .HasOne(e => e.BankAccount)
            .WithMany(e => e.Invoices)
            .HasForeignKey(e => e.BankAccountId)
            .OnDelete(DeleteBehavior.SetNull)
            .HasConstraintName(DatabaseConstants.InvoicesBankAccountFk);

        // InvoiceLine -> Invoice
        modelBuilder.Entity<InvoiceLine>()
            .HasOne(e => e.Invoice)
            .WithMany(e => e.InvoiceLines)
            .HasForeignKey(e => e.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName(DatabaseConstants.InvoiceLinesInvoiceFk);

        // InvoiceLine -> TkaWorker
        modelBuilder.Entity<InvoiceLine>()
            .HasOne(e => e.TkaWorker)
            .WithMany(e => e.InvoiceLines)
            .HasForeignKey(e => e.TkaId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName(DatabaseConstants.InvoiceLinesTkaFk);

        // InvoiceLine -> JobDescription
        modelBuilder.Entity<InvoiceLine>()
            .HasOne(e => e.JobDescription)
            .WithMany(e => e.InvoiceLines)
            .HasForeignKey(e => e.JobDescriptionId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName(DatabaseConstants.InvoiceLinesJobFk);

        // JobDescription -> Company
        modelBuilder.Entity<JobDescription>()
            .HasOne(e => e.Company)
            .WithMany(e => e.JobDescriptions)
            .HasForeignKey(e => e.CompanyId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName(DatabaseConstants.JobDescriptionsCompanyFk);

        // CompanyTkaAssignment -> Company
        modelBuilder.Entity<CompanyTkaAssignment>()
            .HasOne(e => e.Company)
            .WithMany(e => e.CompanyTkaAssignments)
            .HasForeignKey(e => e.CompanyId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName(DatabaseConstants.CompanyTkaAssignmentsCompanyFk);

        // CompanyTkaAssignment -> TkaWorker
        modelBuilder.Entity<CompanyTkaAssignment>()
            .HasOne(e => e.TkaWorker)
            .WithMany(e => e.CompanyTkaAssignments)
            .HasForeignKey(e => e.TkaId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName(DatabaseConstants.CompanyTkaAssignmentsTkaFk);

        // TkaFamilyMember -> TkaWorker
        modelBuilder.Entity<TkaFamilyMember>()
            .HasOne(e => e.TkaWorker)
            .WithMany(e => e.FamilyMembers)
            .HasForeignKey(e => e.TkaId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName(DatabaseConstants.TkaFamilyMembersTkaFk);

        // UserPreference -> User
        modelBuilder.Entity<UserPreference>()
            .HasOne(e => e.User)
            .WithMany(e => e.UserPreferences)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName(DatabaseConstants.UserPreferencesUserFk);

        // ImportLog -> User
        modelBuilder.Entity<ImportLog>()
            .HasOne(e => e.ImportedByUser)
            .WithMany(e => e.ImportLogs)
            .HasForeignKey(e => e.ImportedBy)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName(DatabaseConstants.ImportLogsUserFk);
    }

    private void ConfigureConstraints(ModelBuilder modelBuilder)
    {
        // Check constraints for positive amounts
        modelBuilder.Entity<Invoice>()
            .HasCheckConstraint(DatabaseConstants.InvoicesSubtotalCheck, "subtotal >= 0");

        modelBuilder.Entity<Invoice>()
            .HasCheckConstraint(DatabaseConstants.InvoicesVatAmountCheck, "vat_amount >= 0");

        modelBuilder.Entity<Invoice>()
            .HasCheckConstraint(DatabaseConstants.InvoicesTotalAmountCheck, "total_amount >= 0");

        modelBuilder.Entity<InvoiceLine>()
            .HasCheckConstraint(DatabaseConstants.InvoiceLinesQuantityCheck, "quantity > 0");

        modelBuilder.Entity<InvoiceLine>()
            .HasCheckConstraint(DatabaseConstants.InvoiceLinesUnitPriceCheck, "unit_price >= 0");

        modelBuilder.Entity<InvoiceLine>()
            .HasCheckConstraint(DatabaseConstants.InvoiceLinesLineTotalCheck, "line_total >= 0");

        modelBuilder.Entity<JobDescription>()
            .HasCheckConstraint(DatabaseConstants.JobDescriptionsPriceCheck, "price >= 0");
    }

    private void SeedDefaultData(ModelBuilder modelBuilder)
    {
        // Seed default admin user
        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = 1,
                UserUuid = Guid.NewGuid(),
                Username = "admin",
                PasswordHash = "AQAAAAEAACcQAAAAEGl9l0jL8oO9Z6x1X5k5j5g5j5g5j5g5j5g5j5g5j5g5j5g5j5g5j5g5j5g5j5g5jg==", // "admin123"
                Role = UserRole.Admin,
                FullName = "System Administrator",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        );

        // Seed default settings
        modelBuilder.Entity<Setting>().HasData(
            new Setting { Id = 1, SettingKey = "company_name", SettingValue = AppConstants.CompanyName, Description = "Main company name for invoice headers", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Setting { Id = 2, SettingKey = "company_tagline", SettingValue = AppConstants.CompanyTagline, Description = "Company tagline for invoice headers", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Setting { Id = 3, SettingKey = "default_vat_percentage", SettingValue = AppConstants.DefaultVatPercentage.ToString(), Description = "Default VAT percentage for new invoices", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Setting { Id = 4, SettingKey = "invoice_place", SettingValue = AppConstants.DefaultInvoicePlace, Description = "Default place for invoice date", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Setting { Id = 5, SettingKey = "invoice_number_format", SettingValue = AppConstants.DefaultInvoiceNumberFormat, Description = "Format for auto-generated invoice numbers", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );

        // Seed default bank account
        modelBuilder.Entity<BankAccount>().HasData(
            new BankAccount
            {
                Id = 1,
                BankUuid = Guid.NewGuid(),
                BankName = "Bank Mandiri",
                AccountNumber = "1234567890",
                AccountName = "PT. FORTUNA SADA NIOGA",
                BranchName = "Jakarta Pusat",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        );
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            // Fallback connection string for development
            optionsBuilder.UseNpgsql("Host=localhost;Database=invoice_management;Username=postgres;Password=password");
        }

        // Enable sensitive data logging in development
        optionsBuilder.EnableSensitiveDataLogging();
        optionsBuilder.EnableDetailedErrors();
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Update timestamps before saving
        var entries = ChangeTracker.Entries()
            .Where(e => e.Entity is ITimestampedEntity && 
                       (e.State == EntityState.Added || e.State == EntityState.Modified));

        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Added)
            {
                ((ITimestampedEntity)entry.Entity).CreatedAt = DateTime.UtcNow;
            }
            ((ITimestampedEntity)entry.Entity).UpdatedAt = DateTime.UtcNow;
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}

// Interface for entities with timestamps
public interface ITimestampedEntity
{
    DateTime CreatedAt { get; set; }
    DateTime UpdatedAt { get; set; }
}