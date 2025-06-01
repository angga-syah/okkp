using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Enums;
using InvoiceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Infrastructure.Seed;

public static class SeedData
{
    public static async Task SeedAsync(InvoiceDbContext context, ILogger logger)
    {
        try
        {
            // Ensure database is created
            await context.Database.EnsureCreatedAsync();

            // Seed Default Settings
            await SeedDefaultSettingsAsync(context);

            // Seed Default Admin User
            await SeedDefaultUserAsync(context);

            // Seed Sample Companies
            await SeedSampleCompaniesAsync(context);

            // Seed Sample TKA Workers
            await SeedSampleTkaWorkersAsync(context);

            // Seed Sample Bank Accounts
            await SeedSampleBankAccountsAsync(context);

            await context.SaveChangesAsync();
            logger.LogInformation("Database seeded successfully");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while seeding the database");
            throw;
        }
    }

    private static async Task SeedDefaultSettingsAsync(InvoiceDbContext context)
    {
        if (await context.Settings.AnyAsync()) return;

        var defaultSettings = new List<Setting>
        {
            new() { Key = "VAT_PERCENTAGE", Value = "11.00", Description = "Default VAT percentage" },
            new() { Key = "COMPANY_NAME", Value = "PT. FORTUNA SADA NIOGA", Description = "Company name for invoice header" },
            new() { Key = "COMPANY_TAGLINE", Value = "Spirit of Services", Description = "Company tagline" },
            new() { Key = "INVOICE_PLACE", Value = "Jakarta", Description = "Default place for invoice date" },
            new() { Key = "OFFICE_ADDRESS", Value = "Jl. Example Street No. 123\nJakarta 12345", Description = "Office address" },
            new() { Key = "OFFICE_PHONE", Value = "Tel: (021) 1234-5678\nFax: (021) 1234-5679", Description = "Office phone numbers" },
            new() { Key = "INVOICE_TERMS", Value = "Pembayaran dilakukan dalam 30 hari", Description = "Payment terms" },
            new() { Key = "SIGNATORY_NAME", Value = "Manager", Description = "Person who signs invoices" },
            new() { Key = "DATE_FORMAT", Value = "dd MMMM yyyy", Description = "Date format for invoices" },
            new() { Key = "CURRENCY_FORMAT", Value = "N2", Description = "Currency number format" },
            new() { Key = "THEME_MODE", Value = "Modern", Description = "UI theme mode" },
            new() { Key = "AUTO_BACKUP_ENABLED", Value = "true", Description = "Enable automatic backup" },
            new() { Key = "BACKUP_INTERVAL_HOURS", Value = "24", Description = "Backup interval in hours" },
            new() { Key = "CACHE_EXPIRATION_MINUTES", Value = "30", Description = "Cache expiration time" },
            new() { Key = "CONNECTION_TIMEOUT_SECONDS", Value = "30", Description = "Database connection timeout" },
            new() { Key = "ENABLE_ANIMATIONS", Value = "true", Description = "Enable UI animations" },
            new() { Key = "PAGE_SIZE_DEFAULT", Value = "50", Description = "Default page size for lists" },
            new() { Key = "SEARCH_MIN_LENGTH", Value = "2", Description = "Minimum search term length" },
            new() { Key = "INVOICE_NUMBER_PREFIX", Value = "INV", Description = "Invoice number prefix" },
            new() { Key = "INVOICE_NUMBER_FORMAT", Value = "INV-{0:yyyy}-{1:D4}", Description = "Invoice number format" }
        };

        await context.Settings.AddRangeAsync(defaultSettings);
    }

