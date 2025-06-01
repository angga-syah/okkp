using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using InvoiceApp.Core.Entities;

namespace InvoiceApp.Infrastructure.Data.Configurations
{
    /// <summary>
    /// Entity Framework configuration for Invoice and InvoiceLine entities
    /// Defines table structure, relationships, and business constraints
    /// </summary>
    public class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
    {
        public void Configure(EntityTypeBuilder<Invoice> builder)
        {
            // Table configuration
            builder.ToTable("invoices");

            // Primary Key
            builder.HasKey(i => i.Id);

            // Properties configuration
            builder.Property(i => i.Id)
                .HasColumnName("id")
                .ValueGeneratedOnAdd();

            builder.Property(i => i.InvoiceUuid)
                .HasColumnName("invoice_uuid")
                .IsRequired()
                .HasDefaultValueSql("uuid_generate_v4()");

            builder.Property(i => i.InvoiceNumber)
                .HasColumnName("invoice_number")
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(i => i.CompanyId)
                .HasColumnName("company_id")
                .IsRequired();

            builder.Property(i => i.InvoiceDate)
                .HasColumnName("invoice_date")
                .IsRequired()
                .HasColumnType("date");

            builder.Property(i => i.DueDate)
                .HasColumnName("due_date")
                .HasColumnType("date");

            builder.Property(i => i.Subtotal)
                .HasColumnName("subtotal")
                .HasColumnType("decimal(15,2)")
                .HasDefaultValue(0m);

            builder.Property(i => i.VatPercentage)
                .HasColumnName("vat_percentage")
                .HasColumnType("decimal(5,2)")
                .HasDefaultValue(11.00m);

            builder.Property(i => i.VatAmount)
                .HasColumnName("vat_amount")
                .HasColumnType("decimal(15,2)")
                .HasDefaultValue(0m);

            builder.Property(i => i.TotalAmount)
                .HasColumnName("total_amount")
                .HasColumnType("decimal(15,2)")
                .HasDefaultValue(0m);

            builder.Property(i => i.Status)
                .HasColumnName("status")
                .HasMaxLength(20)
                .HasDefaultValue("draft")
                .HasConversion<string>();

            builder.Property(i => i.Notes)
                .HasColumnName("notes")
                .HasColumnType("text");

            builder.Property(i => i.BankAccountId)
                .HasColumnName("bank_account_id");

            builder.Property(i => i.PrintedCount)
                .HasColumnName("printed_count")
                .HasDefaultValue(0);

            builder.Property(i => i.LastPrintedAt)
                .HasColumnName("last_printed_at");

            builder.Property(i => i.ImportedFrom)
                .HasColumnName("imported_from")
                .HasMaxLength(100);

            builder.Property(i => i.ImportBatchId)
                .HasColumnName("import_batch_id")
                .HasMaxLength(50);

            builder.Property(i => i.CreatedBy)
                .HasColumnName("created_by")
                .IsRequired();

            builder.Property(i => i.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.Property(i => i.UpdatedAt)
                .HasColumnName("updated_at")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Indexes
            builder.HasIndex(i => i.InvoiceUuid)
                .IsUnique()
                .HasDatabaseName("idx_invoices_uuid");

            builder.HasIndex(i => i.InvoiceNumber)
                .IsUnique()
                .HasDatabaseName("idx_invoices_number");

            builder.HasIndex(i => i.CompanyId)
                .HasDatabaseName("idx_invoices_company");

            builder.HasIndex(i => i.Status)
                .HasDatabaseName("idx_invoices_status");

            builder.HasIndex(i => i.InvoiceDate)
                .HasDatabaseName("idx_invoices_date");

            builder.HasIndex(i => i.CreatedBy)
                .HasDatabaseName("idx_invoices_created_by");

            builder.HasIndex(i => i.ImportBatchId)
                .HasDatabaseName("idx_invoices_import_batch");

            // Composite indexes for common queries
            builder.HasIndex(i => new { i.CompanyId, i.InvoiceDate })
                .HasDatabaseName("idx_invoices_company_date");

            builder.HasIndex(i => new { i.Status, i.InvoiceDate })
                .HasDatabaseName("idx_invoices_status_date");

            builder.HasIndex(i => new { i.CreatedBy, i.InvoiceDate })
                .HasDatabaseName("idx_invoices_user_date");

            // Full-text search index
            builder.HasIndex(i => new { i.InvoiceNumber, i.Notes })
                .HasDatabaseName("idx_invoices_search");

            // Relationships
            builder.HasOne(i => i.Company)
                .WithMany(c => c.Invoices)
                .HasForeignKey(i => i.CompanyId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(i => i.CreatedByUser)
                .WithMany()
                .HasForeignKey(i => i.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(i => i.BankAccount)
                .WithMany()
                .HasForeignKey(i => i.BankAccountId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasMany(i => i.InvoiceLines)
                .WithOne(l => l.Invoice)
                .HasForeignKey(l => l.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);

            // Constraints
            builder.ToTable(t =>
            {
                t.HasCheckConstraint("chk_invoices_amounts", 
                    "subtotal >= 0 AND vat_amount >= 0 AND total_amount >= 0");
                
                t.HasCheckConstraint("chk_invoices_vat_percentage", 
                    "vat_percentage >= 0 AND vat_percentage <= 100");
                
                t.HasCheckConstraint("chk_invoices_printed_count", 
                    "printed_count >= 0");
                
                t.HasCheckConstraint("chk_invoices_dates", 
                    "due_date IS NULL OR due_date >= invoice_date");
                
                t.HasCheckConstraint("chk_invoices_status", 
                    "status IN ('draft', 'finalized', 'paid', 'cancelled')");
            });

            // Computed columns
            builder.Property<bool>("IsOverdue")
                .HasColumnName("is_overdue")
                .HasComputedColumnSql("due_date IS NOT NULL AND due_date < CURRENT_DATE AND status NOT IN ('paid', 'cancelled')", stored: true);

            builder.Property<int>("DaysOverdue")
                .HasColumnName("days_overdue")
                .HasComputedColumnSql("CASE WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE AND status NOT IN ('paid', 'cancelled') THEN EXTRACT(DAY FROM CURRENT_DATE - due_date)::int ELSE 0 END", stored: true);
        }
    }

    /// <summary>
    /// Entity Framework configuration for InvoiceLine entity
    /// </summary>
    public class InvoiceLineConfiguration : IEntityTypeConfiguration<InvoiceLine>
    {
        public void Configure(EntityTypeBuilder<InvoiceLine> builder)
        {
            // Table configuration
            builder.ToTable("invoice_lines");

            // Primary Key
            builder.HasKey(l => l.Id);

            // Properties configuration
            builder.Property(l => l.Id)
                .HasColumnName("id")
                .ValueGeneratedOnAdd();

            builder.Property(l => l.LineUuid)
                .HasColumnName("line_uuid")
                .IsRequired()
                .HasDefaultValueSql("uuid_generate_v4()");

            builder.Property(l => l.InvoiceId)
                .HasColumnName("invoice_id")
                .IsRequired();

            builder.Property(l => l.Baris)
                .HasColumnName("baris")
                .IsRequired();

            builder.Property(l => l.LineOrder)
                .HasColumnName("line_order")
                .IsRequired();

            builder.Property(l => l.TkaId)
                .HasColumnName("tka_id")
                .IsRequired();

            builder.Property(l => l.JobDescriptionId)
                .HasColumnName("job_description_id")
                .IsRequired();

            builder.Property(l => l.CustomJobName)
                .HasColumnName("custom_job_name")
                .HasMaxLength(200);

            builder.Property(l => l.CustomJobDescription)
                .HasColumnName("custom_job_description")
                .HasColumnType("text");

            builder.Property(l => l.CustomPrice)
                .HasColumnName("custom_price")
                .HasColumnType("decimal(15,2)");

            builder.Property(l => l.Quantity)
                .HasColumnName("quantity")
                .HasDefaultValue(1);

            builder.Property(l => l.UnitPrice)
                .HasColumnName("unit_price")
                .HasColumnType("decimal(15,2)")
                .IsRequired();

            builder.Property(l => l.LineTotal)
                .HasColumnName("line_total")
                .HasColumnType("decimal(15,2)")
                .IsRequired();

            builder.Property(l => l.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Indexes
            builder.HasIndex(l => l.LineUuid)
                .IsUnique()
                .HasDatabaseName("idx_invoice_lines_uuid");

            builder.HasIndex(l => l.InvoiceId)
                .HasDatabaseName("idx_invoice_lines_invoice");

            builder.HasIndex(l => l.TkaId)
                .HasDatabaseName("idx_invoice_lines_tka");

            builder.HasIndex(l => l.JobDescriptionId)
                .HasDatabaseName("idx_invoice_lines_job");

            // Composite indexes for sorting and grouping
            builder.HasIndex(l => new { l.InvoiceId, l.Baris, l.LineOrder })
                .HasDatabaseName("idx_invoice_lines_order");

            builder.HasIndex(l => new { l.TkaId, l.CreatedAt })
                .HasDatabaseName("idx_invoice_lines_tka_date");

            // Relationships
            builder.HasOne(l => l.Invoice)
                .WithMany(i => i.InvoiceLines)
                .HasForeignKey(l => l.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(l => l.TkaWorker)
                .WithMany()
                .HasForeignKey(l => l.TkaId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(l => l.JobDescription)
                .WithMany()
                .HasForeignKey(l => l.JobDescriptionId)
                .OnDelete(DeleteBehavior.Restrict);

            // Constraints
            builder.ToTable(t =>
            {
                t.HasCheckConstraint("chk_invoice_lines_amounts", 
                    "unit_price >= 0 AND line_total >= 0 AND (custom_price IS NULL OR custom_price >= 0)");
                
                t.HasCheckConstraint("chk_invoice_lines_quantity", 
                    "quantity > 0");
                
                t.HasCheckConstraint("chk_invoice_lines_baris", 
                    "baris > 0");
                
                t.HasCheckConstraint("chk_invoice_lines_order", 
                    "line_order > 0");
            });

            // Business rule: Line total should equal unit price * quantity
            builder.ToTable(t =>
            {
                t.HasCheckConstraint("chk_invoice_lines_total", 
                    "ABS(line_total - (unit_price * quantity)) < 0.01");
            });
        }
    }
}