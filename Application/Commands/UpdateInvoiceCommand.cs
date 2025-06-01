// E:\kp\4 invoice\Application\Commands\UpdateInvoiceCommand.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;
using MediatR;

namespace InvoiceApp.Application.Commands;

public class UpdateInvoiceCommand : IRequest<bool>
{
    public int Id { get; set; }
    public string? InvoiceNumber { get; set; }
    public int CompanyId { get; set; }
    public DateTime InvoiceDate { get; set; }
    public DateTime? DueDate { get; set; }
    public string? Notes { get; set; }
    public decimal VatPercentage { get; set; }
    public int? BankAccountId { get; set; }
    public InvoiceStatus Status { get; set; }
    public List<UpdateInvoiceLineDto> InvoiceLines { get; set; } = new();
    public int UpdatedBy { get; set; }
}

public class UpdateInvoiceLineDto
{
    public int? Id { get; set; } // Null for new lines
    public int Baris { get; set; }
    public int LineOrder { get; set; }
    public int TkaId { get; set; }
    public int JobDescriptionId { get; set; }
    public string? CustomJobName { get; set; }
    public string? CustomJobDescription { get; set; }
    public decimal? CustomPrice { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public bool IsDeleted { get; set; } = false;
}

public class FinalizeInvoiceCommand : IRequest<bool>
{
    public int InvoiceId { get; set; }
    public int UpdatedBy { get; set; }
    public bool ValidateBeforeFinalize { get; set; } = true;
}

public class ChangeInvoiceStatusCommand : IRequest<bool>
{
    public int InvoiceId { get; set; }
    public InvoiceStatus NewStatus { get; set; }
    public int UpdatedBy { get; set; }
    public string? StatusChangeReason { get; set; }
}

public class RecalculateInvoiceTotalsCommand : IRequest<InvoiceTotalsDto>
{
    public int InvoiceId { get; set; }
    public List<UpdateInvoiceLineDto>? NewLines { get; set; }
    public decimal? NewVatPercentage { get; set; }
}

public class InvoiceTotalsDto
{
    public decimal Subtotal { get; set; }
    public decimal VatAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal VatPercentage { get; set; }
    public string AmountInWords { get; set; } = string.Empty;
}