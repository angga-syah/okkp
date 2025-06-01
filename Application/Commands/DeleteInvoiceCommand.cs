// E:\kp\4 invoice\Application\Commands\DeleteInvoiceCommand.cs
using MediatR;

namespace InvoiceApp.Application.Commands;

public class DeleteInvoiceCommand : IRequest<bool>
{
    public int InvoiceId { get; set; }
    public int DeletedBy { get; set; }
    public string? DeletionReason { get; set; }
    public bool IsHardDelete { get; set; } = false; // Soft delete by default
}

public class BulkDeleteInvoiceCommand : IRequest<BulkDeleteResult>
{
    public List<int> InvoiceIds { get; set; } = new();
    public int DeletedBy { get; set; }
    public string? DeletionReason { get; set; }
    public bool IsHardDelete { get; set; } = false;
}

public class BulkDeleteResult
{
    public int TotalRequested { get; set; }
    public int SuccessfullyDeleted { get; set; }
    public int Failed { get; set; }
    public List<BulkDeleteError> Errors { get; set; } = new();
    public bool IsPartialSuccess => SuccessfullyDeleted > 0 && Failed > 0;
    public bool IsCompleteSuccess => SuccessfullyDeleted == TotalRequested;
}

public class BulkDeleteError
{
    public int InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
    public string ErrorCode { get; set; } = string.Empty;
}

public class DeleteInvoiceLineCommand : IRequest<bool>
{
    public int InvoiceLineId { get; set; }
    public int InvoiceId { get; set; }
    public int DeletedBy { get; set; }
    public bool RecalculateTotals { get; set; } = true;
}

public class RestoreInvoiceCommand : IRequest<bool>
{
    public int InvoiceId { get; set; }
    public int RestoredBy { get; set; }
    public string? RestoreReason { get; set; }
}

public class PermanentDeleteInvoiceCommand : IRequest<bool>
{
    public int InvoiceId { get; set; }
    public int DeletedBy { get; set; }
    public string AdminPassword { get; set; } = string.Empty;
    public bool ConfirmPermanentDelete { get; set; }
}