// E:\kp\4 invoice\Application\Handlers\InvoiceCommandHandler.cs
using AutoMapper;
using FluentValidation;
using InvoiceApp.Application.Commands;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Interfaces;
using InvoiceApp.Core.Interfaces.Services;
using MediatR;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Application.Handlers;

public class InvoiceCommandHandler :
    IRequestHandler<CreateInvoiceCommand, int>,
    IRequestHandler<UpdateInvoiceCommand, bool>,
    IRequestHandler<DeleteInvoiceCommand, bool>,
    IRequestHandler<FinalizeInvoiceCommand, bool>,
    IRequestHandler<ChangeInvoiceStatusCommand, bool>,
    IRequestHandler<RecalculateInvoiceTotalsCommand, InvoiceTotalsDto>,
    IRequestHandler<BulkCreateInvoiceCommand, List<CreateInvoiceResponse>>,
    IRequestHandler<BulkDeleteInvoiceCommand, BulkDeleteResult>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<InvoiceCommandHandler> _logger;
    private readonly IValidator<CreateInvoiceCommand> _createValidator;
    private readonly IValidator<UpdateInvoiceCommand> _updateValidator;
    private readonly IInvoiceService _invoiceService;
    private readonly IInvoiceNumberService _invoiceNumberService;

    public InvoiceCommandHandler(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        ILogger<InvoiceCommandHandler> logger,
        IValidator<CreateInvoiceCommand> createValidator,
        IValidator<UpdateInvoiceCommand> updateValidator,
        IInvoiceService invoiceService,
        IInvoiceNumberService invoiceNumberService)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _logger = logger;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _invoiceService = invoiceService;
        _invoiceNumberService = invoiceNumberService;
    }

    public async Task<int> Handle(CreateInvoiceCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Creating new invoice for company {CompanyId}", request.CompanyId);

        // Validate request
        var validationResult = await _createValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        // Generate invoice number if not provided
        if (string.IsNullOrWhiteSpace(request.InvoiceNumber))
        {
            request.InvoiceNumber = await _invoiceNumberService.GenerateNextNumberAsync(
                request.CompanyId, request.InvoiceDate);
        }

        // Check for duplicate invoice number
        var existingInvoice = await _unitOfWork.InvoiceRepository.GetByNumberAsync(request.InvoiceNumber);
        if (existingInvoice != null)
        {
            throw new InvalidOperationException($"Invoice number {request.InvoiceNumber} already exists");
        }

        // Create invoice entity
        var invoice = new Invoice
        {
            InvoiceNumber = request.InvoiceNumber,
            CompanyId = request.CompanyId,
            InvoiceDate = request.InvoiceDate,
            DueDate = request.DueDate,
            Notes = request.Notes,
            VatPercentage = request.VatPercentage,
            BankAccountId = request.BankAccountId,
            CreatedBy = request.CreatedBy,
            Status = request.Status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Add invoice lines
        var lineOrder = 1;
        foreach (var lineDto in request.InvoiceLines.OrderBy(l => l.Baris).ThenBy(l => l.LineOrder))
        {
            var invoiceLine = new InvoiceLine
            {
                Baris = lineDto.Baris,
                LineOrder = lineOrder++,
                TkaId = lineDto.TkaId,
                JobDescriptionId = lineDto.JobDescriptionId,
                CustomJobName = lineDto.CustomJobName,
                CustomJobDescription = lineDto.CustomJobDescription,
                CustomPrice = lineDto.CustomPrice,
                Quantity = lineDto.Quantity,
                UnitPrice = lineDto.UnitPrice,
                LineTotal = lineDto.LineTotal,
                CreatedAt = DateTime.UtcNow
            };

            invoice.InvoiceLines.Add(invoiceLine);
        }

        // Calculate totals
        CalculateInvoiceTotals(invoice);

        // Save to database
        await _unitOfWork.InvoiceRepository.AddAsync(invoice);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Invoice {InvoiceNumber} created with ID {InvoiceId}", 
            invoice.InvoiceNumber, invoice.Id);

        return invoice.Id;
    }

    public async Task<bool> Handle(UpdateInvoiceCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Updating invoice {InvoiceId}", request.Id);

        // Validate request
        var validationResult = await _updateValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        // Get existing invoice
        var invoice = await _unitOfWork.InvoiceRepository.GetByIdWithLinesAsync(request.Id);
        if (invoice == null)
        {
            throw new InvalidOperationException($"Invoice with ID {request.Id} not found");
        }

        // Check if invoice can be edited
        if (invoice.Status == InvoiceStatus.Finalized)
        {
            throw new InvalidOperationException("Cannot edit finalized invoice");
        }

        // Update invoice properties
        invoice.InvoiceNumber = request.InvoiceNumber ?? invoice.InvoiceNumber;
        invoice.CompanyId = request.CompanyId;
        invoice.InvoiceDate = request.InvoiceDate;
        invoice.DueDate = request.DueDate;
        invoice.Notes = request.Notes;
        invoice.VatPercentage = request.VatPercentage;
        invoice.BankAccountId = request.BankAccountId;
        invoice.Status = request.Status;
        invoice.UpdatedAt = DateTime.UtcNow;

        // Update invoice lines
        await UpdateInvoiceLines(invoice, request.InvoiceLines);

        // Recalculate totals
        CalculateInvoiceTotals(invoice);

        // Save changes
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Invoice {InvoiceId} updated successfully", request.Id);

        return true;
    }

    public async Task<bool> Handle(DeleteInvoiceCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Deleting invoice {InvoiceId}", request.InvoiceId);

        var invoice = await _unitOfWork.InvoiceRepository.GetByIdAsync(request.InvoiceId);
        if (invoice == null)
        {
            throw new InvalidOperationException($"Invoice with ID {request.InvoiceId} not found");
        }

        if (request.IsHardDelete)
        {
            await _unitOfWork.InvoiceRepository.DeleteAsync(invoice);
        }
        else
        {
            // Soft delete - mark as inactive or cancelled
            invoice.Status = InvoiceStatus.Cancelled;
            invoice.UpdatedAt = DateTime.UtcNow;
            _unitOfWork.InvoiceRepository.Update(invoice);
        }

        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Invoice {InvoiceId} deleted (hard={IsHard})", 
            request.InvoiceId, request.IsHardDelete);

        return true;
    }

    public async Task<bool> Handle(FinalizeInvoiceCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Finalizing invoice {InvoiceId}", request.InvoiceId);

        var invoice = await _unitOfWork.InvoiceRepository.GetByIdWithLinesAsync(request.InvoiceId);
        if (invoice == null)
        {
            throw new InvalidOperationException($"Invoice with ID {request.InvoiceId} not found");
        }

        if (invoice.Status == InvoiceStatus.Finalized)
        {
            throw new InvalidOperationException("Invoice is already finalized");
        }

        // Validate invoice before finalizing
        if (request.ValidateBeforeFinalize)
        {
            var validationErrors = await ValidateInvoiceForFinalization(invoice);
            if (validationErrors.Any())
            {
                throw new ValidationException(string.Join("; ", validationErrors));
            }
        }

        // Finalize invoice
        invoice.Status = InvoiceStatus.Finalized;
        invoice.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.InvoiceRepository.Update(invoice);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Invoice {InvoiceId} finalized successfully", request.InvoiceId);

        return true;
    }

    public async Task<bool> Handle(ChangeInvoiceStatusCommand request, CancellationToken cancellationToken)
    {
        var invoice = await _unitOfWork.InvoiceRepository.GetByIdAsync(request.InvoiceId);
        if (invoice == null)
        {
            throw new InvalidOperationException($"Invoice with ID {request.InvoiceId} not found");
        }

        invoice.Status = request.NewStatus;
        invoice.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.InvoiceRepository.Update(invoice);
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    public async Task<InvoiceTotalsDto> Handle(RecalculateInvoiceTotalsCommand request, CancellationToken cancellationToken)
    {
        var invoice = await _unitOfWork.InvoiceRepository.GetByIdWithLinesAsync(request.InvoiceId);
        if (invoice == null)
        {
            throw new InvalidOperationException($"Invoice with ID {request.InvoiceId} not found");
        }

        if (request.NewVatPercentage.HasValue)
        {
            invoice.VatPercentage = request.NewVatPercentage.Value;
        }

        CalculateInvoiceTotals(invoice);

        return new InvoiceTotalsDto
        {
            Subtotal = invoice.Subtotal,
            VatAmount = invoice.VatAmount,
            TotalAmount = invoice.TotalAmount,
            VatPercentage = invoice.VatPercentage,
            AmountInWords = ConvertAmountToWords(invoice.TotalAmount)
        };
    }

    public async Task<List<CreateInvoiceResponse>> Handle(BulkCreateInvoiceCommand request, CancellationToken cancellationToken)
    {
        var responses = new List<CreateInvoiceResponse>();

        foreach (var invoiceCommand in request.Invoices)
        {
            try
            {
                invoiceCommand.CreatedBy = request.CreatedBy;
                var invoiceId = await Handle(invoiceCommand, cancellationToken);
                
                responses.Add(new CreateInvoiceResponse
                {
                    InvoiceId = invoiceId,
                    InvoiceNumber = invoiceCommand.InvoiceNumber ?? "",
                    Success = true
                });
            }
            catch (Exception ex)
            {
                responses.Add(new CreateInvoiceResponse
                {
                    InvoiceNumber = invoiceCommand.InvoiceNumber ?? "",
                    Success = false,
                    Message = ex.Message,
                    Errors = new List<string> { ex.Message }
                });
            }
        }

        return responses;
    }

    public async Task<BulkDeleteResult> Handle(BulkDeleteInvoiceCommand request, CancellationToken cancellationToken)
    {
        var result = new BulkDeleteResult
        {
            TotalRequested = request.InvoiceIds.Count
        };

        foreach (var invoiceId in request.InvoiceIds)
        {
            try
            {
                var deleteCommand = new DeleteInvoiceCommand
                {
                    InvoiceId = invoiceId,
                    DeletedBy = request.DeletedBy,
                    DeletionReason = request.DeletionReason,
                    IsHardDelete = request.IsHardDelete
                };

                await Handle(deleteCommand, cancellationToken);
                result.SuccessfullyDeleted++;
            }
            catch (Exception ex)
            {
                result.Failed++;
                var invoice = await _unitOfWork.InvoiceRepository.GetByIdAsync(invoiceId);
                result.Errors.Add(new BulkDeleteError
                {
                    InvoiceId = invoiceId,
                    InvoiceNumber = invoice?.InvoiceNumber ?? "Unknown",
                    ErrorMessage = ex.Message
                });
            }
        }

        return result;
    }

    private void CalculateInvoiceTotals(Invoice invoice)
    {
        invoice.Subtotal = invoice.InvoiceLines.Sum(l => l.LineTotal);
        invoice.VatAmount = Math.Round(invoice.Subtotal * invoice.VatPercentage / 100, 2);
        
        // Apply Indonesian rounding rules
        var totalBeforeRounding = invoice.Subtotal + invoice.VatAmount;
        invoice.TotalAmount = ApplyIndonesianRounding(totalBeforeRounding);
    }

    private decimal ApplyIndonesianRounding(decimal amount)
    {
        var cents = amount - Math.Floor(amount);
        if (cents < 0.50m)
        {
            return Math.Floor(amount);
        }
        else
        {
            return Math.Floor(amount) + 1;
        }
    }

    private async Task UpdateInvoiceLines(Invoice invoice, List<UpdateInvoiceLineDto> newLines)
    {
        // Remove deleted lines
        var linesToDelete = invoice.InvoiceLines
            .Where(l => !newLines.Any(nl => nl.Id == l.Id) || 
                       newLines.First(nl => nl.Id == l.Id).IsDeleted)
            .ToList();

        foreach (var line in linesToDelete)
        {
            invoice.InvoiceLines.Remove(line);
        }

        // Update existing lines and add new ones
        var lineOrder = 1;
        foreach (var lineDto in newLines.Where(l => !l.IsDeleted).OrderBy(l => l.Baris).ThenBy(l => l.LineOrder))
        {
            if (lineDto.Id.HasValue)
            {
                // Update existing line
                var existingLine = invoice.InvoiceLines.FirstOrDefault(l => l.Id == lineDto.Id.Value);
                if (existingLine != null)
                {
                    existingLine.Baris = lineDto.Baris;
                    existingLine.LineOrder = lineOrder++;
                    existingLine.TkaId = lineDto.TkaId;
                    existingLine.JobDescriptionId = lineDto.JobDescriptionId;
                    existingLine.CustomJobName = lineDto.CustomJobName;
                    existingLine.CustomJobDescription = lineDto.CustomJobDescription;
                    existingLine.CustomPrice = lineDto.CustomPrice;
                    existingLine.Quantity = lineDto.Quantity;
                    existingLine.UnitPrice = lineDto.UnitPrice;
                    existingLine.LineTotal = lineDto.LineTotal;
                }
            }
            else
            {
                // Add new line
                var newLine = new InvoiceLine
                {
                    Baris = lineDto.Baris,
                    LineOrder = lineOrder++,
                    TkaId = lineDto.TkaId,
                    JobDescriptionId = lineDto.JobDescriptionId,
                    CustomJobName = lineDto.CustomJobName,
                    CustomJobDescription = lineDto.CustomJobDescription,
                    CustomPrice = lineDto.CustomPrice,
                    Quantity = lineDto.Quantity,
                    UnitPrice = lineDto.UnitPrice,
                    LineTotal = lineDto.LineTotal,
                    CreatedAt = DateTime.UtcNow
                };

                invoice.InvoiceLines.Add(newLine);
            }
        }
    }

    private async Task<List<string>> ValidateInvoiceForFinalization(Invoice invoice)
    {
        var errors = new List<string>();

        if (!invoice.InvoiceLines.Any())
        {
            errors.Add("Invoice must have at least one line item");
        }

        if (invoice.TotalAmount <= 0)
        {
            errors.Add("Invoice total amount must be greater than zero");
        }

        if (string.IsNullOrWhiteSpace(invoice.InvoiceNumber))
        {
            errors.Add("Invoice number is required");
        }

        // Validate company exists and is active
        var company = await _unitOfWork.CompanyRepository.GetByIdAsync(invoice.CompanyId);
        if (company == null || !company.IsActive)
        {
            errors.Add("Company is not found or inactive");
        }

        // Validate TKA workers exist and are active
        foreach (var line in invoice.InvoiceLines)
        {
            var tka = await _unitOfWork.TkaWorkerRepository.GetByIdAsync(line.TkaId);
            if (tka == null || !tka.IsActive)
            {
                errors.Add($"TKA worker ID {line.TkaId} is not found or inactive");
            }
        }

        return errors;
    }

    private string ConvertAmountToWords(decimal amount)
    {
        // Implementation for converting amount to Indonesian words
        // This is a simplified version - full implementation would handle all Indonesian number words
        return $"{amount:N0} Rupiah";
    }
}