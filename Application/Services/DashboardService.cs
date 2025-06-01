// E:\kp\4 invoice\Application\Services\DashboardService.cs
using AutoMapper;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Interfaces;
using InvoiceApp.Core.Interfaces.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Application.Services;

public class DashboardService : IDashboardService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<DashboardService> _logger;
    private readonly IMemoryCache _cache;

    public DashboardService(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        ILogger<DashboardService> logger,
        IMemoryCache cache)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _logger = logger;
        _cache = cache;
    }

    public async Task<DashboardSummaryDto> GetDashboardSummaryAsync(int? userId = null)
    {
        _logger.LogInformation("Getting dashboard summary for user: {UserId}", userId);

        var cacheKey = $"dashboard_summary_{userId}";
        if (_cache.TryGetValue(cacheKey, out DashboardSummaryDto? cachedSummary))
        {
            return cachedSummary!;
        }

        var currentMonth = DateTime.Now;
        var firstDayOfMonth = new DateTime(currentMonth.Year, currentMonth.Month, 1);
        var lastDayOfMonth = firstDayOfMonth.AddMonths(1).AddDays(-1);

        var summary = new DashboardSummaryDto
        {
            // Invoice Statistics
            TotalInvoices = await _unitOfWork.InvoiceRepository.GetCountAsync(),
            DraftInvoices = await _unitOfWork.InvoiceRepository.GetCountByStatusAsync(InvoiceStatus.Draft),
            FinalizedInvoices = await _unitOfWork.InvoiceRepository.GetCountByStatusAsync(InvoiceStatus.Finalized),
            PaidInvoices = await _unitOfWork.InvoiceRepository.GetCountByStatusAsync(InvoiceStatus.Paid),
            
            // Monthly Statistics
            MonthlyInvoices = await _unitOfWork.InvoiceRepository.GetCountAsync(
                fromDate: firstDayOfMonth, toDate: lastDayOfMonth),
            MonthlyRevenue = await _unitOfWork.InvoiceRepository.GetTotalAmountAsync(
                fromDate: firstDayOfMonth, toDate: lastDayOfMonth),
            
            // Company & TKA Statistics
            TotalCompanies = await _unitOfWork.CompanyRepository.GetCountAsync(isActive: true),
            TotalTkaWorkers = await _unitOfWork.TkaWorkerRepository.GetCountAsync(isActive: true),
            
            // Recent Activities
            RecentInvoices = await GetRecentInvoicesForDashboardAsync(5, userId),
            TopCompanies = await GetTopCompaniesByRevenueAsync(5),
            ActiveTkaWorkers = await GetActiveTkaWorkersAsync(5)
        };

        // Calculate growth percentages
        var previousMonth = firstDayOfMonth.AddMonths(-1);
        var previousMonthEnd = firstDayOfMonth.AddDays(-1);
        
        var previousMonthInvoices = await _unitOfWork.InvoiceRepository.GetCountAsync(
            fromDate: previousMonth, toDate: previousMonthEnd);
        var previousMonthRevenue = await _unitOfWork.InvoiceRepository.GetTotalAmountAsync(
            fromDate: previousMonth, toDate: previousMonthEnd);

        summary.MonthlyInvoiceGrowth = CalculateGrowthPercentage(summary.MonthlyInvoices, previousMonthInvoices);
        summary.MonthlyRevenueGrowth = CalculateGrowthPercentage((double)summary.MonthlyRevenue, (double)previousMonthRevenue);

        // Get chart data
        summary.InvoiceChartData = await GetInvoiceChartDataAsync();
        summary.RevenueChartData = await GetRevenueChartDataAsync();

        _cache.Set(cacheKey, summary, TimeSpan.FromMinutes(10));
        return summary;
    }

    public async Task<List<InvoiceDto>> GetRecentInvoicesForDashboardAsync(int count = 10, int? userId = null)
    {
        _logger.LogInformation("Getting recent invoices for dashboard");

        var invoices = await _unitOfWork.InvoiceRepository.GetRecentAsync(count, userId, false);
        return _mapper.Map<List<InvoiceDto>>(invoices);
    }

    public async Task<List<DashboardCompanyDto>> GetTopCompaniesByRevenueAsync(int count = 10)
    {
        _logger.LogInformation("Getting top companies by revenue");

        var cacheKey = $"top_companies_{count}";
        if (_cache.TryGetValue(cacheKey, out List<DashboardCompanyDto>? cachedCompanies))
        {
            return cachedCompanies!;
        }

        var companies = await _unitOfWork.CompanyRepository.GetTopCompaniesByRevenueAsync(count);
        var companyDtos = companies.Select(c => new DashboardCompanyDto
        {
            Id = c.Id,
            CompanyName = c.CompanyName,
            Npwp = c.Npwp,
            TotalRevenue = c.Invoices.Where(i => i.Status == InvoiceStatus.Finalized || i.Status == InvoiceStatus.Paid)
                                    .Sum(i => i.TotalAmount),
            InvoiceCount = c.Invoices.Count(i => i.Status != InvoiceStatus.Cancelled),
            LastInvoiceDate = c.Invoices.Any() ? c.Invoices.Max(i => i.InvoiceDate) : (DateTime?)null
        }).ToList();

        _cache.Set(cacheKey, companyDtos, TimeSpan.FromMinutes(30));
        return companyDtos;
    }

    public async Task<List<DashboardTkaDto>> GetActiveTkaWorkersAsync(int count = 10)
    {
        _logger.LogInformation("Getting active TKA workers");

        var cacheKey = $"active_tka_{count}";
        if (_cache.TryGetValue(cacheKey, out List<DashboardTkaDto>? cachedTka))
        {
            return cachedTka!;
        }

        var tkaWorkers = await _unitOfWork.TkaWorkerRepository.GetMostActiveAsync(count);
        var tkaDtos = tkaWorkers.Select(t => new DashboardTkaDto
        {
            Id = t.Id,
            Nama = t.Nama,
            Passport = t.Passport,
            Divisi = t.Divisi,
            ActiveCompanyCount = t.CompanyTkaAssignments.Count(a => a.IsActive && 
                (a.EndDate == null || a.EndDate > DateTime.Now)),
            RecentInvoiceCount = t.InvoiceLines.Count(l => l.Invoice.InvoiceDate >= DateTime.Now.AddDays(-30)),
            LastInvoiceDate = t.InvoiceLines.Any() ? t.InvoiceLines.Max(l => l.Invoice.InvoiceDate) : (DateTime?)null
        }).ToList();

        _cache.Set(cacheKey, tkaDtos, TimeSpan.FromMinutes(30));
        return tkaDtos;
    }

    public async Task<List<ChartDataDto>> GetInvoiceChartDataAsync(int months = 12)
    {
        _logger.LogInformation("Getting invoice chart data for {Months} months", months);

        var cacheKey = $"invoice_chart_{months}";
        if (_cache.TryGetValue(cacheKey, out List<ChartDataDto>? cachedData))
        {
            return cachedData!;
        }

        var startDate = DateTime.Now.AddMonths(-months).Date;
        var chartData = new List<ChartDataDto>();

        for (int i = 0; i < months; i++)
        {
            var monthStart = startDate.AddMonths(i);
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);

            var invoiceCount = await _unitOfWork.InvoiceRepository.GetCountAsync(
                fromDate: monthStart, toDate: monthEnd);

            chartData.Add(new ChartDataDto
            {
                Label = monthStart.ToString("MMM yyyy"),
                Value = invoiceCount,
                Date = monthStart
            });
        }

        _cache.Set(cacheKey, chartData, TimeSpan.FromMinutes(60));
        return chartData;
    }

    public async Task<List<ChartDataDto>> GetRevenueChartDataAsync(int months = 12)
    {
        _logger.LogInformation("Getting revenue chart data for {Months} months", months);

        var cacheKey = $"revenue_chart_{months}";
        if (_cache.TryGetValue(cacheKey, out List<ChartDataDto>? cachedData))
        {
            return cachedData!;
        }

        var startDate = DateTime.Now.AddMonths(-months).Date;
        var chartData = new List<ChartDataDto>();

        for (int i = 0; i < months; i++)
        {
            var monthStart = startDate.AddMonths(i);
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);

            var revenue = await _unitOfWork.InvoiceRepository.GetTotalAmountAsync(
                fromDate: monthStart, toDate: monthEnd);

            chartData.Add(new ChartDataDto
            {
                Label = monthStart.ToString("MMM yyyy"),
                Value = (double)revenue,
                Date = monthStart
            });
        }

        _cache.Set(cacheKey, chartData, TimeSpan.FromMinutes(60));
        return chartData;
    }

    public async Task<List<DashboardStatDto>> GetQuickStatsAsync()
    {
        _logger.LogInformation("Getting quick stats");

        var cacheKey = "quick_stats";
        if (_cache.TryGetValue(cacheKey, out List<DashboardStatDto>? cachedStats))
        {
            return cachedStats!;
        }

        var today = DateTime.Today;
        var thisMonth = new DateTime(today.Year, today.Month, 1);
        var thisYear = new DateTime(today.Year, 1, 1);

        var stats = new List<DashboardStatDto>
        {
            new()
            {
                Title = "Today's Invoices",
                Value = await _unitOfWork.InvoiceRepository.GetCountAsync(fromDate: today, toDate: today),
                Icon = "CalendarToday",
                Color = "#4CAF50"
            },
            new()
            {
                Title = "This Month",
                Value = await _unitOfWork.InvoiceRepository.GetCountAsync(fromDate: thisMonth),
                Icon = "CalendarMonth",
                Color = "#2196F3"
            },
            new()
            {
                Title = "This Year",
                Value = await _unitOfWork.InvoiceRepository.GetCountAsync(fromDate: thisYear),
                Icon = "CalendarYear",
                Color = "#FF9800"
            },
            new()
            {
                Title = "Draft Invoices",
                Value = await _unitOfWork.InvoiceRepository.GetCountByStatusAsync(InvoiceStatus.Draft),
                Icon = "Draft",
                Color = "#F44336"
            }
        };

        _cache.Set(cacheKey, stats, TimeSpan.FromMinutes(15));
        return stats;
    }

    public async Task<DashboardPerformanceDto> GetPerformanceMetricsAsync()
    {
        _logger.LogInformation("Getting performance metrics");

        var cacheKey = "performance_metrics";
        if (_cache.TryGetValue(cacheKey, out DashboardPerformanceDto? cachedMetrics))
        {
            return cachedMetrics!;
        }

        var today = DateTime.Today;
        var thisMonth = new DateTime(today.Year, today.Month, 1);
        var lastMonth = thisMonth.AddMonths(-1);
        var lastMonthEnd = thisMonth.AddDays(-1);

        var thisMonthInvoices = await _unitOfWork.InvoiceRepository.GetCountAsync(fromDate: thisMonth);
        var thisMonthRevenue = await _unitOfWork.InvoiceRepository.GetTotalAmountAsync(fromDate: thisMonth);
        
        var lastMonthInvoices = await _unitOfWork.InvoiceRepository.GetCountAsync(
            fromDate: lastMonth, toDate: lastMonthEnd);
        var lastMonthRevenue = await _unitOfWork.InvoiceRepository.GetTotalAmountAsync(
            fromDate: lastMonth, toDate: lastMonthEnd);

        var averageInvoiceValue = thisMonthInvoices > 0 ? thisMonthRevenue / thisMonthInvoices : 0;
        var invoiceGrowth = CalculateGrowthPercentage(thisMonthInvoices, lastMonthInvoices);
        var revenueGrowth = CalculateGrowthPercentage((double)thisMonthRevenue, (double)lastMonthRevenue);

        var performance = new DashboardPerformanceDto
        {
            MonthlyInvoices = thisMonthInvoices,
            MonthlyRevenue = thisMonthRevenue,
            AverageInvoiceValue = averageInvoiceValue,
            InvoiceGrowthRate = invoiceGrowth,
            RevenueGrowthRate = revenueGrowth,
            TotalActiveCompanies = await _unitOfWork.CompanyRepository.GetCountAsync(isActive: true),
            TotalActiveTka = await _unitOfWork.TkaWorkerRepository.GetCountAsync(isActive: true),
            PendingDrafts = await _unitOfWork.InvoiceRepository.GetCountByStatusAsync(InvoiceStatus.Draft)
        };

        _cache.Set(cacheKey, performance, TimeSpan.FromMinutes(20));
        return performance;
    }

    private double CalculateGrowthPercentage(double current, double previous)
    {
        if (previous == 0) return current > 0 ? 100 : 0;
        return Math.Round(((current - previous) / previous) * 100, 2);
    }
}