    private static async Task SeedDefaultUserAsync(InvoiceDbContext context)
    {
        if (await context.Users.AnyAsync()) return;

        var adminUser = new User
        {
            Username = "admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
            Role = UserRole.Admin,
            FullName = "System Administrator",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var viewerUser = new User
        {
            Username = "viewer",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("viewer123"),
            Role = UserRole.Viewer,
            FullName = "Invoice Viewer",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await context.Users.AddRangeAsync(adminUser, viewerUser);
    }

    private static async Task SeedSampleCompaniesAsync(InvoiceDbContext context)
    {
        if (await context.Companies.AnyAsync()) return;

        var companies = new List<Company>
        {
            new()
            {
                CompanyName = "PT. TEKNOLOGI MAJU BERSAMA",
                Npwp = "01.234.567.8-901.000",
                Idtku = "01.234.567.8-901.000",
                Address = "Jl. Sudirman No. 45\nJakarta Pusat 10220\nIndonesia",
                Email = "info@tekno-maju.co.id",
                Phone = "(021) 5555-1234",
                ContactPerson = "Budi Santoso",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                CompanyName = "CV. MANDIRI SEJAHTERA",
                Npwp = "02.345.678.9-012.000",
                Idtku = "02.345.678.9-012.000",
                Address = "Jl. Gatot Subroto Km. 3\nBandung 40123\nJawa Barat",
                Email = "mandiri@sejahtera.co.id",
                Phone = "(022) 7777-5678",
                ContactPerson = "Siti Nurhaliza",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                CompanyName = "PT. GLOBAL ENGINEERING SOLUTIONS",
                Npwp = "03.456.789.0-123.000",
                Idtku = "03.456.789.0-123.000",
                Address = "Kawasan Industri MM2100\nCikarang Barat 17520\nJawa Barat",
                Email = "contact@global-eng.com",
                Phone = "(021) 8888-9999",
                ContactPerson = "Ahmad Rahman",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            }
        };

        await context.Companies.AddRangeAsync(companies);
        await context.SaveChangesAsync();

        // Add job descriptions for each company
        await SeedJobDescriptionsAsync(context, companies);
    }

    private static async Task SeedJobDescriptionsAsync(InvoiceDbContext context, List<Company> companies)
    {
        var jobDescriptions = new List<JobDescription>();

        foreach (var company in companies)
        {
            var companyJobs = company.CompanyName switch
            {
                "PT. TEKNOLOGI MAJU BERSAMA" => new List<(string Name, string Desc, decimal Price, int Order)>
                {
                    ("Software Development", "Development of custom software applications", 15000000m, 1),
                    ("System Integration", "Integration of various business systems", 12000000m, 2),
                    ("Technical Consultation", "IT consultation and system analysis", 8000000m, 3),
                    ("Database Management", "Database design and maintenance", 10000000m, 4),
                    ("Quality Assurance", "Software testing and quality control", 9000000m, 5)
                },
                "CV. MANDIRI SEJAHTERA" => new List<(string Name, string Desc, decimal Price, int Order)>
                {
                    ("Project Management", "Comprehensive project management services", 18000000m, 1),
                    ("Business Analysis", "Business process analysis and optimization", 14000000m, 2),
                    ("Training Services", "Professional training and development", 7500000m, 3),
                    ("Consulting Services", "Strategic business consulting", 16000000m, 4)
                },
                "PT. GLOBAL ENGINEERING SOLUTIONS" => new List<(string Name, string Desc, decimal Price, int Order)>
                {
                    ("Mechanical Design", "Mechanical engineering design services", 20000000m, 1),
                    ("Electrical Installation", "Electrical system installation and maintenance", 18500000m, 2),
                    ("Civil Construction", "Civil engineering and construction services", 25000000m, 3),
                    ("Equipment Maintenance", "Industrial equipment maintenance", 12500000m, 4),
                    ("Safety Inspection", "Safety compliance and inspection services", 8500000m, 5),
                    ("Project Supervision", "Construction project supervision", 15000000m, 6)
                },
                _ => new List<(string Name, string Desc, decimal Price, int Order)>()
            };

            foreach (var (name, desc, price, order) in companyJobs)
            {
                jobDescriptions.Add(new JobDescription
                {
                    CompanyId = company.Id,
                    JobName = name,
                    JobDescription = desc,
                    Price = price,
                    SortOrder = order,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        await context.JobDescriptions.AddRangeAsync(jobDescriptions);
    }

    private static async Task SeedSampleTkaWorkersAsync(InvoiceDbContext context)
    {
        if (await context.TkaWorkers.AnyAsync()) return;

        var tkaWorkers = new List<TkaWorker>
        {
            new()
            {
                Nama = "John Richardson",
                Passport = "US1234567",
                Divisi = "Software Engineering",
                JenisKelamin = Gender.LakiLaki,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                Nama = "Maria Gonzalez",
                Passport = "ES9876543",
                Divisi = "Project Management",
                JenisKelamin = Gender.Perempuan,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                Nama = "Hiroshi Tanaka",
                Passport = "JP5555666",
                Divisi = "Mechanical Engineering",
                JenisKelamin = Gender.LakiLaki,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                Nama = "Emma Thompson",
                Passport = "GB7777888",
                Divisi = "Quality Assurance",
                JenisKelamin = Gender.Perempuan,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                Nama = "Hans Mueller",
                Passport = "DE4444555",
                Divisi = "Civil Engineering",
                JenisKelamin = Gender.LakiLaki,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            }
        };

        await context.TkaWorkers.AddRangeAsync(tkaWorkers);
        await context.SaveChangesAsync();

        // Add family members for some TKA workers
        await SeedFamilyMembersAsync(context, tkaWorkers);

        // Assign TKA workers to companies
        await SeedTkaAssignmentsAsync(context, tkaWorkers);
    }

    private static async Task SeedFamilyMembersAsync(InvoiceDbContext context, List<TkaWorker> tkaWorkers)
    {
        var familyMembers = new List<TkaFamilyMember>
        {
            // John Richardson's family
            new()
            {
                TkaId = tkaWorkers[0].Id,
                Nama = "Sarah Richardson",
                Passport = "US1234568",
                JenisKelamin = Gender.Perempuan,
                Relationship = FamilyRelationship.Spouse,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                TkaId = tkaWorkers[0].Id,
                Nama = "Michael Richardson",
                Passport = "US1234569",
                JenisKelamin = Gender.LakiLaki,
                Relationship = FamilyRelationship.Child,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            // Maria Gonzalez's family
            new()
            {
                TkaId = tkaWorkers[1].Id,
                Nama = "Carlos Gonzalez",
                Passport = "ES9876544",
                JenisKelamin = Gender.LakiLaki,
                Relationship = FamilyRelationship.Spouse,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            // Hiroshi Tanaka's family
            new()
            {
                TkaId = tkaWorkers[2].Id,
                Nama = "Yuki Tanaka",
                Passport = "JP5555667",
                JenisKelamin = Gender.Perempuan,
                Relationship = FamilyRelationship.Spouse,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                TkaId = tkaWorkers[2].Id,
                Nama = "Kenji Tanaka",
                Passport = "JP5555668",
                JenisKelamin = Gender.LakiLaki,
                Relationship = FamilyRelationship.Child,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                TkaId = tkaWorkers[2].Id,
                Nama = "Akiko Tanaka",
                Passport = "JP5555669",
                JenisKelamin = Gender.Perempuan,
                Relationship = FamilyRelationship.Child,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            }
        };

        await context.TkaFamilyMembers.AddRangeAsync(familyMembers);
    }

    private static async Task SeedTkaAssignmentsAsync(InvoiceDbContext context, List<TkaWorker> tkaWorkers)
    {
        var companies = await context.Companies.ToListAsync();
        var assignments = new List<CompanyTkaAssignment>();

        // Assign each TKA to 1-2 companies
        for (int i = 0; i < tkaWorkers.Count; i++)
        {
            var tka = tkaWorkers[i];
            var primaryCompany = companies[i % companies.Count];
            
            assignments.Add(new CompanyTkaAssignment
            {
                CompanyId = primaryCompany.Id,
                TkaId = tka.Id,
                AssignmentDate = DateTime.Now.AddMonths(-6),
                IsActive = true,
                Notes = $"Primary assignment for {tka.Nama}",
                CreatedAt = DateTime.UtcNow
            });

            // Some TKA workers assigned to secondary company
            if (i % 2 == 0 && companies.Count > 1)
            {
                var secondaryCompany = companies[(i + 1) % companies.Count];
                assignments.Add(new CompanyTkaAssignment
                {
                    CompanyId = secondaryCompany.Id,
                    TkaId = tka.Id,
                    AssignmentDate = DateTime.Now.AddMonths(-3),
                    IsActive = true,
                    Notes = $"Secondary assignment for {tka.Nama}",
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        await context.CompanyTkaAssignments.AddRangeAsync(assignments);
    }

    private static async Task SeedSampleBankAccountsAsync(InvoiceDbContext context)
    {
        if (await context.BankAccounts.AnyAsync()) return;

        var bankAccounts = new List<BankAccount>
        {
            new()
            {
                BankName = "Bank Central Asia (BCA)",
                AccountNumber = "123-456-7890",
                AccountName = "PT. FORTUNA SADA NIOGA",
                SwiftCode = "CENAIDJA",
                Branch = "Jakarta Pusat",
                IsDefault = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                BankName = "Bank Mandiri",
                AccountNumber = "098-765-4321",
                AccountName = "PT. FORTUNA SADA NIOGA",
                SwiftCode = "BMRIIDJA",
                Branch = "Jakarta Selatan",
                IsDefault = false,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                BankName = "Bank Negara Indonesia (BNI)",
                AccountNumber = "555-666-7777",
                AccountName = "PT. FORTUNA SADA NIOGA",
                SwiftCode = "BNINIDJA",
                Branch = "Jakarta Timur",
                IsDefault = false,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            }
        };

        await context.BankAccounts.AddRangeAsync(bankAccounts);
    }

    public static async Task CreateSampleInvoicesAsync(InvoiceDbContext context, int userId)
    {
        if (await context.Invoices.AnyAsync()) return;

        var companies = await context.Companies.Take(2).ToListAsync();
        var tkaWorkers = await context.TkaWorkers.Take(3).ToListAsync();
        var jobDescriptions = await context.JobDescriptions.Take(5).ToListAsync();
        var defaultBank = await context.BankAccounts.FirstOrDefaultAsync(b => b.IsDefault);

        var sampleInvoices = new List<Invoice>
        {
            new()
            {
                InvoiceNumber = "INV-2025-0001",
                CompanyId = companies[0].Id,
                InvoiceDate = DateTime.Now.AddDays(-30),
                DueDate = DateTime.Now,
                VatPercentage = 11.00m,
                Status = InvoiceStatus.Finalized,
                BankAccountId = defaultBank?.Id,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                InvoiceNumber = "INV-2025-0002",
                CompanyId = companies[1].Id,
                InvoiceDate = DateTime.Now.AddDays(-15),
                DueDate = DateTime.Now.AddDays(15),
                VatPercentage = 11.00m,
                Status = InvoiceStatus.Draft,
                BankAccountId = defaultBank?.Id,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            }
        };

        await context.Invoices.AddRangeAsync(sampleInvoices);
        await context.SaveChangesAsync();

        // Add invoice lines
        var invoiceLines = new List<InvoiceLine>
        {
            // Invoice 1 lines
            new()
            {
                InvoiceId = sampleInvoices[0].Id,
                Baris = 1,
                LineOrder = 1,
                TkaId = tkaWorkers[0].Id,
                JobDescriptionId = jobDescriptions[0].Id,
                Quantity = 1,
                UnitPrice = jobDescriptions[0].Price,
                LineTotal = jobDescriptions[0].Price,
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                InvoiceId = sampleInvoices[0].Id,
                Baris = 2,
                LineOrder = 2,
                TkaId = tkaWorkers[1].Id,
                JobDescriptionId = jobDescriptions[1].Id,
                Quantity = 1,
                UnitPrice = jobDescriptions[1].Price,
                LineTotal = jobDescriptions[1].Price,
                CreatedAt = DateTime.UtcNow
            },
            // Invoice 2 lines
            new()
            {
                InvoiceId = sampleInvoices[1].Id,
                Baris = 1,
                LineOrder = 1,
                TkaId = tkaWorkers[2].Id,
                JobDescriptionId = jobDescriptions[2].Id,
                Quantity = 1,
                UnitPrice = jobDescriptions[2].Price,
                LineTotal = jobDescriptions[2].Price,
                CreatedAt = DateTime.UtcNow
            }
        };

        await context.InvoiceLines.AddRangeAsync(invoiceLines);

        // Calculate totals for invoices
        foreach (var invoice in sampleInvoices)
        {
            var lines = invoiceLines.Where(l => l.InvoiceId == invoice.Id).ToList();
            invoice.Subtotal = lines.Sum(l => l.LineTotal);
            invoice.VatAmount = Math.Round(invoice.Subtotal * invoice.VatPercentage / 100, 0, MidpointRounding.AwayFromZero);
            invoice.TotalAmount = invoice.Subtotal + invoice.VatAmount;
        }

        await context.SaveChangesAsync();
    }
}