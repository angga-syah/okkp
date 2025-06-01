using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using InvoiceApp.Core.Entities;

namespace InvoiceApp.Infrastructure.Data.Configurations
{
    /// <summary>
    /// Entity Framework configuration for Company entity
    /// Defines table structure, relationships, and constraints
    /// </summary>
    public class CompanyConfiguration : IEntityTypeConfiguration<Company>
    {
        public void Configure(EntityTypeBuilder<Company> builder)
        {
            // Table configuration
            builder.ToTable("companies");

            // Primary Key
            builder.HasKey(c => c.Id);

            // Properties configuration
            builder.Property(c => c.Id)
                .HasColumnName("id")
                .ValueGeneratedOnAdd();

            builder.Property(c => c.CompanyUuid)
                .HasColumnName("company_uuid")
                .IsRequired()
                .HasDefaultValueSql("uuid_generate_v4()");

            builder.Property(c => c.CompanyName)
                .HasColumnName("company_name")
                .IsRequired()
                .HasMaxLength(200);

            builder.Property(c => c.Npwp)
                .HasColumnName("npwp")
                .IsRequired()
                .HasMaxLength(20);

            builder.Property(c => c.Idtku)
                .HasColumnName("idtku")
                .IsRequired()
                .HasMaxLength(20);

            builder.Property(c => c.Address)
                .HasColumnName("address")
                .IsRequired()
                .HasColumnType("text");

            builder.Property(c => c.Email)
                .HasColumnName("email")
                .HasMaxLength(100);

            builder.Property(c => c.Phone)
                .HasColumnName("phone")
                .HasMaxLength(20);

            builder.Property(c => c.ContactPerson)
                .HasColumnName("contact_person")
                .HasMaxLength(100);

            builder.Property(c => c.IsActive)
                .HasColumnName("is_active")
                .HasDefaultValue(true);

            builder.Property(c => c.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.Property(c => c.UpdatedAt)
                .HasColumnName("updated_at")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Indexes
            builder.HasIndex(c => c.CompanyUuid)
                .IsUnique()
                .HasDatabaseName("idx_companies_uuid");

            builder.HasIndex(c => c.Npwp)
                .IsUnique()
                .HasDatabaseName("idx_companies_npwp");

            builder.HasIndex(c => c.Idtku)
                .IsUnique()
                .HasDatabaseName("idx_companies_idtku");

            builder.HasIndex(c => c.CompanyName)
                .HasDatabaseName("idx_companies_name");

            builder.HasIndex(c => c.IsActive)
                .HasDatabaseName("idx_companies_active");

            // Full-text search index for company search
            builder.HasIndex(c => new { c.CompanyName, c.Npwp, c.ContactPerson })
                .HasDatabaseName("idx_companies_search");

            // Relationships
            builder.HasMany(c => c.JobDescriptions)
                .WithOne(j => j.Company)
                .HasForeignKey(j => j.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(c => c.Invoices)
                .WithOne(i => i.Company)
                .HasForeignKey(i => i.CompanyId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasMany(c => c.CompanyTkaAssignments)
                .WithOne(a => a.Company)
                .HasForeignKey(a => a.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            // Constraints
            builder.ToTable(t =>
            {
                t.HasCheckConstraint("chk_companies_npwp", "LENGTH(npwp) >= 15");
                t.HasCheckConstraint("chk_companies_idtku", "LENGTH(idtku) >= 15");
                t.HasCheckConstraint("chk_companies_email", "email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$' OR email IS NULL");
            });

            // Seed data
            builder.HasData(
                new Company
                {
                    Id = 1,
                    CompanyName = "PT. Contoh Perusahaan",
                    Npwp = "12.345.678.9-123.000",
                    Idtku = "12.345.678.9-123.000",
                    Address = "Jl. Contoh No. 123, Jakarta Pusat, DKI Jakarta 10110",
                    Email = "info@contohperusahaan.com",
                    Phone = "+62 21 1234567",
                    ContactPerson = "John Doe",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            );
        }
    }
}