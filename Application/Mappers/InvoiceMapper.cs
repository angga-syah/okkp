// E:\kp\4 invoice\Application\Mappers\InvoiceMapper.cs
using AutoMapper;
using InvoiceApp.Application.Commands;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;

namespace InvoiceApp.Application.Mappers;

public static class InvoiceMapper
{
    public static InvoiceDto ToDto(Invoice invoice)
    {
        if (invoice == null) return new InvoiceDto();

        return new InvoiceDto
        {
            Id = invoice.Id,
            InvoiceUuid = invoice.InvoiceUuid,
            InvoiceNumber = invoice.InvoiceNumber,
            CompanyId = invoice.CompanyId,
            CompanyName = invoice.Company?.CompanyName ?? string.Empty,
            CompanyNpwp = invoice.Company?.Npwp ?? string.Empty,
            CompanyAddress = invoice.Company?.Address ?? string.Empty,
            InvoiceDate = invoice.InvoiceDate,
            DueDate = invoice.DueDate,
            Subtotal = invoice.Subtotal,
            VatPercentage = invoice.VatPercentage,
            VatAmount = invoice.VatAmount,
            TotalAmount = invoice.TotalAmount,
            StatusText = invoice.Status.ToString(),
            Notes = invoice.Notes,
            BankAccountId = invoice.BankAccountId,
            BankAccountName = invoice.BankAccount?.BankName,
            PrintedCount = invoice.PrintedCount,
            LastPrintedAt = invoice.LastPrintedAt,
            ImportedFrom = invoice.ImportedFrom,
            ImportBatchId = invoice.ImportBatchId,
            CreatedBy = invoice.CreatedBy,
            CreatedByName = invoice.CreatedByUser?.FullName ?? string.Empty,
            CreatedAt = invoice.CreatedAt,
            UpdatedAt = invoice.UpdatedAt,
            LineCount = invoice.InvoiceLines?.Count ?? 0,
            InvoiceLines = invoice.InvoiceLines?.Select(ToLineDto).ToList() ?? new List<InvoiceLineDto>(),
            AmountInWords = ConvertAmountToWords(invoice.TotalAmount)
        };
    }

    public static InvoiceLineDto ToLineDto(InvoiceLine line)
    {
        if (line == null) return new InvoiceLineDto();

        return new InvoiceLineDto
        {
            Id = line.Id,
            LineUuid = line.LineUuid,
            InvoiceId = line.InvoiceId,
            Baris = line.Baris,
            LineOrder = line.LineOrder,
            TkaId = line.TkaId,
            TkaName = line.TkaWorker?.Nama ?? string.Empty,
            TkaPassport = line.TkaWorker?.Passport ?? string.Empty,
            JobDescriptionId = line.JobDescriptionId,
            JobName = line.JobDescription?.JobName ?? string.Empty,
            JobDescriptionText = !string.IsNullOrEmpty(line.CustomJobDescription) 
                ? line.CustomJobDescription 
                : line.JobDescription?.JobDescription ?? string.Empty,
            CustomJobName = line.CustomJobName,
            CustomJobDescription = line.CustomJobDescription,
            CustomPrice = line.CustomPrice,
            Quantity = line.Quantity,
            UnitPrice = line.UnitPrice,
            LineTotal = line.LineTotal,
            DisplayJobName = !string.IsNullOrEmpty(line.CustomJobName) 
                ? line.CustomJobName 
                : line.JobDescription?.JobName ?? string.Empty,
            CreatedAt = line.CreatedAt
        };
    }

