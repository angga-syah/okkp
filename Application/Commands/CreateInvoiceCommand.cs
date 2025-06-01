// E:\kp\4 invoice\Application\Commands\CreateInvoiceCommand.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;
using MediatR;

namespace InvoiceApp.Application.Commands;

public class CreateInvoiceCommand : IRequest<int>
{
    public string? InvoiceNumber { get; set; }
    public int CompanyId { get; set; }
    public DateTime InvoiceDate { get; set; }
    public DateTime? DueDate { get; set; }
    public string? Notes { get; set; }
    public decimal VatPercentage { get; set; } = 11.00m;
    public int? BankAccountId { get; set; }
    public int CreatedBy { get; set; }
    public List<CreateInvoiceLineDto> InvoiceLines { get; set; } = new();
    
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
}

public class CreateInvoiceLineDto
{
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
}

public class CreateInvoiceResponse
{
    public int InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? Message { get; set; }
    public List<string> Errors { get; set; } = new();
}

public class BulkCreateInvoiceCommand : IRequest<List<CreateInvoiceResponse>>
{
    public List<CreateInvoiceCommand> Invoices { get; set; } = new();
    public int CreatedBy { get; set; }
    public string? ImportBatchId { get; set; }
}