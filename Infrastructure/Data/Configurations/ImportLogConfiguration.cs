using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using InvoiceApp.Core.Entities;

namespace InvoiceApp.Infrastructure.Data.Configurations
{
    /// <summary>
    /// Entity Framework configuration for ImportLog entity
    /// Tracks import operations, errors, and batch processing
    /// </summary>
    public class ImportLogConfiguration : IEntityTypeConfiguration<ImportLog>
    {
        public void Configure(EntityTypeBuilder<ImportLog> builder)
        {
            // Table configuration
            builder.ToTable("import_logs");

            // Primary Key
            builder.HasKey(l => l.Id);

            // Properties configuration
            builder.Property(l => l.Id)
                .HasColumnName("id")
                .ValueGeneratedOnAdd();

            builder.Property(l => l.LogUuid)
                .HasColumnName("log_uuid")
                .IsRequired()
                .HasDefaultValueSql("uuid_generate_v4()");

            builder.Property(l => l.ImportBatchId)
                .HasColumnName("import_batch_id")
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(l => l.FileName)
                .HasColumnName("file_name")
                .IsRequired()
                .HasMaxLength(255);

            builder.Property(l => l.FilePath)
                .HasColumnName("file_path")
                .HasMaxLength(500);

            builder.Property(l => l.FileSize)
                .HasColumnName("file_size")
                .HasDefaultValue(0);

            builder.Property(l => l.ImportType)
                .HasColumnName("import_type")
                .IsRequired()
                .HasMaxLength(50)
                .HasConversion<string>();

            builder.Property(l => l.TotalRecords)
                .HasColumnName("total_records")
                .HasDefaultValue(0);

            builder.Property(l => l.SuccessRecords)
                .HasColumnName("success_records")
                .HasDefaultValue(0);

            builder.Property(l => l.FailedRecords)
                .HasColumnName("failed_records")
                .HasDefaultValue(0);

            builder.Property(l => l.SkippedRecords)
                .HasColumnName("skipped_records")
                .HasDefaultValue(0);

            builder.Property(l => l.ProcessingTimeMs)
                .HasColumnName("processing_time_ms")
                .HasDefaultValue(0);

            builder.Property(l => l.Status)
                .HasColumnName("status")
                .IsRequired()
                .HasMaxLength(20)
                .HasDefaultValue("pending");

            builder.Property(l => l.ErrorMessage)
                .HasColumnName("error_message")
                .HasColumnType("text");

            builder.Property(l => l.ErrorDetails)
                .HasColumnName("error_details")
                .HasColumnType("jsonb");

            builder.Property(l => l.ImportSettings)
                .HasColumnName("import_settings")
                .HasColumnType("jsonb");

            builder.Property(l => l.ValidationErrors)
                .HasColumnName("validation_errors")
                .HasColumnType("jsonb");

            builder.Property(l => l.ImportedBy)
                .HasColumnName("imported_by")
                .IsRequired();

            builder.Property(l => l.StartedAt)
                .HasColumnName("started_at")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.Property(l => l.CompletedAt)
                .HasColumnName("completed_at");

            builder.Property(l => l.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Indexes
            builder.HasIndex(l => l.LogUuid)
                .IsUnique()
                .HasDatabaseName("idx_import_logs_uuid");

            builder.HasIndex(l => l.ImportBatchId)
                .HasDatabaseName("idx_import_logs_batch");

            builder.HasIndex(l => l.Status)
                .HasDatabaseName("idx_import_logs_status");

            builder.HasIndex(l => l.ImportType)
                .HasDatabaseName("idx_import_logs_type");

            builder.HasIndex(l => l.ImportedBy)
                .HasDatabaseName("idx_import_logs_user");

            builder.HasIndex(l => l.StartedAt)
                .HasDatabaseName("idx_import_logs_started");

            builder.HasIndex(l => new { l.Status, l.StartedAt })
                .HasDatabaseName("idx_import_logs_status_started");

            // For searching and filtering
            builder.HasIndex(l => new { l.FileName, l.ImportType, l.Status })
                .HasDatabaseName("idx_import_logs_search");

            // Relationships
            builder.HasOne(l => l.ImportedByUser)
                .WithMany()
                .HasForeignKey(l => l.ImportedBy)
                .OnDelete(DeleteBehavior.Restrict);

            // Constraints
            builder.ToTable(t =>
            {
                t.HasCheckConstraint("chk_import_logs_records", 
                    "total_records >= 0 AND success_records >= 0 AND failed_records >= 0 AND skipped_records >= 0");
                
                t.HasCheckConstraint("chk_import_logs_records_sum", 
                    "success_records + failed_records + skipped_records <= total_records");
                
                t.HasCheckConstraint("chk_import_logs_status", 
                    "status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')");
                
                t.HasCheckConstraint("chk_import_logs_processing_time", 
                    "processing_time_ms >= 0");
                
                t.HasCheckConstraint("chk_import_logs_file_size", 
                    "file_size >= 0");
                
                t.HasCheckConstraint("chk_import_logs_dates", 
                    "completed_at IS NULL OR completed_at >= started_at");
            });

            // Computed columns
            builder.Property<decimal>("SuccessRate")
                .HasColumnName("success_rate")
                .HasComputedColumnSql("CASE WHEN total_records > 0 THEN ROUND((success_records::decimal / total_records::decimal) * 100, 2) ELSE 0 END", stored: true);

            builder.Property<bool>("HasErrors")
                .HasColumnName("has_errors")
                .HasComputedColumnSql("failed_records > 0 OR error_message IS NOT NULL", stored: true);

            // Triggers for automatic updates (to be created via migration)
            // - Update completed_at when status changes to 'completed' or 'failed'
            // - Calculate processing_time_ms automatically
            // - Auto-cleanup old logs (configurable retention period)
        }
    }
}