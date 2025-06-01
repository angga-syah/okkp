// E:\kp\4 invoice\Application\Validators\TkaWorkerValidator.cs
using FluentValidation;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;
using InvoiceApp.Core.Interfaces;
using System.Text.RegularExpressions;

namespace InvoiceApp.Application.Validators;

public class TkaWorkerValidator : AbstractValidator<TkaWorkerDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public TkaWorkerValidator(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;

        RuleFor(x => x.Nama)
            .NotEmpty().WithMessage("Name is required")
            .MinimumLength(2).WithMessage("Name must be at least 2 characters")
            .MaximumLength(100).WithMessage("Name cannot exceed 100 characters")
            .Matches(@"^[a-zA-Z\s\.\,\-\']+$").WithMessage("Name contains invalid characters");

        RuleFor(x => x.Passport)
            .NotEmpty().WithMessage("Passport number is required")
            .MinimumLength(6).WithMessage("Passport number must be at least 6 characters")
            .MaximumLength(20).WithMessage("Passport number cannot exceed 20 characters")
            .Matches(@"^[A-Z0-9]+$").WithMessage("Passport number can only contain uppercase letters and numbers")
            .MustAsync(BeUniquePassport).WithMessage("Passport number already exists");

        RuleFor(x => x.Divisi)
            .MaximumLength(100).WithMessage("Division cannot exceed 100 characters")
            .When(x => !string.IsNullOrEmpty(x.Divisi));

        RuleFor(x => x.JenisKelaminText)
            .NotEmpty().WithMessage("Gender is required")
            .Must(BeValidGender).WithMessage("Invalid gender value");

        // Business rules
        RuleFor(x => x)
            .MustAsync(NotHaveInvoiceLinesWhenDeactivating).WithMessage("Cannot deactivate TKA worker with existing invoice lines")
            .When(x => x.Id > 0 && !x.IsActive);
    }

    private bool BeValidGender(string gender)
    {
        return Enum.TryParse<Gender>(gender, true, out _);
    }

    private async Task<bool> BeUniquePassport(TkaWorkerDto tkaWorker, string passport, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(passport)) return true;
        
        var existingTka = await _unitOfWork.TkaWorkerRepository.GetByPassportAsync(passport);
        return existingTka == null || existingTka.Id == tkaWorker.Id;
    }

    private async Task<bool> NotHaveInvoiceLinesWhenDeactivating(TkaWorkerDto tkaWorker, CancellationToken cancellationToken)
    {
        if (tkaWorker.Id == 0 || tkaWorker.IsActive) return true;
        
        var hasInvoiceLines = await _unitOfWork.InvoiceRepository.HasInvoiceLinesByTkaAsync(tkaWorker.Id);
        return !hasInvoiceLines;
    }
}