// Dashboard DTOs
public class DashboardSummaryDto
{
    public int TotalInvoices { get; set; }
    public int DraftInvoices { get; set; }
    public int FinalizedInvoices { get; set; }
    public int PaidInvoices { get; set; }
    public int MonthlyInvoices { get; set; }
    public decimal MonthlyRevenue { get; set; }
    public int TotalCompanies { get; set; }
    public int TotalTkaWorkers { get; set; }
    public double MonthlyInvoiceGrowth { get; set; }
    public double MonthlyRevenueGrowth { get; set; }
    
    public List<InvoiceDto> RecentInvoices { get; set; } = new();
    public List<DashboardCompanyDto> TopCompanies { get; set; } = new();
    public List<DashboardTkaDto> ActiveTkaWorkers { get; set; } = new();
    public List<ChartDataDto> InvoiceChartData { get; set; } = new();
    public List<ChartDataDto> RevenueChartData { get; set; } = new();
}

public class DashboardCompanyDto
{
    public int Id { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string Npwp { get; set; } = string.Empty;
    public decimal TotalRevenue { get; set; }
    public int InvoiceCount { get; set; }
    public DateTime? LastInvoiceDate { get; set; }
}

public class DashboardTkaDto
{
    public int Id { get; set; }
    public string Nama { get; set; } = string.Empty;
    public string Passport { get; set; } = string.Empty;
    public string Divisi { get; set; } = string.Empty;
    public int ActiveCompanyCount { get; set; }
    public int RecentInvoiceCount { get; set; }
    public DateTime? LastInvoiceDate { get; set; }
}

public class ChartDataDto
{
    public string Label { get; set; } = string.Empty;
    public double Value { get; set; }
    public DateTime Date { get; set; }
}

public class DashboardStatDto
{
    public string Title { get; set; } = string.Empty;
    public int Value { get; set; }
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
}

public class DashboardPerformanceDto
{
    public int MonthlyInvoices { get; set; }
    public decimal MonthlyRevenue { get; set; }
    public decimal AverageInvoiceValue { get; set; }
    public double InvoiceGrowthRate { get; set; }
    public double RevenueGrowthRate { get; set; }
    public int TotalActiveCompanies { get; set; }
    public int TotalActiveTka { get; set; }
    public int PendingDrafts { get; set; }
}