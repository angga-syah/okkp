// E:\kp\4 invoice\Application\Mappers\TkaWorkerMapper.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Enums;

namespace InvoiceApp.Application.Mappers;

public static class TkaWorkerMapper
{
    public static TkaWorkerDto ToDto(TkaWorker tkaWorker)
    {
        if (tkaWorker == null) return new TkaWorkerDto();

        return new TkaWorkerDto
        {
            Id = tkaWorker.Id,
            TkaUuid = tkaWorker.TkaUuid,
            Nama = tkaWorker.Nama,
            Passport = tkaWorker.Passport,
            Divisi = tkaWorker.Divisi,
            JenisKelaminText = tkaWorker.JenisKelamin.ToString(),
            IsActive = tkaWorker.IsActive,
            CreatedAt = tkaWorker.CreatedAt,
            UpdatedAt = tkaWorker.UpdatedAt,
            FamilyMemberCount = tkaWorker.FamilyMembers?.Count(f => f.IsActive) ?? 0,
            ActiveCompanyAssignments = tkaWorker.CompanyTkaAssignments?
                .Count(a => a.IsActive && (a.EndDate == null || a.EndDate > DateTime.Now)) ?? 0,
            FamilyMembers = tkaWorker.FamilyMembers?
                .Where(f => f.IsActive)
                .Select(TkaFamilyMemberMapper.ToDto)
                .ToList() ?? new List<TkaFamilyMemberDto>()
        };
    }

