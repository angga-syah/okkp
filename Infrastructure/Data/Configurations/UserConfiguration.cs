using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using InvoiceApp.Core.Entities;

namespace InvoiceApp.Infrastructure.Data.Configurations
{
    /// <summary>
    /// Entity Framework configuration for User entity
    /// Defines table structure, relationships, and security constraints
    /// </summary>
    public class UserConfiguration : IEntityTypeConfiguration<User>
    {
        public void Configure(EntityTypeBuilder<User> builder)
        {
            // Table configuration
            builder.ToTable("users");

            // Primary Key
            builder.HasKey(u => u.Id);

            // Properties configuration
            builder.Property(u => u.Id)
                .HasColumnName("id")
                .ValueGeneratedOnAdd();

            builder.Property(u => u.UserUuid)
                .HasColumnName("user_uuid")
                .IsRequired()
                .HasDefaultValueSql("uuid_generate_v4()");

            builder.Property(u => u.Username)
                .HasColumnName("username")
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(u => u.PasswordHash)
                .HasColumnName("password_hash")
                .IsRequired()
                .HasMaxLength(255);

            builder.Property(u => u.Role)
                .HasColumnName("role")
                .IsRequired()
                .HasMaxLength(20)
                .HasDefaultValue("viewer")
                .HasConversion<string>();

            builder.Property(u => u.FullName)
                .HasColumnName("full_name")
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(u => u.IsActive)
                .HasColumnName("is_active")
                .HasDefaultValue(true);

            builder.Property(u => u.LastLogin)
                .HasColumnName("last_login");

            builder.Property(u => u.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.Property(u => u.UpdatedAt)
                .HasColumnName("updated_at")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Additional user properties for enhanced functionality
            builder.Property(u => u.Email)
                .HasColumnName("email")
                .HasMaxLength(100);

            builder.Property(u => u.PhoneNumber)
                .HasColumnName("phone_number")
                .HasMaxLength(20);

            builder.Property(u => u.Department)
                .HasColumnName("department")
                .HasMaxLength(100);

            builder.Property(u => u.Position)
                .HasColumnName("position")
                .HasMaxLength(100);

            builder.Property(u => u.EmployeeId)
                .HasColumnName("employee_id")
                .HasMaxLength(50);

            builder.Property(u => u.ProfilePicturePath)
                .HasColumnName("profile_picture_path")
                .HasMaxLength(500);

            builder.Property(u => u.Notes)
                .HasColumnName("notes")
                .HasColumnType("text");

            // Security and audit properties
            builder.Property(u => u.PasswordChangedAt)
                .HasColumnName("password_changed_at");

            builder.Property(u => u.FailedLoginAttempts)
                .HasColumnName("failed_login_attempts")
                .HasDefaultValue(0);

            builder.Property(u => u.LastFailedLogin)
                .HasColumnName("last_failed_login");

            builder.Property(u => u.AccountLockedUntil)
                .HasColumnName("account_locked_until");

            builder.Property(u => u.MustChangePassword)
                .HasColumnName("must_change_password")
                .HasDefaultValue(false);

            builder.Property(u => u.TwoFactorEnabled)
                .HasColumnName("two_factor_enabled")
                .HasDefaultValue(false);

            builder.Property(u => u.TwoFactorSecret)
                .HasColumnName("two_factor_secret")
                .HasMaxLength(100);

            builder.Property(u => u.LoginCount)
                .HasColumnName("login_count")
                .HasDefaultValue(0);

            builder.Property(u => u.SessionToken)
                .HasColumnName("session_token")
                .HasMaxLength(255);

            builder.Property(u => u.SessionExpiresAt)
                .HasColumnName("session_expires_at");

            builder.Property(u => u.PasswordResetToken)
                .HasColumnName("password_reset_token")
                .HasMaxLength(255);

            builder.Property(u => u.PasswordResetExpiresAt)
                .HasColumnName("password_reset_expires_at");

            builder.Property(u => u.EmailVerified)
                .HasColumnName("email_verified")
                .HasDefaultValue(false);

            builder.Property(u => u.EmailVerificationToken)
                .HasColumnName("email_verification_token")
                .HasMaxLength(255);

            // Preferences and settings
            builder.Property(u => u.Language)
                .HasColumnName("language")
                .HasMaxLength(10)
                .HasDefaultValue("en");

            builder.Property(u => u.Timezone)
                .HasColumnName("timezone")
                .HasMaxLength(50)
                .HasDefaultValue("UTC");

            builder.Property(u => u.DateFormat)
                .HasColumnName("date_format")
                .HasMaxLength(20)
                .HasDefaultValue("dd/MM/yyyy");

            builder.Property(u => u.NumberFormat)
                .HasColumnName("number_format")
                .HasMaxLength(20)
                .HasDefaultValue("1,234.56");

            builder.Property(u => u.Theme)
                .HasColumnName("theme")
                .HasMaxLength(20)
                .HasDefaultValue("light");

            // Indexes
            builder.HasIndex(u => u.UserUuid)
                .IsUnique()
                .HasDatabaseName("idx_users_uuid");

            builder.HasIndex(u => u.Username)
                .IsUnique()
                .HasDatabaseName("idx_users_username");

            builder.HasIndex(u => u.Email)
                .IsUnique()
                .HasFilter("email IS NOT NULL")
                .HasDatabaseName("idx_users_email");

            builder.HasIndex(u => u.EmployeeId)
                .IsUnique()
                .HasFilter("employee_id IS NOT NULL")
                .HasDatabaseName("idx_users_employee_id");

            builder.HasIndex(u => u.Role)
                .HasDatabaseName("idx_users_role");

            builder.HasIndex(u => u.IsActive)
                .HasDatabaseName("idx_users_active");

            builder.HasIndex(u => u.Department)
                .HasDatabaseName("idx_users_department");

            builder.HasIndex(u => u.LastLogin)
                .HasDatabaseName("idx_users_last_login");

            builder.HasIndex(u => u.CreatedAt)
                .HasDatabaseName("idx_users_created");

            // Security indexes
            builder.HasIndex(u => u.SessionToken)
                .HasFilter("session_token IS NOT NULL")
                .HasDatabaseName("idx_users_session_token");

            builder.HasIndex(u => u.PasswordResetToken)
                .HasFilter("password_reset_token IS NOT NULL")
                .HasDatabaseName("idx_users_password_reset");

            builder.HasIndex(u => u.EmailVerificationToken)
                .HasFilter("email_verification_token IS NOT NULL")
                .HasDatabaseName("idx_users_email_verification");

            // Composite indexes for common queries
            builder.HasIndex(u => new { u.IsActive, u.Role })
                .HasDatabaseName("idx_users_active_role");

            builder.HasIndex(u => new { u.Department, u.IsActive })
                .HasDatabaseName("idx_users_department_active");

            // Full-text search index
            builder.HasIndex(u => new { u.FullName, u.Username, u.Email })
                .HasDatabaseName("idx_users_search");

            // Relationships
            builder.HasMany<Invoice>()
                .WithOne(i => i.CreatedByUser)
                .HasForeignKey(i => i.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasMany<ImportLog>()
                .WithOne(l => l.ImportedByUser)
                .HasForeignKey(l => l.ImportedBy)
                .OnDelete(DeleteBehavior.Restrict);

            // Constraints
            builder.ToTable(t =>
            {
                t.HasCheckConstraint("chk_users_role", 
                    "role IN ('admin', 'viewer')");
                
                t.HasCheckConstraint("chk_users_username", 
                    "LENGTH(username) >= 3 AND username ~ '^[a-zA-Z0-9_]+$'");
                
                t.HasCheckConstraint("chk_users_email", 
                    "email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'");
                
                t.HasCheckConstraint("chk_users_phone", 
                    "phone_number IS NULL OR phone_number ~ '^[+]?[0-9\\s\\-\\(\\)]+$'");
                
                t.HasCheckConstraint("chk_users_failed_attempts", 
                    "failed_login_attempts >= 0 AND failed_login_attempts <= 10");
                
                t.HasCheckConstraint("chk_users_login_count", 
                    "login_count >= 0");
                
                t.HasCheckConstraint("chk_users_theme", 
                    "theme IN ('light', 'dark', 'auto')");
                
                t.HasCheckConstraint("chk_users_language", 
                    "language IN ('en', 'id')");
            });

            // Security constraints
            builder.ToTable(t =>
            {
                t.HasCheckConstraint("chk_users_password_reset", 
                    "(password_reset_token IS NULL AND password_reset_expires_at IS NULL) OR " +
                    "(password_reset_token IS NOT NULL AND password_reset_expires_at IS NOT NULL)");
                
                t.HasCheckConstraint("chk_users_session", 
                    "(session_token IS NULL AND session_expires_at IS NULL) OR " +
                    "(session_token IS NOT NULL AND session_expires_at IS NOT NULL)");
                
                t.HasCheckConstraint("chk_users_two_factor", 
                    "(two_factor_enabled = false AND two_factor_secret IS NULL) OR " +
                    "(two_factor_enabled = true AND two_factor_secret IS NOT NULL)");
            });

            // Computed columns
            builder.Property<bool>("IsAccountLocked")
                .HasColumnName("is_account_locked")
                .HasComputedColumnSql("account_locked_until IS NOT NULL AND account_locked_until > CURRENT_TIMESTAMP", stored: true);

            builder.Property<bool>("IsSessionValid")
                .HasColumnName("is_session_valid")
                .HasComputedColumnSql("session_token IS NOT NULL AND session_expires_at > CURRENT_TIMESTAMP", stored: true);

            builder.Property<bool>("IsPasswordResetValid")
                .HasColumnName("is_password_reset_valid")
                .HasComputedColumnSql("password_reset_token IS NOT NULL AND password_reset_expires_at > CURRENT_TIMESTAMP", stored: true);

            builder.Property<int>("DaysSinceLastLogin")
                .HasColumnName("days_since_last_login")
                .HasComputedColumnSql("CASE WHEN last_login IS NOT NULL THEN EXTRACT(DAY FROM CURRENT_TIMESTAMP - last_login)::int ELSE NULL END", stored: true);

            // Seed data - Default admin user
            builder.HasData(
                new User
                {
                    Id = 1,
                    Username = "admin",
                    PasswordHash = "$2a$11$6BKmWv5OdRoOjE1hSfh/CONPhDEutMcGBPEtDMqVcEYzCFN3FKt4S", // "admin123"
                    Role = Core.Enums.UserRole.Admin,
                    FullName = "System Administrator",
                    Email = "admin@invoiceapp.com",
                    IsActive = true,
                    EmailVerified = true,
                    Language = "en",
                    Theme = "light",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    PasswordChangedAt = DateTime.UtcNow
                },
                new User
                {
                    Id = 2,
                    Username = "viewer",
                    PasswordHash = "$2a$11$8.3k8zKVPKzMCCKKKKKKKOqL8JGCGzs5O0hE2jJkMM8jHEYJK.LkK", // "viewer123"
                    Role = Core.Enums.UserRole.Viewer,
                    FullName = "Demo Viewer",
                    Email = "viewer@invoiceapp.com",
                    IsActive = true,
                    EmailVerified = true,
                    Language = "en",
                    Theme = "light",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    PasswordChangedAt = DateTime.UtcNow
                }
            );
        }
    }

    /// <summary>
    /// Entity Framework configuration for UserPreference entity
    /// Stores user-specific settings and preferences
    /// </summary>
    public class UserPreferenceConfiguration : IEntityTypeConfiguration<UserPreference>
    {
        public void Configure(EntityTypeBuilder<UserPreference> builder)
        {
            // Table configuration
            builder.ToTable("user_preferences");

            // Primary Key
            builder.HasKey(p => p.Id);

            // Properties configuration
            builder.Property(p => p.Id)
                .HasColumnName("id")
                .ValueGeneratedOnAdd();

            builder.Property(p => p.UserId)
                .HasColumnName("user_id")
                .IsRequired();

            builder.Property(p => p.PreferenceKey)
                .HasColumnName("preference_key")
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(p => p.PreferenceValue)
                .HasColumnName("preference_value")
                .HasColumnType("text");

            builder.Property(p => p.PreferenceType)
                .HasColumnName("preference_type")
                .HasMaxLength(50)
                .HasDefaultValue("string");

            builder.Property(p => p.Category)
                .HasColumnName("category")
                .HasMaxLength(50)
                .HasDefaultValue("general");

            builder.Property(p => p.IsEncrypted)
                .HasColumnName("is_encrypted")
                .HasDefaultValue(false);

            builder.Property(p => p.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            builder.Property(p => p.UpdatedAt)
                .HasColumnName("updated_at")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Indexes
            builder.HasIndex(p => p.UserId)
                .HasDatabaseName("idx_user_preferences_user");

            builder.HasIndex(p => p.PreferenceKey)
                .HasDatabaseName("idx_user_preferences_key");

            builder.HasIndex(p => p.Category)
                .HasDatabaseName("idx_user_preferences_category");

            // Unique constraint on user + key combination
            builder.HasIndex(p => new { p.UserId, p.PreferenceKey })
                .IsUnique()
                .HasDatabaseName("idx_user_preferences_unique");

            // Composite indexes for common queries
            builder.HasIndex(p => new { p.UserId, p.Category })
                .HasDatabaseName("idx_user_preferences_user_category");

            // Relationships
            builder.HasOne<User>()
                .WithMany()
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Constraints
            builder.ToTable(t =>
            {
                t.HasCheckConstraint("chk_user_preferences_type", 
                    "preference_type IN ('string', 'integer', 'decimal', 'boolean', 'json', 'date', 'datetime')");
                
                t.HasCheckConstraint("chk_user_preferences_category", 
                    "category IN ('general', 'ui', 'filter', 'sort', 'export', 'notification', 'security')");
                
                t.HasCheckConstraint("chk_user_preferences_key", 
                    "LENGTH(preference_key) >= 3 AND preference_key ~ '^[a-zA-Z0-9_\\.]+$'");
            });
        }
    }
}