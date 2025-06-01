// E:\kp\4 invoice\Application\Services\ReportService.cs
using AutoMapper;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Interfaces;
using InvoiceApp.Core.Interfaces.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System.Text;

namespace InvoiceApp.Application.Services;

public class ReportService : IReportService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<ReportService> _logger;
    private readonly IMemoryCache _cache;
    private readonly IExcelService _excelService;
    private readonly IPdfService _pdfService;

    public ReportService(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        ILogger<ReportService> logger,
        IMemoryCache cache,
        IExcelService excelService,
        IPdfService pdfService)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _logger = logger;
        _cache = cache;
        _excelService = excelService;
        _pdfService = pdfService;
    }

    #region Invoice Reports

    public async Task<InvoiceReportDto> GenerateInvoiceReportAsync(InvoiceReportFilter filter)
    {
        _logger.LogInformation("Generating invoice report");

        var cacheKey = $"invoice_report_{filter.GetHashCode()}";
        if (_cache.TryGetValue(cacheKey, out InvoiceReportDto? cachedReport))
        {
            return cachedReport!;
        }

        var invoices = await _unitOfWork.InvoiceRepository.GetFilteredInvoicesAsync(
            filter.CompanyId, filter.FromDate, filter.ToDate, filter.Status, filter.InvoiceIds);

        var report = new InvoiceReportDto
        {
            Filter = filter,
            GeneratedAt = DateTime.UtcNow,
            TotalInvoices = invoices.Count,
            TotalAmount = invoices.Sum(i => i.TotalAmount),
            TotalVat = invoices.Sum(i => i.VatAmount),
            TotalSubtotal = invoices.Sum(i => i.Subtotal),
            AverageInvoiceAmount = invoices.Any() ? invoices.Average(i => i.TotalAmount) : 0,
            
            // Status breakdown
            DraftCount = invoices.Count(i => i.Status == InvoiceStatus.Draft),
            FinalizedCount = invoices.Count(i => i.Status == InvoiceStatus.Finalized),
            PaidCount = invoices.Count(i => i.Status == InvoiceStatus.Paid),
            CancelledCount = invoices.Count(i => i.Status == InvoiceStatus.Cancelled),
            
            // Monthly breakdown
            MonthlyBreakdown = GetMonthlyBreakdown(invoices),
            
            // Company breakdown
            CompanyBreakdown = GetCompanyBreakdown(invoices),
            
            // Invoice details
            Invoices = _mapper.Map<List<InvoiceDto>>(invoices)
        };

        _cache.Set(cacheKey, report, TimeSpan.FromMinutes(15));
        return report;
    }

    public async Task<List<InvoiceAgingDto>> GenerateInvoiceAgingReportAsync(DateTime? asOfDate = null)
    {
        _logger.LogInformation("Generating invoice aging report");

        asOfDate ??= DateTime.Today;
        
        var cacheKey = $"aging_report_{asOfDate:yyyy-MM-dd}";
        if (_cache.TryGetValue(cacheKey, out List<InvoiceAgingDto>? cachedAging))
        {
            return cachedAging!;
        }

        var invoices = await _unitOfWork.InvoiceRepository.GetUnpaidInvoicesAsync();
        var agingReport = new List<InvoiceAgingDto>();

        foreach (var invoice in invoices)
        {
            var daysPastDue = invoice.DueDate.HasValue 
                ? (asOfDate.Value - invoice.DueDate.Value).Days 
                : (asOfDate.Value - invoice.InvoiceDate).Days;

            var agingCategory = GetAgingCategory(daysPastDue);

            agingReport.Add(new InvoiceAgingDto
            {
                InvoiceId = invoice.Id,
                InvoiceNumber = invoice.InvoiceNumber,
                CompanyName = invoice.Company.CompanyName,
                InvoiceDate = invoice.InvoiceDate,
                DueDate = invoice.DueDate,
                TotalAmount = invoice.TotalAmount,
                DaysPastDue = Math.Max(0, daysPastDue),
                AgingCategory = agingCategory,
                Status = invoice.Status.ToString()
            });
        }

        var sortedAging = agingReport.OrderByDescending(a => a.DaysPastDue).ToList();
        _cache.Set(cacheKey, sortedAging, TimeSpan.FromHours(2));

        return sortedAging;
    }

    #endregion

    #region Company Reports

    public async Task<CompanyReportDto> GenerateCompanyReportAsync(CompanyReportFilter filter)
    {
        _logger.LogInformation("Generating company report");

        var companies = await _unitOfWork.CompanyRepository.GetCompaniesWithStatsAsync(
            filter.IsActive, filter.FromDate, filter.ToDate);

        var report = new CompanyReportDto
        {
            Filter = filter,
            GeneratedAt = DateTime.UtcNow,
            TotalCompanies = companies.Count,
            ActiveCompanies = companies.Count(c => c.IsActive),
            InactiveCompanies = companies.Count(c => !c.IsActive),
            TotalRevenue = companies.Sum(c => c.Invoices.Where(i => i.Status != InvoiceStatus.Cancelled)
                                                        .Sum(i => i.TotalAmount)),
            AverageRevenuePerCompany = companies.Any() 
                ? companies.Average(c => c.Invoices.Where(i => i.Status != InvoiceStatus.Cancelled)
                                                  .Sum(i => i.TotalAmount)) 
                : 0,
            
            Companies = companies.Select(c => new CompanyReportItemDto
            {
                Id = c.Id,
                CompanyName = c.CompanyName,
                Npwp = c.Npwp,
                IsActive = c.IsActive,
                InvoiceCount = c.Invoices.Count(i => i.Status != InvoiceStatus.Cancelled),
                TotalRevenue = c.Invoices.Where(i => i.Status != InvoiceStatus.Cancelled)
                                        .Sum(i => i.TotalAmount),
                AverageInvoiceAmount = c.Invoices.Any(i => i.Status != InvoiceStatus.Cancelled)
                    ? c.Invoices.Where(i => i.Status != InvoiceStatus.Cancelled)
                                .Average(i => i.TotalAmount)
                    : 0,
                LastInvoiceDate = c.Invoices.Any() ? c.Invoices.Max(i => i.InvoiceDate) : (DateTime?)null,
                ActiveTkaCount = c.CompanyTkaAssignments.Count(a => a.IsActive && 
                    (a.EndDate == null || a.EndDate > DateTime.Now))
            }).OrderByDescending(c => c.TotalRevenue).ToList()
        };

        return report;
    }

    #endregion

    #region TKA Reports

    public async Task<TkaReportDto> GenerateTkaReportAsync(TkaReportFilter filter)
    {
        _logger.LogInformation("Generating TKA report");

        var tkaWorkers = await _unitOfWork.TkaWorkerRepository.GetTkaWithStatsAsync(
            filter.IsActive, filter.FromDate, filter.ToDate, filter.CompanyId);

        var report = new TkaReportDto
        {
            Filter = filter,
            GeneratedAt = DateTime.UtcNow,
            TotalTkaWorkers = tkaWorkers.Count,
            ActiveTkaWorkers = tkaWorkers.Count(t => t.IsActive),
            TotalFamilyMembers = tkaWorkers.Sum(t => t.FamilyMembers.Count(f => f.IsActive)),
            TotalInvoiceLines = tkaWorkers.Sum(t => t.InvoiceLines.Count),
            TotalEarnings = tkaWorkers.Sum(t => t.InvoiceLines.Where(l => l.Invoice.Status != InvoiceStatus.Cancelled)
                                                             .Sum(l => l.LineTotal)),
            
            TkaWorkers = tkaWorkers.Select(t => new TkaReportItemDto
            {
                Id = t.Id,
                Nama = t.Nama,
                Passport = t.Passport,
                Divisi = t.Divisi,
                JenisKelamin = t.JenisKelamin.ToString(),
                IsActive = t.IsActive,
                FamilyMemberCount = t.FamilyMembers.Count(f => f.IsActive),
                InvoiceCount = t.InvoiceLines.Select(l => l.InvoiceId).Distinct().Count(),
                TotalEarnings = t.InvoiceLines.Where(l => l.Invoice.Status != InvoiceStatus.Cancelled)
                                             .Sum(l => l.LineTotal),
                AverageEarningsPerInvoice = t.InvoiceLines.Any(l => l.Invoice.Status != InvoiceStatus.Cancelled)
                    ? t.InvoiceLines.Where(l => l.Invoice.Status != InvoiceStatus.Cancelled)
                                   .GroupBy(l => l.InvoiceId)
                                   .Average(g => g.Sum(l => l.LineTotal))
                    : 0,
                LastInvoiceDate = t.InvoiceLines.Any() ? t.InvoiceLines.Max(l => l.Invoice.InvoiceDate) : (DateTime?)null,
                ActiveCompanyAssignments = t.CompanyTkaAssignments.Count(a => a.IsActive && 
                    (a.EndDate == null || a.EndDate > DateTime.Now))
            }).OrderByDescending(t => t.TotalEarnings).ToList()
        };

        return report;
    }

    #endregion

    #region Financial Reports

    public async Task<FinancialReportDto> GenerateFinancialReportAsync(FinancialReportFilter filter)
    {
        _logger.LogInformation("Generating financial report");

        var invoices = await _unitOfWork.InvoiceRepository.GetFilteredInvoicesAsync(
            filter.CompanyId, filter.FromDate, filter.ToDate, filter.Status);

        var report = new FinancialReportDto
        {
            Filter = filter,
            GeneratedAt = DateTime.UtcNow,
            
            // Revenue metrics
            TotalRevenue = invoices.Where(i => i.Status != InvoiceStatus.Cancelled).Sum(i => i.TotalAmount),
            TotalSubtotal = invoices.Where(i => i.Status != InvoiceStatus.Cancelled).Sum(i => i.Subtotal),
            TotalVat = invoices.Where(i => i.Status != InvoiceStatus.Cancelled).Sum(i => i.VatAmount),
            
            // Outstanding amounts
            OutstandingAmount = invoices.Where(i => i.Status == InvoiceStatus.Finalized).Sum(i => i.TotalAmount),
            PaidAmount = invoices.Where(i => i.Status == InvoiceStatus.Paid).Sum(i => i.TotalAmount),
            
            // Monthly trends
            MonthlyRevenue = GetMonthlyRevenueBreakdown(invoices),
            
            // VAT summary
            VatSummary = GetVatSummary(invoices),
            
            // Payment status summary
            PaymentStatusSummary = GetPaymentStatusSummary(invoices)
        };

        // Calculate growth rates if we have comparison data
        if (filter.FromDate.HasValue && filter.ToDate.HasValue)
        {
            var previousPeriodStart = filter.FromDate.Value.AddDays(-(filter.ToDate.Value - filter.FromDate.Value).Days - 1);
            var previousPeriodEnd = filter.FromDate.Value.AddDays(-1);
            
            var previousInvoices = await _unitOfWork.InvoiceRepository.GetFilteredInvoicesAsync(
                filter.CompanyId, previousPeriodStart, previousPeriodEnd, filter.Status);
            
            var previousRevenue = previousInvoices.Where(i => i.Status != InvoiceStatus.Cancelled).Sum(i => i.TotalAmount);
            
            report.RevenueGrowthRate = previousRevenue > 0 
                ? ((double)(report.TotalRevenue - previousRevenue) / (double)previousRevenue) * 100 
                : 0;
        }

        return report;
    }

    #endregion

    #region Export Methods

    public async Task<byte[]> ExportReportToExcelAsync<T>(T report, string reportType) where T : class
    {
        _logger.LogInformation("Exporting {ReportType} report to Excel", reportType);

        return reportType switch
        {
            "Invoice" when report is InvoiceReportDto invoiceReport => 
                await _excelService.CreateInvoiceReportExcelAsync(invoiceReport),
            "Company" when report is CompanyReportDto companyReport => 
                await _excelService.CreateCompanyReportExcelAsync(companyReport),
            "TKA" when report is TkaReportDto tkaReport => 
                await _excelService.CreateTkaReportExcelAsync(tkaReport),
            "Financial" when report is FinancialReportDto financialReport => 
                await _excelService.CreateFinancialReportExcelAsync(financialReport),
            _ => throw new NotSupportedException($"Report type {reportType} not supported for Excel export")
        };
    }

    public async Task<byte[]> ExportReportToPdfAsync<T>(T report, string reportType) where T : class
    {
        _logger.LogInformation("Exporting {ReportType} report to PDF", reportType);

        return reportType switch
        {
            "Invoice" when report is InvoiceReportDto invoiceReport => 
                await _pdfService.CreateInvoiceReportPdfAsync(invoiceReport),
            "Company" when report is CompanyReportDto companyReport => 
                await _pdfService.CreateCompanyReportPdfAsync(companyReport),
            "TKA" when report is TkaReportDto tkaReport => 
                await _pdfService.CreateTkaReportPdfAsync(tkaReport),
            "Financial" when report is FinancialReportDto financialReport => 
                await _pdfService.CreateFinancialReportPdfAsync(financialReport),
            _ => throw new NotSupportedException($"Report type {reportType} not supported for PDF export")
        };
    }

    public async Task<string> ExportReportToCsvAsync<T>(T report, string reportType) where T : class
    {
        _logger.LogInformation("Exporting {ReportType} report to CSV", reportType);

        return reportType switch
        {
            "Invoice" when report is InvoiceReportDto invoiceReport => CreateInvoiceReportCsv(invoiceReport),
            "Company" when report is CompanyReportDto companyReport => CreateCompanyReportCsv(companyReport),
            "TKA" when report is TkaReportDto tkaReport => CreateTkaReportCsv(tkaReport),
            _ => throw new NotSupportedException($"Report type {reportType} not supported for CSV export")
        };
    }

    #endregion

    #region Helper Methods

    private List<MonthlyBreakdownDto> GetMonthlyBreakdown(List<Invoice> invoices)
    {
        return invoices
            .Where(i => i.Status != InvoiceStatus.Cancelled)
            .GroupBy(i => new { i.InvoiceDate.Year, i.InvoiceDate.Month })
            .Select(g => new MonthlyBreakdownDto
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                MonthName = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMMM yyyy"),
                InvoiceCount = g.Count(),
                TotalAmount = g.Sum(i => i.TotalAmount),
                AverageAmount = g.Average(i => i.TotalAmount)
            })
            .OrderBy(m => m.Year).ThenBy(m => m.Month)
            .ToList();
    }

    private List<CompanyBreakdownDto> GetCompanyBreakdown(List<Invoice> invoices)
    {
        return invoices
            .Where(i => i.Status != InvoiceStatus.Cancelled)
            .GroupBy(i => new { i.CompanyId, i.Company.CompanyName })
            .Select(g => new CompanyBreakdownDto
            {
                CompanyId = g.Key.CompanyId,
                CompanyName = g.Key.CompanyName,
                InvoiceCount = g.Count(),
                TotalAmount = g.Sum(i => i.TotalAmount),
                AverageAmount = g.Average(i => i.TotalAmount)
            })
            .OrderByDescending(c => c.TotalAmount)
            .ToList();
    }

    private string GetAgingCategory(int daysPastDue)
    {
        return daysPastDue switch
        {
            <= 0 => "Current",
            <= 30 => "1-30 Days",
            <= 60 => "31-60 Days",
            <= 90 => "61-90 Days",
            _ => "Over 90 Days"
        };
    }

    private List<MonthlyRevenueDto> GetMonthlyRevenueBreakdown(List<Invoice> invoices)
    {
        return invoices
            .Where(i => i.Status != InvoiceStatus.Cancelled)
            .GroupBy(i => new { i.InvoiceDate.Year, i.InvoiceDate.Month })
            .Select(g => new MonthlyRevenueDto
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                MonthName = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMMM yyyy"),
                Revenue = g.Sum(i => i.TotalAmount),
                Subtotal = g.Sum(i => i.Subtotal),
                VatAmount = g.Sum(i => i.VatAmount),
                InvoiceCount = g.Count()
            })
            .OrderBy(m => m.Year).ThenBy(m => m.Month)
            .ToList();
    }

    private VatSummaryDto GetVatSummary(List<Invoice> invoices)
    {
        var validInvoices = invoices.Where(i => i.Status != InvoiceStatus.Cancelled).ToList();
        
        return new VatSummaryDto
        {
            TotalVatCollected = validInvoices.Sum(i => i.VatAmount),
            VatBreakdown = validInvoices
                .GroupBy(i => i.VatPercentage)
                .Select(g => new VatBreakdownDto
                {
                    VatPercentage = g.Key,
                    InvoiceCount = g.Count(),
                    SubtotalAmount = g.Sum(i => i.Subtotal),
                    VatAmount = g.Sum(i => i.VatAmount),
                    TotalAmount = g.Sum(i => i.TotalAmount)
                })
                .OrderBy(v => v.VatPercentage)
                .ToList()
        };
    }

    private PaymentStatusSummaryDto GetPaymentStatusSummary(List<Invoice> invoices)
    {
        return new PaymentStatusSummaryDto
        {
            DraftAmount = invoices.Where(i => i.Status == InvoiceStatus.Draft).Sum(i => i.TotalAmount),
            FinalizedAmount = invoices.Where(i => i.Status == InvoiceStatus.Finalized).Sum(i => i.TotalAmount),
            PaidAmount = invoices.Where(i => i.Status == InvoiceStatus.Paid).Sum(i => i.TotalAmount),
            CancelledAmount = invoices.Where(i => i.Status == InvoiceStatus.Cancelled).Sum(i => i.TotalAmount),
            
            DraftCount = invoices.Count(i => i.Status == InvoiceStatus.Draft),
            FinalizedCount = invoices.Count(i => i.Status == InvoiceStatus.Finalized),
            PaidCount = invoices.Count(i => i.Status == InvoiceStatus.Paid),
            CancelledCount = invoices.Count(i => i.Status == InvoiceStatus.Cancelled)
        };
    }

    private string CreateInvoiceReportCsv(InvoiceReportDto report)
    {
        var csv = new StringBuilder();
        csv.AppendLine("InvoiceNumber,CompanyName,InvoiceDate,DueDate,Subtotal,VATAmount,TotalAmount,Status");
        
        foreach (var invoice in report.Invoices)
        {
            csv.AppendLine($"{invoice.InvoiceNumber},{invoice.CompanyName}," +
                          $"{invoice.InvoiceDate:yyyy-MM-dd},{invoice.DueDate:yyyy-MM-dd}," +
                          $"{invoice.Subtotal},{invoice.VatAmount},{invoice.TotalAmount},{invoice.StatusText}");
        }
        
        return csv.ToString();
    }

    private string CreateCompanyReportCsv(CompanyReportDto report)
    {
        var csv = new StringBuilder();
        csv.AppendLine("CompanyName,NPWP,IsActive,InvoiceCount,TotalRevenue,AverageInvoiceAmount,LastInvoiceDate,ActiveTKACount");
        
        foreach (var company in report.Companies)
        {
            csv.AppendLine($"{company.CompanyName},{company.Npwp},{company.IsActive}," +
                          $"{company.InvoiceCount},{company.TotalRevenue},{company.AverageInvoiceAmount}," +
                          $"{company.LastInvoiceDate:yyyy-MM-dd},{company.ActiveTkaCount}");
        }
        
        return csv.ToString();
    }

    private string CreateTkaReportCsv(TkaReportDto report)
    {
        var csv = new StringBuilder();
        csv.AppendLine("Name,Passport,Division,Gender,IsActive,FamilyMemberCount,InvoiceCount,TotalEarnings,LastInvoiceDate");
        
        foreach (var tka in report.TkaWorkers)
        {
            csv.AppendLine($"{tka.Nama},{tka.Passport},{tka.Divisi},{tka.JenisKelamin},{tka.IsActive}," +
                          $"{tka.FamilyMemberCount},{tka.InvoiceCount},{tka.TotalEarnings},{tka.LastInvoiceDate:yyyy-MM-dd}");
        }
        
        return csv.ToString();
    }

    #endregion
}