public class TkaFamilyMemberValidator : AbstractValidator<TkaFamilyMemberDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public TkaFamilyMemberValidator(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;

        RuleFor(x => x.TkaId)
            .GreaterThan(0).WithMessage("TKA worker must be selected")
            .MustAsync(BeValidTka).WithMessage("Selected TKA worker does not exist or is inactive");

        RuleFor(x => x.Nama)
            .NotEmpty().WithMessage("Name is required")
            .MinimumLength(2).WithMessage("Name must be at least 2 characters")
            .MaximumLength(100).WithMessage("Name cannot exceed 100 characters")
            .Matches(@"^[a-zA-Z\s\.\,\-\']+$").WithMessage("Name contains invalid characters");

        RuleFor(x => x.Passport)
            .NotEmpty().WithMessage("Passport number is required")
            .MinimumLength(6).WithMessage("Passport number must be at least 6 characters")
            .MaximumLength(20).WithMessage("Passport number cannot exceed 20 characters")
            .Matches(@"^[A-Z0-9]+$").WithMessage("Passport number can only contain uppercase letters and numbers")
            .MustAsync(BeUniquePassport).WithMessage("Passport number already exists");

        RuleFor(x => x.JenisKelaminText)
            .NotEmpty().WithMessage("Gender is required")
            .Must(BeValidGender).WithMessage("Invalid gender value");

        RuleFor(x => x.RelationshipText)
            .NotEmpty().WithMessage("Relationship is required")
            .Must(BeValidRelationship).WithMessage("Invalid relationship value");

        // Business rules
        RuleFor(x => x)
            .MustAsync(NotExceedFamilyLimits).WithMessage("TKA worker already has maximum allowed family members for this relationship type")
            .MustAsync(NotHaveInvoiceLinesWhenDeactivating).WithMessage("Cannot deactivate family member with existing invoice lines")
            .When(x => x.Id > 0 && !x.IsActive);
    }

    private bool BeValidGender(string gender)
    {
        return Enum.TryParse<Gender>(gender, true, out _);
    }

    private bool BeValidRelationship(string relationship)
    {
        return Enum.TryParse<FamilyRelationship>(relationship, true, out _);
    }

    private async Task<bool> BeValidTka(int tkaId, CancellationToken cancellationToken)
    {
        var tka = await _unitOfWork.TkaWorkerRepository.GetByIdAsync(tkaId);
        return tka != null && tka.IsActive;
    }

    private async Task<bool> BeUniquePassport(TkaFamilyMemberDto familyMember, string passport, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(passport)) return true;
        
        // Check against both TKA workers and other family members
        var existingTka = await _unitOfWork.TkaWorkerRepository.GetByPassportAsync(passport);
        if (existingTka != null) return false;
        
        var existingFamily = await _unitOfWork.TkaWorkerRepository.GetFamilyMemberByPassportAsync(passport);
        return existingFamily == null || existingFamily.Id == familyMember.Id;
    }

    private async Task<bool> NotExceedFamilyLimits(TkaFamilyMemberDto familyMember, CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<FamilyRelationship>(familyMember.RelationshipText, true, out var relationship))
            return true;

        var existingFamily = await _unitOfWork.TkaWorkerRepository.GetFamilyMembersAsync(familyMember.TkaId, true);
        var sameRelationshipCount = existingFamily.Count(f => 
            f.Relationship == relationship && f.Id != familyMember.Id);

        // Business rules for family limits
        return relationship switch
        {
            FamilyRelationship.Spouse => sameRelationshipCount < 1, // Only one spouse allowed
            FamilyRelationship.Parent => sameRelationshipCount < 2, // Maximum 2 parents
            FamilyRelationship.Child => sameRelationshipCount < 10, // Maximum 10 children (reasonable limit)
            _ => true
        };
    }

    private async Task<bool> NotHaveInvoiceLinesWhenDeactivating(TkaFamilyMemberDto familyMember, CancellationToken cancellationToken)
    {
        if (familyMember.Id == 0 || familyMember.IsActive) return true;
        
        var hasInvoiceLines = await _unitOfWork.InvoiceRepository.HasInvoiceLinesByFamilyMemberAsync(familyMember.Id);
        return !hasInvoiceLines;
    }
}

public class TkaSelectionItemValidator : AbstractValidator<TkaSelectionItem>
{
    public TkaSelectionItemValidator()
    {
        RuleFor(x => x.Id)
            .GreaterThan(0).WithMessage("Invalid TKA selection");

        RuleFor(x => x.Nama)
            .NotEmpty().WithMessage("TKA name is required");

        RuleFor(x => x.Passport)
            .NotEmpty().WithMessage("Passport number is required");

        RuleFor(x => x.TkaMainName)
            .NotEmpty().WithMessage("Main TKA name is required");

        RuleFor(x => x.Relationship)
            .NotEmpty().WithMessage("Relationship type is required");
    }
}

// Bulk validation for TKA workers
public class BulkTkaWorkerValidator : AbstractValidator<List<TkaWorkerDto>>
{
    public BulkTkaWorkerValidator()
    {
        RuleFor(x => x)
            .NotEmpty().WithMessage("TKA worker list cannot be empty")
            .Must(HaveUniquePassports).WithMessage("Duplicate passport numbers found in the list");

        RuleForEach(x => x).SetValidator(new TkaWorkerValidator(null!)); // Note: UnitOfWork will be injected separately
    }

