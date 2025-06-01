using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using InvoiceApp.Core.Entities;

namespace InvoiceApp.Infrastructure.Data.Configurations
{
    /// <summary>
    /// Entity Framework configuration for TkaWorker entity
    /// Defines table structure, relationships, and constraints for TKA workers
    /// </summary>
    public class TkaWorkerConfiguration : IEntityTypeConfiguration<TkaWorker>
    {
        public void Configure(EntityTypeBuilder<TkaWorker> builder)
        {
            // Table configuration
            builder.ToTable("tka_workers");

            // Primary Key
            builder.HasKey(t => t.Id);

            // Properties configuration
            builder.Property(t => t.Id)
                .HasColumnName("id")
                .ValueGeneratedOnAdd();

            builder.Property(t => t.TkaUuid)
                .HasColumnName("tka_uuid")
                .IsRequired()
                .HasDefaultValueSql("uuid_generate_v4()");

            builder.Property(t => t.Nama)
                .HasColumnName("nama")
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(t => t.Passport)
                .HasColumnName("passport")
                .IsRequired()
                .HasMaxLength(20);

            builder.Property(t => t.Divisi)
                .HasColumnName("divisi")
                .HasMaxLength(100);

            builder.Property(t => t.JenisKelamin)
                .HasColumnName("jenis_kelamin")
                .IsRequired()
                .HasMaxLength(20)
                .HasDefaultValue("Laki-laki")
                .HasConversion<string>();

            builder.Property(t => t.IsActive)
                .HasColumnName("is_active")
                .HasDefaultValue(true);

            builder.Property(t => t.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.Property(t => t.UpdatedAt)
                .HasColumnName("updated_at")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Additional properties for enhanced functionality
            builder.Property(t => t.DateOfBirth)
                .HasColumnName("date_of_birth")
                .HasColumnType("date");

            builder.Property(t => t.PlaceOfBirth)
                .HasColumnName("place_of_birth")
                .HasMaxLength(100);

            builder.Property(t => t.Nationality)
                .HasColumnName("nationality")
                .HasMaxLength(50)
                .HasDefaultValue("Indonesia");

            builder.Property(t => t.Religion)
                .HasColumnName("religion")
                .HasMaxLength(50);

            builder.Property(t => t.MaritalStatus)
                .HasColumnName("marital_status")
                .HasMaxLength(20)
                .HasDefaultValue("Single");

            builder.Property(t => t.EducationLevel)
                .HasColumnName("education_level")
                .HasMaxLength(50);

            builder.Property(t => t.Skills)
                .HasColumnName("skills")
                .HasColumnType("text");

            builder.Property(t => t.Experience)
                .HasColumnName("experience")
                .HasMaxLength(500);

            builder.Property(t => t.ContactNumber)
                .HasColumnName("contact_number")
                .HasMaxLength(20);

            builder.Property(t => t.EmergencyContact)
                .HasColumnName("emergency_contact")
                .HasMaxLength(100);

            builder.Property(t => t.EmergencyPhone)
                .HasColumnName("emergency_phone")
                .HasMaxLength(20);

            builder.Property(t => t.Address)
                .HasColumnName("address")
                .HasColumnType("text");

            builder.Property(t => t.Notes)
                .HasColumnName("notes")
                .HasColumnType("text");

            builder.Property(t => t.ProfilePhotoPath)
                .HasColumnName("profile_photo_path")
                .HasMaxLength(500);

            builder.Property(t => t.DocumentsPath)
                .HasColumnName("documents_path")
                .HasMaxLength(500);

            // Indexes
            builder.HasIndex(t => t.TkaUuid)
                .IsUnique()
                .HasDatabaseName("idx_tka_workers_uuid");

            builder.HasIndex(t => t.Passport)
                .IsUnique()
                .HasDatabaseName("idx_tka_workers_passport");

            builder.HasIndex(t => t.Nama)
                .HasDatabaseName("idx_tka_workers_nama");

            builder.HasIndex(t => t.Divisi)
                .HasDatabaseName("idx_tka_workers_divisi");

            builder.HasIndex(t => t.JenisKelamin)
                .HasDatabaseName("idx_tka_workers_gender");

            builder.HasIndex(t => t.IsActive)
                .HasDatabaseName("idx_tka_workers_active");

            builder.HasIndex(t => t.Nationality)
                .HasDatabaseName("idx_tka_workers_nationality");

            // Full-text search index for TKA search functionality
            builder.HasIndex(t => new { t.Nama, t.Passport, t.Divisi })
                .HasDatabaseName("idx_tka_workers_search");

            // Composite indexes for common queries
            builder.HasIndex(t => new { t.IsActive, t.Divisi })
                .HasDatabaseName("idx_tka_workers_active_divisi");

            builder.HasIndex(t => new { t.JenisKelamin, t.IsActive })
                .HasDatabaseName("idx_tka_workers_gender_active");

            // Relationships
            builder.HasMany(t => t.FamilyMembers)
                .WithOne(f => f.TkaWorker)
                .HasForeignKey(f => f.TkaId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(t => t.CompanyAssignments)
                .WithOne(a => a.TkaWorker)
                .HasForeignKey(a => a.TkaId)
                .OnDelete(DeleteBehavior.Cascade);

            // Constraints
            builder.ToTable(t =>
            {
                t.HasCheckConstraint("chk_tka_workers_gender", 
                    "jenis_kelamin IN ('Laki-laki', 'Perempuan')");
                
                t.HasCheckConstraint("chk_tka_workers_passport", 
                    "LENGTH(passport) >= 6");
                
                t.HasCheckConstraint("chk_tka_workers_marital", 
                    "marital_status IS NULL OR marital_status IN ('Single', 'Married', 'Divorced', 'Widowed')");
                
                t.HasCheckConstraint("chk_tka_workers_contact", 
                    "contact_number IS NULL OR contact_number ~ '^[+]?[0-9\\s\\-\\(\\)]+$'");
                
                t.HasCheckConstraint("chk_tka_workers_emergency_phone", 
                    "emergency_phone IS NULL OR emergency_phone ~ '^[+]?[0-9\\s\\-\\(\\)]+$'");
            });

            // Seed data
            builder.HasData(
                new TkaWorker
                {
                    Id = 1,
                    Nama = "Ahmad Sugiarto",
                    Passport = "A1234567",
                    Divisi = "Construction",
                    JenisKelamin = Core.Enums.Gender.LakiLaki,
                    Nationality = "Indonesia",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new TkaWorker
                {
                    Id = 2,
                    Nama = "Siti Nurhaliza",
                    Passport = "B9876543",
                    Divisi = "Healthcare",
                    JenisKelamin = Core.Enums.Gender.Perempuan,
                    Nationality = "Indonesia",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            );
        }
    }

    /// <summary>
    /// Entity Framework configuration for TkaFamilyMember entity
    /// </summary>
    public class TkaFamilyMemberConfiguration : IEntityTypeConfiguration<TkaFamilyMember>
    {
        public void Configure(EntityTypeBuilder<TkaFamilyMember> builder)
        {
            // Table configuration
            builder.ToTable("tka_family_members");

            // Primary Key
            builder.HasKey(f => f.Id);

            // Properties configuration
            builder.Property(f => f.Id)
                .HasColumnName("id")
                .ValueGeneratedOnAdd();

            builder.Property(f => f.FamilyUuid)
                .HasColumnName("family_uuid")
                .IsRequired()
                .HasDefaultValueSql("uuid_generate_v4()");

            builder.Property(f => f.TkaId)
                .HasColumnName("tka_id")
                .IsRequired();

            builder.Property(f => f.Nama)
                .HasColumnName("nama")
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(f => f.Passport)
                .HasColumnName("passport")
                .IsRequired()
                .HasMaxLength(20);

            builder.Property(f => f.JenisKelamin)
                .HasColumnName("jenis_kelamin")
                .IsRequired()
                .HasMaxLength(20)
                .HasDefaultValue("Laki-laki")
                .HasConversion<string>();

            builder.Property(f => f.Relationship)
                .HasColumnName("relationship")
                .IsRequired()
                .HasMaxLength(20)
                .HasDefaultValue("spouse")
                .HasConversion<string>();

            builder.Property(f => f.IsActive)
                .HasColumnName("is_active")
                .HasDefaultValue(true);

            builder.Property(f => f.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Additional properties for family members
            builder.Property(f => f.DateOfBirth)
                .HasColumnName("date_of_birth")
                .HasColumnType("date");

            builder.Property(f => f.PlaceOfBirth)
                .HasColumnName("place_of_birth")
                .HasMaxLength(100);

            builder.Property(f => f.Nationality)
                .HasColumnName("nationality")
                .HasMaxLength(50)
                .HasDefaultValue("Indonesia");

            builder.Property(f => f.EducationLevel)
                .HasColumnName("education_level")
                .HasMaxLength(50);

            builder.Property(f => f.Occupation)
                .HasColumnName("occupation")
                .HasMaxLength(100);

            builder.Property(f => f.ContactNumber)
                .HasColumnName("contact_number")
                .HasMaxLength(20);

            builder.Property(f => f.Notes)
                .HasColumnName("notes")
                .HasColumnType("text");

            // Indexes
            builder.HasIndex(f => f.FamilyUuid)
                .IsUnique()
                .HasDatabaseName("idx_tka_family_uuid");

            builder.HasIndex(f => f.TkaId)
                .HasDatabaseName("idx_tka_family_tka_id");

            builder.HasIndex(f => f.Passport)
                .HasDatabaseName("idx_tka_family_passport");

            builder.HasIndex(f => f.Relationship)
                .HasDatabaseName("idx_tka_family_relationship");

            builder.HasIndex(f => f.IsActive)
                .HasDatabaseName("idx_tka_family_active");

            // Composite indexes
            builder.HasIndex(f => new { f.TkaId, f.Relationship })
                .HasDatabaseName("idx_tka_family_tka_relationship");

            builder.HasIndex(f => new { f.TkaId, f.IsActive })
                .HasDatabaseName("idx_tka_family_tka_active");

            // Full-text search for family members
            builder.HasIndex(f => new { f.Nama, f.Passport })
                .HasDatabaseName("idx_tka_family_search");

            // Relationships
            builder.HasOne(f => f.TkaWorker)
                .WithMany(t => t.FamilyMembers)
                .HasForeignKey(f => f.TkaId)
                .OnDelete(DeleteBehavior.Cascade);

            // Constraints
            builder.ToTable(t =>
            {
                t.HasCheckConstraint("chk_tka_family_gender", 
                    "jenis_kelamin IN ('Laki-laki', 'Perempuan')");
                
                t.HasCheckConstraint("chk_tka_family_relationship", 
                    "relationship IN ('spouse', 'parent', 'child')");
                
                t.HasCheckConstraint("chk_tka_family_passport", 
                    "LENGTH(passport) >= 6");
                
                t.HasCheckConstraint("chk_tka_family_contact", 
                    "contact_number IS NULL OR contact_number ~ '^[+]?[0-9\\s\\-\\(\\)]+$'");
            });

            // Business rule: Only one spouse per TKA worker
            builder.HasIndex(f => new { f.TkaId, f.Relationship })
                .IsUnique()
                .HasFilter("relationship = 'spouse' AND is_active = true")
                .HasDatabaseName("idx_tka_family_unique_spouse");
        }
    }

    /// <summary>
    /// Entity Framework configuration for CompanyTkaAssignment entity
    /// </summary>
    public class CompanyTkaAssignmentConfiguration : IEntityTypeConfiguration<CompanyTkaAssignment>
    {
        public void Configure(EntityTypeBuilder<CompanyTkaAssignment> builder)
        {
            // Table configuration
            builder.ToTable("company_tka_assignments");

            // Primary Key
            builder.HasKey(a => a.Id);

            // Properties configuration
            builder.Property(a => a.Id)
                .HasColumnName("id")
                .ValueGeneratedOnAdd();

            builder.Property(a => a.CompanyId)
                .HasColumnName("company_id")
                .IsRequired();

            builder.Property(a => a.TkaId)
                .HasColumnName("tka_id")
                .IsRequired();

            builder.Property(a => a.AssignmentDate)
                .HasColumnName("assignment_date")
                .HasColumnType("date")
                .HasDefaultValueSql("CURRENT_DATE");

            builder.Property(a => a.EndDate)
                .HasColumnName("end_date")
                .HasColumnType("date");

            builder.Property(a => a.IsActive)
                .HasColumnName("is_active")
                .HasDefaultValue(true);

            builder.Property(a => a.Notes)
                .HasColumnName("notes")
                .HasColumnType("text");

            builder.Property(a => a.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Additional assignment properties
            builder.Property(a => a.Position)
                .HasColumnName("position")
                .HasMaxLength(100);

            builder.Property(a => a.Department)
                .HasColumnName("department")
                .HasMaxLength(100);

            builder.Property(a => a.Salary)
                .HasColumnName("salary")
                .HasColumnType("decimal(15,2)");

            builder.Property(a => a.ContractType)
                .HasColumnName("contract_type")
                .HasMaxLength(50)
                .HasDefaultValue("Permanent");

            builder.Property(a => a.WorkLocation)
                .HasColumnName("work_location")
                .HasMaxLength(200);

            // Indexes
            builder.HasIndex(a => a.CompanyId)
                .HasDatabaseName("idx_assignments_company");

            builder.HasIndex(a => a.TkaId)
                .HasDatabaseName("idx_assignments_tka");

            builder.HasIndex(a => a.IsActive)
                .HasDatabaseName("idx_assignments_active");

            builder.HasIndex(a => a.AssignmentDate)
                .HasDatabaseName("idx_assignments_date");

            // Composite indexes
            builder.HasIndex(a => new { a.CompanyId, a.TkaId, a.AssignmentDate })
                .IsUnique()
                .HasDatabaseName("idx_assignments_unique");

            builder.HasIndex(a => new { a.CompanyId, a.IsActive })
                .HasDatabaseName("idx_assignments_company_active");

            builder.HasIndex(a => new { a.TkaId, a.IsActive })
                .HasDatabaseName("idx_assignments_tka_active");

            // Relationships
            builder.HasOne(a => a.Company)
                .WithMany(c => c.CompanyTkaAssignments)
                .HasForeignKey(a => a.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(a => a.TkaWorker)
                .WithMany(t => t.CompanyAssignments)
                .HasForeignKey(a => a.TkaId)
                .OnDelete(DeleteBehavior.Cascade);

            // Constraints
            builder.ToTable(t =>
            {
                t.HasCheckConstraint("chk_assignments_dates", 
                    "end_date IS NULL OR end_date >= assignment_date");
                
                t.HasCheckConstraint("chk_assignments_salary", 
                    "salary IS NULL OR salary >= 0");
                
                t.HasCheckConstraint("chk_assignments_contract_type", 
                    "contract_type IS NULL OR contract_type IN ('Permanent', 'Contract', 'Temporary', 'Freelance')");
            });

            // Computed column for assignment status
            builder.Property<bool>("IsCurrentlyActive")
                .HasColumnName("is_currently_active")
                .HasComputedColumnSql("is_active = true AND (end_date IS NULL OR end_date >= CURRENT_DATE)", stored: true);
        }
    }
}