// E:\kp\4 invoice\Application\Mappers\CompanyMapper.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;

namespace InvoiceApp.Application.Mappers;

public static class CompanyMapper
{
    public static CompanyDto ToDto(Company company)
    {
        if (company == null) return new CompanyDto();

        return new CompanyDto
        {
            Id = company.Id,
            CompanyUuid = company.CompanyUuid,
            CompanyName = company.CompanyName,
            Npwp = company.Npwp,
            Idtku = company.Idtku,
            Address = company.Address,
            Email = company.Email,
            Phone = company.Phone,
            ContactPerson = company.ContactPerson,
            IsActive = company.IsActive,
            CreatedAt = company.CreatedAt,
            UpdatedAt = company.UpdatedAt,
            InvoiceCount = company.Invoices?.Count ?? 0,
            TotalInvoiceAmount = company.Invoices?
                .Where(i => i.Status == InvoiceStatus.Finalized || i.Status == InvoiceStatus.Paid)
                .Sum(i => i.TotalAmount) ?? 0,
            ActiveTkaCount = company.CompanyTkaAssignments?
                .Count(a => a.IsActive && (a.EndDate == null || a.EndDate > DateTime.Now)) ?? 0,
            JobDescriptions = company.JobDescriptions?
                .Where(j => j.IsActive)
                .Select(JobDescriptionMapper.ToDto)
                .OrderBy(j => j.SortOrder)
                .ToList() ?? new List<JobDescriptionDto>()
        };
    }

