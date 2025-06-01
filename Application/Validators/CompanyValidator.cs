// E:\kp\4 invoice\Application\Validators\CompanyValidator.cs
using FluentValidation;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Interfaces;
using System.Text.RegularExpressions;

namespace InvoiceApp.Application.Validators;

public class CompanyValidator : AbstractValidator<CompanyDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public CompanyValidator(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;

        RuleFor(x => x.CompanyName)
            .NotEmpty().WithMessage("Company name is required")
            .MinimumLength(2).WithMessage("Company name must be at least 2 characters")
            .MaximumLength(200).WithMessage("Company name cannot exceed 200 characters")
            .Matches(@"^[a-zA-Z0-9\s\.\,\-\&\(\)]+$").WithMessage("Company name contains invalid characters");

        RuleFor(x => x.Npwp)
            .NotEmpty().WithMessage("NPWP is required")
            .Must(BeValidNpwpFormat).WithMessage("NPWP format is invalid. Format should be: XX.XXX.XXX.X-XXX.XXX")
            .MustAsync(BeUniqueNpwp).WithMessage("NPWP already exists");

        RuleFor(x => x.Idtku)
            .NotEmpty().WithMessage("IDTKU is required")
            .Must(BeValidIdtkuFormat).WithMessage("IDTKU format is invalid. Format should be: XX.XXX.XXX.X-XXX.XXX")
            .MustAsync(BeUniqueIdtku).WithMessage("IDTKU already exists");

        RuleFor(x => x.Address)
            .NotEmpty().WithMessage("Address is required")
            .MinimumLength(10).WithMessage("Address must be at least 10 characters")
            .MaximumLength(500).WithMessage("Address cannot exceed 500 characters");

        RuleFor(x => x.Email)
            .EmailAddress().WithMessage("Invalid email format")
            .MaximumLength(100).WithMessage("Email cannot exceed 100 characters")
            .When(x => !string.IsNullOrEmpty(x.Email));

        RuleFor(x => x.Phone)
            .Must(BeValidPhoneFormat).WithMessage("Invalid phone number format")
            .MaximumLength(20).WithMessage("Phone number cannot exceed 20 characters")
            .When(x => !string.IsNullOrEmpty(x.Phone));

        RuleFor(x => x.ContactPerson)
            .MaximumLength(100).WithMessage("Contact person cannot exceed 100 characters")
            .Matches(@"^[a-zA-Z\s\.\,\-]+$").WithMessage("Contact person contains invalid characters")
            .When(x => !string.IsNullOrEmpty(x.ContactPerson));

        // Business rules
        RuleFor(x => x)
            .MustAsync(NotHaveActiveInvoicesWhenDeactivating).WithMessage("Cannot deactivate company with active invoices")
            .When(x => x.Id > 0 && !x.IsActive);
    }

    private bool BeValidNpwpFormat(string npwp)
    {
        if (string.IsNullOrEmpty(npwp)) return false;
        
        // NPWP format: XX.XXX.XXX.X-XXX.XXX (15 digits total)
        var npwpPattern = @"^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$";
        return Regex.IsMatch(npwp, npwpPattern);
    }

    private bool BeValidIdtkuFormat(string idtku)
    {
        if (string.IsNullOrEmpty(idtku)) return false;
        
        // IDTKU format: XX.XXX.XXX.X-XXX.XXX (same as NPWP)
        var idtkuPattern = @"^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$";
        return Regex.IsMatch(idtku, idtkuPattern);
    }

    private bool BeValidPhoneFormat(string? phone)
    {
        if (string.IsNullOrEmpty(phone)) return true;
        
        // Indonesian phone number formats: +62, 0, or direct numbers
        var phonePattern = @"^(\+62|62|0)?[\d\-\s\(\)]+$";
        return Regex.IsMatch(phone, phonePattern) && phone.Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", "").Length >= 8;
    }

    private async Task<bool> BeUniqueNpwp(CompanyDto company, string npwp, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(npwp)) return true;
        
        var existingCompany = await _unitOfWork.CompanyRepository.GetByNpwpAsync(npwp);
        return existingCompany == null || existingCompany.Id == company.Id;
    }

    private async Task<bool> BeUniqueIdtku(CompanyDto company, string idtku, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(idtku)) return true;
        
        var existingCompany = await _unitOfWork.CompanyRepository.GetByIdtkuAsync(idtku);
        return existingCompany == null || existingCompany.Id == company.Id;
    }

    private async Task<bool> NotHaveActiveInvoicesWhenDeactivating(CompanyDto company, CancellationToken cancellationToken)
    {
        if (company.Id == 0 || company.IsActive) return true;
        
        var hasActiveInvoices = await _unitOfWork.InvoiceRepository.HasActiveInvoicesByCompanyAsync(company.Id);
        return !hasActiveInvoices;
    }
}

