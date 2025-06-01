// E:\kp\4 invoice\Core\DTOs\DashboardDto.cs
namespace InvoiceApp.Core.DTOs;

public class DashboardDto
{
    public DashboardSummaryDto Summary { get; set; } = new();
    public List<RecentActivityDto> RecentActivities { get; set; } = new();
    public List<QuickStatDto> QuickStats { get; set; } = new();
    public PerformanceMetricsDto Performance { get; set; } = new();
}

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
    public string Color { get; set; } = string.Empty;
    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class RecentActivityDto
{
    public int Id { get; set; }
    public string ActivityType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public Dictionary<string, object> Data { get; set; } = new();
}

public class QuickStatDto
{
    public string Title { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string Trend { get; set; } = string.Empty; // "up", "down", "flat"
    public double? TrendValue { get; set; }
    public string Unit { get; set; } = string.Empty;
}