    public static Company ToEntity(CompanyDto dto)
    {
        return new Company
        {
            Id = dto.Id,
            CompanyUuid = dto.CompanyUuid != Guid.Empty ? dto.CompanyUuid : Guid.NewGuid(),
            CompanyName = dto.CompanyName,
            Npwp = dto.Npwp,
            Idtku = dto.Idtku,
            Address = dto.Address,
            Email = dto.Email,
            Phone = dto.Phone,
            ContactPerson = dto.ContactPerson,
            IsActive = dto.IsActive,
            CreatedAt = dto.CreatedAt == DateTime.MinValue ? DateTime.UtcNow : dto.CreatedAt,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public static void UpdateEntityFromDto(Company entity, CompanyDto dto)
    {
        entity.CompanyName = dto.CompanyName;
        entity.Npwp = dto.Npwp;
        entity.Idtku = dto.Idtku;
        entity.Address = dto.Address;
        entity.Email = dto.Email;
        entity.Phone = dto.Phone;
        entity.ContactPerson = dto.ContactPerson;
        entity.IsActive = dto.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;
    }

    public static CompanyWithStatsDto ToWithStatsDto(Company company)
    {
        var dto = ToDto(company);
        
        return new CompanyWithStatsDto
        {
            Id = dto.Id,
            CompanyUuid = dto.CompanyUuid,
            CompanyName = dto.CompanyName,
            Npwp = dto.Npwp,
            Idtku = dto.Idtku,
            Address = dto.Address,
            Email = dto.Email,
            Phone = dto.Phone,
            ContactPerson = dto.ContactPerson,
            IsActive = dto.IsActive,
            CreatedAt = dto.CreatedAt,
            UpdatedAt = dto.UpdatedAt,
            InvoiceCount = dto.InvoiceCount,
            TotalInvoiceAmount = dto.TotalInvoiceAmount,
            ActiveTkaCount = dto.ActiveTkaCount,
            JobDescriptions = dto.JobDescriptions,
            
            // Additional stats
            DraftInvoiceCount = company.Invoices?.Count(i => i.Status == InvoiceStatus.Draft) ?? 0,
            FinalizedInvoiceCount = company.Invoices?.Count(i => i.Status == InvoiceStatus.Finalized) ?? 0,
            PaidInvoiceCount = company.Invoices?.Count(i => i.Status == InvoiceStatus.Paid) ?? 0,
            CancelledInvoiceCount = company.Invoices?.Count(i => i.Status == InvoiceStatus.Cancelled) ?? 0,
            
            AverageInvoiceAmount = company.Invoices?.Any() == true 
                ? company.Invoices.Where(i => i.Status != InvoiceStatus.Cancelled).Average(i => i.TotalAmount) 
                : 0,
            
            HighestInvoiceAmount = company.Invoices?.Any() == true 
                ? company.Invoices.Where(i => i.Status != InvoiceStatus.Cancelled).Max(i => i.TotalAmount) 
                : 0,
            
            LatestInvoiceDate = company.Invoices?.Any() == true 
                ? company.Invoices.Max(i => i.InvoiceDate) 
                : (DateTime?)null,
            
            ActiveJobDescriptionCount = company.JobDescriptions?.Count(j => j.IsActive) ?? 0,
            TotalJobDescriptionCount = company.JobDescriptions?.Count ?? 0
        };
    }

    public static CompanySelectionDto ToSelectionDto(Company company)
    {
        return new CompanySelectionDto
        {
            Id = company.Id,
            CompanyName = company.CompanyName,
            Npwp = company.Npwp,
            Idtku = company.Idtku,
            DisplayName = $"{company.CompanyName} (NPWP: {company.Npwp})",
            IsActive = company.IsActive
        };
    }

    public static List<CompanyDto> ToDtoList(IEnumerable<Company> companies)
    {
        return companies?.Select(ToDto).ToList() ?? new List<CompanyDto>();
    }

    public static List<CompanyWithStatsDto> ToWithStatsDtoList(IEnumerable<Company> companies)
    {
        return companies?.Select(ToWithStatsDto).ToList() ?? new List<CompanyWithStatsDto>();
    }

    public static List<CompanySelectionDto> ToSelectionDtoList(IEnumerable<Company> companies)
    {
        return companies?.Select(ToSelectionDto).ToList() ?? new List<CompanySelectionDto>();
    }
}

public static class JobDescriptionMapper
{
    public static JobDescriptionDto ToDto(JobDescription jobDescription)
    {
        if (jobDescription == null) return new JobDescriptionDto();

        return new JobDescriptionDto
        {
            Id = jobDescription.Id,
            JobUuid = jobDescription.JobUuid,
            CompanyId = jobDescription.CompanyId,
            CompanyName = jobDescription.Company?.CompanyName ?? string.Empty,
            JobName = jobDescription.JobName,
            JobDescription = jobDescription.JobDescription,
            Price = jobDescription.Price,
            IsActive = jobDescription.IsActive,
            SortOrder = jobDescription.SortOrder,
            CreatedAt = jobDescription.CreatedAt,
            UpdatedAt = jobDescription.UpdatedAt
        };
    }

    public static JobDescription ToEntity(JobDescriptionDto dto)
    {
        return new JobDescription
        {
            Id = dto.Id,
            JobUuid = dto.JobUuid != Guid.Empty ? dto.JobUuid : Guid.NewGuid(),
            CompanyId = dto.CompanyId,
            JobName = dto.JobName,
            JobDescription = dto.JobDescription,
            Price = dto.Price,
            IsActive = dto.IsActive,
            SortOrder = dto.SortOrder,
            CreatedAt = dto.CreatedAt == DateTime.MinValue ? DateTime.UtcNow : dto.CreatedAt,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public static void UpdateEntityFromDto(JobDescription entity, JobDescriptionDto dto)
    {
        entity.JobName = dto.JobName;
        entity.JobDescription = dto.JobDescription;
        entity.Price = dto.Price;
        entity.IsActive = dto.IsActive;
        entity.SortOrder = dto.SortOrder;
        entity.UpdatedAt = DateTime.UtcNow;
    }

    public static List<JobDescriptionDto> ToDtoList(IEnumerable<JobDescription> jobDescriptions)
    {
        return jobDescriptions?.Select(ToDto).ToList() ?? new List<JobDescriptionDto>();
    }
}

// Additional DTOs for Company mapping
public class CompanyWithStatsDto : CompanyDto
{
    public int DraftInvoiceCount { get; set; }
    public int FinalizedInvoiceCount { get; set; }
    public int PaidInvoiceCount { get; set; }
    public int CancelledInvoiceCount { get; set; }
    public decimal AverageInvoiceAmount { get; set; }
    public decimal HighestInvoiceAmount { get; set; }
    public DateTime? LatestInvoiceDate { get; set; }
    public int ActiveJobDescriptionCount { get; set; }
    public int TotalJobDescriptionCount { get; set; }
}

public class CompanySelectionDto
{
    public int Id { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string Npwp { get; set; } = string.Empty;
    public string Idtku { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}