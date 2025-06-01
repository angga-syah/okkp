// E:\kp\4 invoice\Application\Validators\InvoiceValidator.cs
using FluentValidation;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Interfaces;

namespace InvoiceApp.Application.Validators;

public class InvoiceValidator : AbstractValidator<InvoiceDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public InvoiceValidator(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;

        RuleFor(x => x.InvoiceNumber)
            .NotEmpty().WithMessage("Invoice number is required")
            .MaximumLength(50).WithMessage("Invoice number cannot exceed 50 characters")
            .Matches(@"^[A-Z0-9\-\/]+$").WithMessage("Invoice number can only contain uppercase letters, numbers, hyphens, and forward slashes");

        RuleFor(x => x.CompanyId)
            .GreaterThan(0).WithMessage("Company must be selected")
            .MustAsync(BeValidCompany).WithMessage("Selected company does not exist or is inactive");

        RuleFor(x => x.InvoiceDate)
            .NotEmpty().WithMessage("Invoice date is required")
            .LessThanOrEqualTo(DateTime.Today.AddDays(30)).WithMessage("Invoice date cannot be more than 30 days in the future");

        RuleFor(x => x.DueDate)
            .GreaterThanOrEqualTo(x => x.InvoiceDate).WithMessage("Due date must be on or after invoice date")
            .When(x => x.DueDate.HasValue);

        RuleFor(x => x.VatPercentage)
            .GreaterThanOrEqualTo(0).WithMessage("VAT percentage cannot be negative")
            .LessThanOrEqualTo(100).WithMessage("VAT percentage cannot exceed 100%");

        RuleFor(x => x.Subtotal)
            .GreaterThanOrEqualTo(0).WithMessage("Subtotal cannot be negative");

        RuleFor(x => x.VatAmount)
            .GreaterThanOrEqualTo(0).WithMessage("VAT amount cannot be negative");

        RuleFor(x => x.TotalAmount)
            .GreaterThan(0).WithMessage("Total amount must be greater than zero");

        RuleFor(x => x.StatusText)
            .NotEmpty().WithMessage("Status is required")
            .Must(BeValidStatus).WithMessage("Invalid invoice status");

        RuleFor(x => x.InvoiceLines)
            .NotEmpty().WithMessage("Invoice must have at least one line item")
            .Must(HaveValidLineNumbers).WithMessage("Invoice lines must have valid baris numbers");

        RuleForEach(x => x.InvoiceLines).SetValidator(new InvoiceLineValidator(_unitOfWork));

        RuleFor(x => x.BankAccountId)
            .MustAsync(BeValidBankAccount).WithMessage("Selected bank account does not exist or is inactive")
            .When(x => x.BankAccountId.HasValue);

        RuleFor(x => x.Notes)
            .MaximumLength(1000).WithMessage("Notes cannot exceed 1000 characters");

        // Business rule validations
        RuleFor(x => x)
            .MustAsync(HaveUniqueInvoiceNumber).WithMessage("Invoice number already exists")
            .When(x => x.Id == 0); // Only for new invoices

        RuleFor(x => x)
            .Must(HaveValidTotals).WithMessage("Invoice totals are not calculated correctly");

        RuleFor(x => x)
            .MustAsync(HaveValidTkaAssignments).WithMessage("All TKA workers must be assigned to the selected company");
    }

    private async Task<bool> BeValidCompany(int companyId, CancellationToken cancellationToken)
    {
        var company = await _unitOfWork.CompanyRepository.GetByIdAsync(companyId);
        return company != null && company.IsActive;
    }

    private async Task<bool> BeValidBankAccount(int? bankAccountId, CancellationToken cancellationToken)
    {
        if (!bankAccountId.HasValue) return true;
        
        var bankAccount = await _unitOfWork.SettingsRepository.GetBankAccountByIdAsync(bankAccountId.Value);
        return bankAccount != null && bankAccount.IsActive;
    }

    private bool BeValidStatus(string status)
    {
        return Enum.TryParse<InvoiceStatus>(status, true, out _);
    }

    private bool HaveValidLineNumbers(List<InvoiceLineDto> lines)
    {
        if (!lines.Any()) return false;
        
        // Check that all line numbers are positive
        return lines.All(l => l.Baris > 0 && l.LineOrder > 0);
    }

    private async Task<bool> HaveUniqueInvoiceNumber(InvoiceDto invoice, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(invoice.InvoiceNumber)) return true; // Will be caught by NotEmpty rule
        
        var existingInvoice = await _unitOfWork.InvoiceRepository.GetByNumberAsync(invoice.InvoiceNumber);
        return existingInvoice == null || existingInvoice.Id == invoice.Id;
    }

    private bool HaveValidTotals(InvoiceDto invoice)
    {
        if (!invoice.InvoiceLines.Any()) return false;

        var calculatedSubtotal = invoice.InvoiceLines.Sum(l => l.LineTotal);
        var calculatedVat = Math.Round(calculatedSubtotal * invoice.VatPercentage / 100, 2);
        var calculatedTotal = ApplyIndonesianRounding(calculatedSubtotal + calculatedVat);

        return Math.Abs(invoice.Subtotal - calculatedSubtotal) < 0.01m &&
               Math.Abs(invoice.VatAmount - calculatedVat) < 0.01m &&
               Math.Abs(invoice.TotalAmount - calculatedTotal) < 0.01m;
    }

    private async Task<bool> HaveValidTkaAssignments(InvoiceDto invoice, CancellationToken cancellationToken)
    {
        var companyTkaIds = await _unitOfWork.CompanyRepository.GetAssignedTkaIdsAsync(invoice.CompanyId);
        var invoiceTkaIds = invoice.InvoiceLines.Select(l => l.TkaId).Distinct();

        return invoiceTkaIds.All(tkaId => companyTkaIds.Contains(tkaId));
    }

    private decimal ApplyIndonesianRounding(decimal amount)
    {
        var cents = amount - Math.Floor(amount);
        return cents < 0.50m ? Math.Floor(amount) : Math.Floor(amount) + 1;
    }
}