    private bool HaveUniquePassports(List<TkaWorkerDto> tkaWorkers)
    {
        var passports = tkaWorkers.Where(t => !string.IsNullOrEmpty(t.Passport)).Select(t => t.Passport).ToList();
        return passports.Count == passports.Distinct().Count();
    }
}

// Validation for TKA assignment to companies
public class TkaCompanyAssignmentValidator : AbstractValidator<CompanyTkaAssignmentDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public TkaCompanyAssignmentValidator(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;

        RuleFor(x => x.CompanyId)
            .GreaterThan(0).WithMessage("Company must be selected")
            .MustAsync(BeValidCompany).WithMessage("Selected company does not exist or is inactive");

        RuleFor(x => x.TkaId)
            .GreaterThan(0).WithMessage("TKA worker must be selected")
            .MustAsync(BeValidTka).WithMessage("Selected TKA worker does not exist or is inactive");

        RuleFor(x => x.AssignmentDate)
            .NotEmpty().WithMessage("Assignment date is required")
            .LessThanOrEqualTo(DateTime.Today).WithMessage("Assignment date cannot be in the future");

        RuleFor(x => x.EndDate)
            .GreaterThan(x => x.AssignmentDate).WithMessage("End date must be after assignment date")
            .When(x => x.EndDate.HasValue);

        RuleFor(x => x.Notes)
            .MaximumLength(500).WithMessage("Notes cannot exceed 500 characters");

        // Business rules
        RuleFor(x => x)
            .MustAsync(NotHaveDuplicateActiveAssignment).WithMessage("TKA worker is already assigned to this company in the same period")
            .When(x => x.IsActive);
    }

    private async Task<bool> BeValidCompany(int companyId, CancellationToken cancellationToken)
    {
        var company = await _unitOfWork.CompanyRepository.GetByIdAsync(companyId);
        return company != null && company.IsActive;
    }

    private async Task<bool> BeValidTka(int tkaId, CancellationToken cancellationToken)
    {
        var tka = await _unitOfWork.TkaWorkerRepository.GetByIdAsync(tkaId);
        return tka != null && tka.IsActive;
    }

    private async Task<bool> NotHaveDuplicateActiveAssignment(CompanyTkaAssignmentDto assignment, CancellationToken cancellationToken)
    {
        var existingAssignments = await _unitOfWork.CompanyRepository.GetTkaAssignmentsAsync(assignment.CompanyId, true);
        
        var conflictingAssignment = existingAssignments.FirstOrDefault(a => 
            a.TkaId == assignment.TkaId && 
            a.Id != assignment.Id &&
            a.IsActive &&
            (a.EndDate == null || a.EndDate > assignment.AssignmentDate));
        
        return conflictingAssignment == null;
    }
}

// Custom validation for TKA search and filtering
public class TkaSearchValidator : AbstractValidator<TkaSearchDto>
{
    public TkaSearchValidator()
    {
        RuleFor(x => x.SearchTerm)
            .MinimumLength(2).WithMessage("Search term must be at least 2 characters")
            .When(x => !string.IsNullOrEmpty(x.SearchTerm));

        RuleFor(x => x.MaxResults)
            .GreaterThan(0).WithMessage("Max results must be greater than zero")
            .LessThanOrEqualTo(1000).WithMessage("Max results cannot exceed 1000");

        RuleFor(x => x.Divisi)
            .MaximumLength(100).WithMessage("Division filter cannot exceed 100 characters")
            .When(x => !string.IsNullOrEmpty(x.Divisi));
    }
}

// Supporting DTO for search validation
public class TkaSearchDto
{
    public string? SearchTerm { get; set; }
    public int MaxResults { get; set; } = 20;
    public string? Divisi { get; set; }
    public Gender? JenisKelamin { get; set; }
    public bool? IsActive { get; set; }
    public int? CompanyId { get; set; }
}