    public static Invoice ToEntity(CreateInvoiceCommand command)
    {
        return new Invoice
        {
            InvoiceNumber = command.InvoiceNumber ?? string.Empty,
            CompanyId = command.CompanyId,
            InvoiceDate = command.InvoiceDate,
            DueDate = command.DueDate,
            Notes = command.Notes,
            VatPercentage = command.VatPercentage,
            BankAccountId = command.BankAccountId,
            CreatedBy = command.CreatedBy,
            Status = command.Status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public static InvoiceLine ToLineEntity(CreateInvoiceLineDto lineDto)
    {
        return new InvoiceLine
        {
            Baris = lineDto.Baris,
            LineOrder = lineDto.LineOrder,
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
    }

    public static void UpdateEntityFromCommand(Invoice invoice, UpdateInvoiceCommand command)
    {
        invoice.InvoiceNumber = command.InvoiceNumber ?? invoice.InvoiceNumber;
        invoice.CompanyId = command.CompanyId;
        invoice.InvoiceDate = command.InvoiceDate;
        invoice.DueDate = command.DueDate;
        invoice.Notes = command.Notes;
        invoice.VatPercentage = command.VatPercentage;
        invoice.BankAccountId = command.BankAccountId;
        invoice.Status = command.Status;
        invoice.UpdatedAt = DateTime.UtcNow;
    }

    public static InvoiceForPrintDto ToForPrintDto(Invoice invoice)
    {
        return new InvoiceForPrintDto
        {
            Id = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            InvoiceDate = invoice.InvoiceDate,
            CompanyName = invoice.Company?.CompanyName ?? string.Empty,
            CompanyNpwp = invoice.Company?.Npwp ?? string.Empty,
            CompanyIdtku = invoice.Company?.Idtku ?? string.Empty,
            CompanyAddress = invoice.Company?.Address ?? string.Empty,
            CompanyEmail = invoice.Company?.Email,
            CompanyPhone = invoice.Company?.Phone,
            CompanyContactPerson = invoice.Company?.ContactPerson,
            Subtotal = invoice.Subtotal,
            VatPercentage = invoice.VatPercentage,
            VatAmount = invoice.VatAmount,
            TotalAmount = invoice.TotalAmount,
            AmountInWords = ConvertAmountToWords(invoice.TotalAmount),
            Notes = invoice.Notes,
            BankAccountDetails = invoice.BankAccount != null ? new BankAccountDto
            {
                Id = invoice.BankAccount.Id,
                BankName = invoice.BankAccount.BankName,
                AccountNumber = invoice.BankAccount.AccountNumber,
                AccountName = invoice.BankAccount.AccountName,
                BranchName = invoice.BankAccount.BranchName
            } : null,
            Lines = invoice.InvoiceLines?
                .OrderBy(l => l.Baris)
                .ThenBy(l => l.LineOrder)
                .Select(ToLineForPrintDto)
                .ToList() ?? new List<InvoiceLineForPrintDto>()
        };
    }

    public static InvoiceLineForPrintDto ToLineForPrintDto(InvoiceLine line)
    {
        return new InvoiceLineForPrintDto
        {
            Baris = line.Baris,
            LineOrder = line.LineOrder,
            TkaName = line.TkaWorker?.Nama ?? string.Empty,
            TkaPassport = line.TkaWorker?.Passport ?? string.Empty,
            JobDescription = !string.IsNullOrEmpty(line.CustomJobDescription) 
                ? line.CustomJobDescription 
                : line.JobDescription?.JobDescription ?? string.Empty,
            JobName = !string.IsNullOrEmpty(line.CustomJobName) 
                ? line.CustomJobName 
                : line.JobDescription?.JobName ?? string.Empty,
            Quantity = line.Quantity,
            UnitPrice = line.UnitPrice,
            LineTotal = line.LineTotal,
            IsMultiLine = !string.IsNullOrEmpty(line.CustomJobDescription) && 
                         line.CustomJobDescription.Contains('\n')
        };
    }

    public static InvoiceSummaryDto ToSummaryDto(Invoice invoice)
    {
        return new InvoiceSummaryDto
        {
            Id = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            CompanyName = invoice.Company?.CompanyName ?? string.Empty,
            InvoiceDate = invoice.InvoiceDate,
            TotalAmount = invoice.TotalAmount,
            Status = invoice.Status.ToString(),
            LineCount = invoice.InvoiceLines?.Count ?? 0,
            CreatedAt = invoice.CreatedAt
        };
    }

    public static List<InvoiceDto> ToDtoList(IEnumerable<Invoice> invoices)
    {
        return invoices?.Select(ToDto).ToList() ?? new List<InvoiceDto>();
    }

    public static List<InvoiceSummaryDto> ToSummaryDtoList(IEnumerable<Invoice> invoices)
    {
        return invoices?.Select(ToSummaryDto).ToList() ?? new List<InvoiceSummaryDto>();
    }

    private static string ConvertAmountToWords(decimal amount)
    {
        // Simplified implementation for Indonesian rupiah
        // In a real application, this would be a comprehensive number-to-words converter
        
        var integerPart = (long)Math.Floor(amount);
        
        if (integerPart == 0)
            return "Nol Rupiah";
            
        // This is a very basic implementation
        // A full implementation would handle all Indonesian number words
        return $"{integerPart:N0} Rupiah".Replace(",", ".");
    }
}

// Supporting DTOs for invoice mapping
public class InvoiceForPrintDto
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string CompanyNpwp { get; set; } = string.Empty;
    public string CompanyIdtku { get; set; } = string.Empty;
    public string CompanyAddress { get; set; } = string.Empty;
    public string? CompanyEmail { get; set; }
    public string? CompanyPhone { get; set; }
    public string? CompanyContactPerson { get; set; }
    public decimal Subtotal { get; set; }
    public decimal VatPercentage { get; set; }
    public decimal VatAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string AmountInWords { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public BankAccountDto? BankAccountDetails { get; set; }
    public List<InvoiceLineForPrintDto> Lines { get; set; } = new();
}

public class InvoiceLineForPrintDto
{
    public int Baris { get; set; }
    public int LineOrder { get; set; }
    public string TkaName { get; set; } = string.Empty;
    public string TkaPassport { get; set; } = string.Empty;
    public string JobDescription { get; set; } = string.Empty;
    public string JobName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public bool IsMultiLine { get; set; }
}

public class InvoiceSummaryDto
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public int LineCount { get; set; }
    public DateTime CreatedAt { get; set; }
}