public class InvoiceLineValidator : AbstractValidator<InvoiceLineDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public InvoiceLineValidator(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;

        RuleFor(x => x.Baris)
            .GreaterThan(0).WithMessage("Baris number must be greater than zero");

        RuleFor(x => x.LineOrder)
            .GreaterThan(0).WithMessage("Line order must be greater than zero");

        RuleFor(x => x.TkaId)
            .GreaterThan(0).WithMessage("TKA worker must be selected")
            .MustAsync(BeValidTka).WithMessage("Selected TKA worker does not exist or is inactive");

        RuleFor(x => x.JobDescriptionId)
            .GreaterThan(0).WithMessage("Job description must be selected")
            .MustAsync(BeValidJobDescription).WithMessage("Selected job description does not exist or is inactive");

        RuleFor(x => x.CustomJobName)
            .MaximumLength(200).WithMessage("Custom job name cannot exceed 200 characters");

        RuleFor(x => x.CustomJobDescription)
            .MaximumLength(1000).WithMessage("Custom job description cannot exceed 1000 characters");

        RuleFor(x => x.CustomPrice)
            .GreaterThanOrEqualTo(0).WithMessage("Custom price cannot be negative")
            .When(x => x.CustomPrice.HasValue);

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Quantity must be greater than zero");

        RuleFor(x => x.UnitPrice)
            .GreaterThanOrEqualTo(0).WithMessage("Unit price cannot be negative");

        RuleFor(x => x.LineTotal)
            .GreaterThanOrEqualTo(0).WithMessage("Line total cannot be negative");

        // Business rule: Line total should equal quantity * unit price
        RuleFor(x => x)
            .Must(HaveValidLineTotal).WithMessage("Line total does not match quantity × unit price");
    }

    private async Task<bool> BeValidTka(int tkaId, CancellationToken cancellationToken)
    {
        var tka = await _unitOfWork.TkaWorkerRepository.GetByIdAsync(tkaId);
        return tka != null && tka.IsActive;
    }

    private async Task<bool> BeValidJobDescription(int jobDescriptionId, CancellationToken cancellationToken)
    {
        var jobDescription = await _unitOfWork.CompanyRepository.GetJobDescriptionByIdAsync(jobDescriptionId);
        return jobDescription != null && jobDescription.IsActive;
    }

    private bool HaveValidLineTotal(InvoiceLineDto line)
    {
        var expectedTotal = line.Quantity * line.UnitPrice;
        return Math.Abs(line.LineTotal - expectedTotal) < 0.01m;
    }
}

// Command validators
public class CreateInvoiceCommandValidator : AbstractValidator<Application.Commands.CreateInvoiceCommand>
{
    private readonly IUnitOfWork _unitOfWork;