    public static TkaWorker ToEntity(TkaWorkerDto dto)
    {
        return new TkaWorker
        {
            Id = dto.Id,
            TkaUuid = dto.TkaUuid != Guid.Empty ? dto.TkaUuid : Guid.NewGuid(),
            Nama = dto.Nama,
            Passport = dto.Passport,
            Divisi = dto.Divisi,
            JenisKelamin = Enum.Parse<Gender>(dto.JenisKelaminText, true),
            IsActive = dto.IsActive,
            CreatedAt = dto.CreatedAt == DateTime.MinValue ? DateTime.UtcNow : dto.CreatedAt,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public static void UpdateEntityFromDto(TkaWorker entity, TkaWorkerDto dto)
    {
        entity.Nama = dto.Nama;
        entity.Passport = dto.Passport;
        entity.Divisi = dto.Divisi;
        entity.JenisKelamin = Enum.Parse<Gender>(dto.JenisKelaminText, true);
        entity.IsActive = dto.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;
    }

    public static TkaSelectionItem ToSelectionItem(TkaWorker tkaWorker)
    {
        return new TkaSelectionItem
        {
            Id = tkaWorker.Id,
            DisplayName = $"{tkaWorker.Nama} (TKA - {tkaWorker.Divisi} - {tkaWorker.Passport})",
            TkaMainName = tkaWorker.Nama,
            Nama = tkaWorker.Nama,
            Passport = tkaWorker.Passport,
            Divisi = tkaWorker.Divisi,
            Relationship = "TKA",
            IsMainTka = true
        };
    }

    public static TkaWithStatsDto ToWithStatsDto(TkaWorker tkaWorker)
    {
        var dto = ToDto(tkaWorker);
        
        return new TkaWithStatsDto
        {
            Id = dto.Id,
            TkaUuid = dto.TkaUuid,
            Nama = dto.Nama,
            Passport = dto.Passport,
            Divisi = dto.Divisi,
            JenisKelaminText = dto.JenisKelaminText,
            IsActive = dto.IsActive,
            CreatedAt = dto.CreatedAt,
            UpdatedAt = dto.UpdatedAt,
            FamilyMemberCount = dto.FamilyMemberCount,
            ActiveCompanyAssignments = dto.ActiveCompanyAssignments,
            FamilyMembers = dto.FamilyMembers,
            
            // Additional stats
            TotalInvoices = tkaWorker.InvoiceLines?.Select(l => l.InvoiceId).Distinct().Count() ?? 0,
            TotalInvoiceAmount = tkaWorker.InvoiceLines?
                .Where(l => l.Invoice.Status == InvoiceStatus.Finalized || l.Invoice.Status == InvoiceStatus.Paid)
                .Sum(l => l.LineTotal) ?? 0,
            
            AverageInvoiceAmount = tkaWorker.InvoiceLines?.Any() == true 
                ? tkaWorker.InvoiceLines
                    .Where(l => l.Invoice.Status != InvoiceStatus.Cancelled)
                    .GroupBy(l => l.InvoiceId)
                    .Average(g => g.Sum(l => l.LineTotal))
                : 0,
            
            LatestInvoiceDate = tkaWorker.InvoiceLines?.Any() == true 
                ? tkaWorker.InvoiceLines.Max(l => l.Invoice.InvoiceDate) 
                : (DateTime?)null,
            
            CompanyAssignments = tkaWorker.CompanyTkaAssignments?
                .Where(a => a.IsActive)
                .Select(CompanyTkaAssignmentMapper.ToDto)
                .ToList() ?? new List<CompanyTkaAssignmentDto>()
        };
    }

    public static List<TkaWorkerDto> ToDtoList(IEnumerable<TkaWorker> tkaWorkers)
    {
        return tkaWorkers?.Select(ToDto).ToList() ?? new List<TkaWorkerDto>();
    }

    public static List<TkaSelectionItem> ToSelectionItemList(IEnumerable<TkaWorker> tkaWorkers, bool includeFamilyMembers = false)
    {
        var result = new List<TkaSelectionItem>();

        foreach (var tka in tkaWorkers ?? new List<TkaWorker>())
        {
            // Add main TKA
            result.Add(ToSelectionItem(tka));

            // Add family members if requested
            if (includeFamilyMembers && tka.FamilyMembers != null)
            {
                foreach (var family in tka.FamilyMembers.Where(f => f.IsActive))
                {
                    result.Add(TkaFamilyMemberMapper.ToSelectionItem(family, tka));
                }
            }
        }

        return result.OrderBy(x => x.TkaMainName).ThenBy(x => x.IsMainTka ? 0 : 1).ToList();
    }
}

public static class TkaFamilyMemberMapper
{
    public static TkaFamilyMemberDto ToDto(TkaFamilyMember familyMember)
    {
        if (familyMember == null) return new TkaFamilyMemberDto();

        return new TkaFamilyMemberDto
        {
            Id = familyMember.Id,
            FamilyUuid = familyMember.FamilyUuid,
            TkaId = familyMember.TkaId,
            TkaName = familyMember.TkaWorker?.Nama ?? string.Empty,
            Nama = familyMember.Nama,
            Passport = familyMember.Passport,
            JenisKelaminText = familyMember.JenisKelamin.ToString(),
            RelationshipText = familyMember.Relationship.ToString(),
            IsActive = familyMember.IsActive,
            CreatedAt = familyMember.CreatedAt
        };
    }

    public static TkaFamilyMember ToEntity(TkaFamilyMemberDto dto)
    {
        return new TkaFamilyMember
        {
            Id = dto.Id,
            FamilyUuid = dto.FamilyUuid != Guid.Empty ? dto.FamilyUuid : Guid.NewGuid(),
            TkaId = dto.TkaId,
            Nama = dto.Nama,
            Passport = dto.Passport,
            JenisKelamin = Enum.Parse<Gender>(dto.JenisKelaminText, true),
            Relationship = Enum.Parse<FamilyRelationship>(dto.RelationshipText, true),
            IsActive = dto.IsActive,
            CreatedAt = dto.CreatedAt == DateTime.MinValue ? DateTime.UtcNow : dto.CreatedAt
        };
    }

    public static void UpdateEntityFromDto(TkaFamilyMember entity, TkaFamilyMemberDto dto)
    {
        entity.Nama = dto.Nama;
        entity.Passport = dto.Passport;
        entity.JenisKelamin = Enum.Parse<Gender>(dto.JenisKelaminText, true);
        entity.Relationship = Enum.Parse<FamilyRelationship>(dto.RelationshipText, true);
        entity.IsActive = dto.IsActive;
    }

    public static TkaSelectionItem ToSelectionItem(TkaFamilyMember familyMember, TkaWorker mainTka)
    {
        return new TkaSelectionItem
        {
            Id = familyMember.Id + 100000, // Offset to avoid ID collision with main TKA
            DisplayName = $"{familyMember.Nama} ({familyMember.Relationship} of {mainTka.Nama} - {familyMember.Passport})",
            TkaMainName = mainTka.Nama,
            Nama = familyMember.Nama,
            Passport = familyMember.Passport,
            Divisi = mainTka.Divisi,
            Relationship = familyMember.Relationship.ToString(),
            IsMainTka = false
        };
    }

    public static List<TkaFamilyMemberDto> ToDtoList(IEnumerable<TkaFamilyMember> familyMembers)
    {
        return familyMembers?.Select(ToDto).ToList() ?? new List<TkaFamilyMemberDto>();
    }
}

public static class CompanyTkaAssignmentMapper
{
    public static CompanyTkaAssignmentDto ToDto(CompanyTkaAssignment assignment)
    {
        if (assignment == null) return new CompanyTkaAssignmentDto();

        return new CompanyTkaAssignmentDto
        {
            Id = assignment.Id,
            CompanyId = assignment.CompanyId,
            CompanyName = assignment.Company?.CompanyName ?? string.Empty,
            TkaId = assignment.TkaId,
            TkaName = assignment.TkaWorker?.Nama ?? string.Empty,
            TkaPassport = assignment.TkaWorker?.Passport ?? string.Empty,
            TkaDivisi = assignment.TkaWorker?.Divisi ?? string.Empty,
            AssignmentDate = assignment.AssignmentDate,
            EndDate = assignment.EndDate,
            IsActive = assignment.IsActive,
            Notes = assignment.Notes,
            CreatedAt = assignment.CreatedAt,
            FamilyMembers = assignment.TkaWorker?.FamilyMembers?
                .Where(f => f.IsActive)
                .Select(TkaFamilyMemberMapper.ToDto)
                .ToList() ?? new List<TkaFamilyMemberDto>()
        };
    }

    public static CompanyTkaAssignment ToEntity(CompanyTkaAssignmentDto dto)
    {
        return new CompanyTkaAssignment
        {
            Id = dto.Id,
            CompanyId = dto.CompanyId,
            TkaId = dto.TkaId,
            AssignmentDate = dto.AssignmentDate,
            EndDate = dto.EndDate,
            IsActive = dto.IsActive,
            Notes = dto.Notes,
            CreatedAt = dto.CreatedAt == DateTime.MinValue ? DateTime.UtcNow : dto.CreatedAt
        };
    }

    public static List<CompanyTkaAssignmentDto> ToDtoList(IEnumerable<CompanyTkaAssignment> assignments)
    {
        return assignments?.Select(ToDto).ToList() ?? new List<CompanyTkaAssignmentDto>();
    }
}

// Additional DTOs for TKA mapping
public class TkaWithStatsDto : TkaWorkerDto
{
    public int TotalInvoices { get; set; }
    public decimal TotalInvoiceAmount { get; set; }
    public decimal AverageInvoiceAmount { get; set; }
    public DateTime? LatestInvoiceDate { get; set; }
    public List<CompanyTkaAssignmentDto> CompanyAssignments { get; set; } = new();
}