public class JobDescriptionValidator : AbstractValidator<JobDescriptionDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public JobDescriptionValidator(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;

        RuleFor(x => x.CompanyId)
            .GreaterThan(0).WithMessage("Company must be selected")
            .MustAsync(BeValidCompany).WithMessage("Selected company does not exist or is inactive");

        RuleFor(x => x.JobName)
            .NotEmpty().WithMessage("Job name is required")
            .MinimumLength(2).WithMessage("Job name must be at least 2 characters")
            .MaximumLength(200).WithMessage("Job name cannot exceed 200 characters");

        RuleFor(x => x.JobDescription)
            .NotEmpty().WithMessage("Job description is required")
            .MinimumLength(5).WithMessage("Job description must be at least 5 characters")
            .MaximumLength(1000).WithMessage("Job description cannot exceed 1000 characters");

        RuleFor(x => x.Price)
            .GreaterThan(0).WithMessage("Price must be greater than zero")
            .LessThan(1000000000).WithMessage("Price cannot exceed 999,999,999");

        RuleFor(x => x.SortOrder)
            .GreaterThanOrEqualTo(0).WithMessage("Sort order cannot be negative");

        // Business rules
        RuleFor(x => x)
            .MustAsync(BeUniqueJobNameInCompany).WithMessage("Job name already exists in this company")
            .MustAsync(NotBeUsedInInvoicesWhenDeactivating).WithMessage("Cannot deactivate job description that is used in invoices")
            .When(x => x.Id > 0 && !x.IsActive);
    }

    private async Task<bool> BeValidCompany(int companyId, CancellationToken cancellationToken)
    {
        var company = await _unitOfWork.CompanyRepository.GetByIdAsync(companyId);
        return company != null && company.IsActive;
    }

    private async Task<bool> BeUniqueJobNameInCompany(JobDescriptionDto jobDescription, CancellationToken cancellationToken)
    {
        var existingJobs = await _unitOfWork.CompanyRepository.GetJobDescriptionsAsync(jobDescription.CompanyId);
        var duplicateJob = existingJobs.FirstOrDefault(j => 
            j.JobName.Equals(jobDescription.JobName, StringComparison.OrdinalIgnoreCase) && 
            j.Id != jobDescription.Id);
        
        return duplicateJob == null;
    }

    private async Task<bool> NotBeUsedInInvoicesWhenDeactivating(JobDescriptionDto jobDescription, CancellationToken cancellationToken)
    {
        if (jobDescription.Id == 0 || jobDescription.IsActive) return true;
        
        var isUsedInInvoices = await _unitOfWork.InvoiceRepository.IsJobDescriptionUsedAsync(jobDescription.Id);
        return !isUsedInInvoices;
    }
}

public class CompanyTkaAssignmentValidator : AbstractValidator<CompanyTkaAssignmentDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public CompanyTkaAssignmentValidator(IUnitOfWork unitOfWork)
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
            .MustAsync(NotHaveDuplicateActiveAssignment).WithMessage("TKA worker is already assigned to this company")
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
        var existingAssignment = await _unitOfWork.CompanyRepository.GetActiveAssignmentAsync(assignment.CompanyId, assignment.TkaId);
        return existingAssignment == null || existingAssignment.Id == assignment.Id;
    }
}

// Bulk validation for companies
public class BulkCompanyValidator : AbstractValidator<List<CompanyDto>>
{
    public BulkCompanyValidator()
    {
        RuleFor(x => x)
            .NotEmpty().WithMessage("Company list cannot be empty")
            .Must(HaveUniqueNpwps).WithMessage("Duplicate NPWPs found in the list")
            .Must(HaveUniqueIdtkus).WithMessage("Duplicate IDTKUs found in the list");

        RuleForEach(x => x).SetValidator(new CompanyValidator(null!)); // Note: UnitOfWork will be injected separately
    }

    private bool HaveUniqueNpwps(List<CompanyDto> companies)
    {
        var npwps = companies.Where(c => !string.IsNullOrEmpty(c.Npwp)).Select(c => c.Npwp).ToList();
        return npwps.Count == npwps.Distinct().Count();
    }

    private bool HaveUniqueIdtkus(List<CompanyDto> companies)
    {
        var idtkus = companies.Where(c => !string.IsNullOrEmpty(c.Idtku)).Select(c => c.Idtku).ToList();
        return idtkus.Count == idtkus.Distinct().Count();
    }
}