    public CreateInvoiceCommandValidator(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;

        RuleFor(x => x.CompanyId)
            .GreaterThan(0).WithMessage("Company must be selected")
            .MustAsync(BeValidCompany).WithMessage("Selected company does not exist or is inactive");

        RuleFor(x => x.InvoiceDate)
            .NotEmpty().WithMessage("Invoice date is required")
            .LessThanOrEqualTo(DateTime.Today.AddDays(30)).WithMessage("Invoice date cannot be more than 30 days in the future");

        RuleFor(x => x.DueDate)
            .GreaterThanOrEqualTo(x => x.InvoiceDate).WithMessage("Due date must be on or after invoice date")
            .When(x => x.DueDate.HasValue);

        RuleFor(x => x.VatPercentage)
            .GreaterThanOrEqualTo(0).WithMessage("VAT percentage cannot be negative")
            .LessThanOrEqualTo(100).WithMessage("VAT percentage cannot exceed 100%");

        RuleFor(x => x.CreatedBy)
            .GreaterThan(0).WithMessage("Created by user must be specified")
            .MustAsync(BeValidUser).WithMessage("Invalid user specified");

        RuleFor(x => x.InvoiceLines)
            .NotEmpty().WithMessage("Invoice must have at least one line item");

        RuleForEach(x => x.InvoiceLines).SetValidator(new CreateInvoiceLineValidator(_unitOfWork));

        RuleFor(x => x.InvoiceNumber)
            .MustAsync(BeUniqueInvoiceNumber).WithMessage("Invoice number already exists")
            .When(x => !string.IsNullOrEmpty(x.InvoiceNumber));
    }

    private async Task<bool> BeValidCompany(int companyId, CancellationToken cancellationToken)
    {
        var company = await _unitOfWork.CompanyRepository.GetByIdAsync(companyId);
        return company != null && company.IsActive;
    }

    private async Task<bool> BeValidUser(int userId, CancellationToken cancellationToken)
    {
        var user = await _unitOfWork.UserRepository.GetByIdAsync(userId);
        return user != null && user.IsActive;
    }

    private async Task<bool> BeUniqueInvoiceNumber(string? invoiceNumber, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(invoiceNumber)) return true;
        
        var existingInvoice = await _unitOfWork.InvoiceRepository.GetByNumberAsync(invoiceNumber);
        return existingInvoice == null;
    }
}

public class CreateInvoiceLineValidator : AbstractValidator<Application.Commands.CreateInvoiceLineDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public CreateInvoiceLineValidator(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;

        RuleFor(x => x.Baris)
            .GreaterThan(0).WithMessage("Baris number must be greater than zero");

        RuleFor(x => x.LineOrder)
            .GreaterThan(0).WithMessage("Line order must be greater than zero");

        RuleFor(x => x.TkaId)
            .GreaterThan(0).WithMessage("TKA worker must be selected")
            .MustAsync(BeValidTka).WithMessage("Selected TKA worker does not exist or is inactive");

        RuleFor(x => x.JobDescriptionId)
            .GreaterThan(0).WithMessage("Job description must be selected")
            .MustAsync(BeValidJobDescription).WithMessage("Selected job description does not exist or is inactive");

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Quantity must be greater than zero");

        RuleFor(x => x.UnitPrice)
            .GreaterThanOrEqualTo(0).WithMessage("Unit price cannot be negative");

        RuleFor(x => x.LineTotal)
            .GreaterThanOrEqualTo(0).WithMessage("Line total cannot be negative");

        RuleFor(x => x)
            .Must(HaveValidLineTotal).WithMessage("Line total does not match quantity × unit price");
    }

    private async Task<bool> BeValidTka(int tkaId, CancellationToken cancellationToken)
    {
        var tka = await _unitOfWork.TkaWorkerRepository.GetByIdAsync(tkaId);
        return tka != null && tka.IsActive;
    }

    private async Task<bool> BeValidJobDescription(int jobDescriptionId, CancellationToken cancellationToken)
    {
        var jobDescription = await _unitOfWork.CompanyRepository.GetJobDescriptionByIdAsync(jobDescriptionId);
        return jobDescription != null && jobDescription.IsActive;
    }

    private bool HaveValidLineTotal(Application.Commands.CreateInvoiceLineDto line)
    {
        var expectedTotal = line.Quantity * line.UnitPrice;
        return Math.Abs(line.LineTotal - expectedTotal) < 0.01m;
    }
}