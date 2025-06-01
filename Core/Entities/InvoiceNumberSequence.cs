// E:\kp\4 invoice\Core\Entities\InvoiceNumberSequence.cs
namespace InvoiceApp.Core.Entities;

public class InvoiceNumberSequence
{
    public int Id { get; set; }
    public Guid SequenceUuid { get; set; } = Guid.NewGuid();
    
    // Sequence Configuration
    public string SequenceName { get; set; } = string.Empty;
    public string Prefix { get; set; } = string.Empty;
    public string Suffix { get; set; } = string.Empty;
    public string Format { get; set; } = string.Empty; // e.g., "INV-{YYYY}-{MM}-{NNNN}"
    public int Length { get; set; } = 4; // Length of numeric part
    public char PaddingChar { get; set; } = '0';
    
    // Current State
    public int CurrentNumber { get; set; } = 0;
    public int StartNumber { get; set; } = 1;
    public int? MaxNumber { get; set; }
    public bool ResetAnnually { get; set; } = true;
    public bool ResetMonthly { get; set; } = false;
    public bool ResetDaily { get; set; } = false;
    
    // Company Association (optional - for company-specific sequences)
    public int? CompanyId { get; set; }
    public virtual Company? Company { get; set; }
    
    // Date Context
    public int CurrentYear { get; set; }
    public int CurrentMonth { get; set; }
    public int CurrentDay { get; set; }
    public DateTime LastGenerated { get; set; }
    
    // Status
    public bool IsActive { get; set; } = true;
    public bool IsDefault { get; set; } = false;
    
    // Audit Fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int CreatedBy { get; set; }
    public int? UpdatedBy { get; set; }
    
    // Business Logic Methods
    public string GenerateNext(DateTime? invoiceDate = null)
    {
        var date = invoiceDate ?? DateTime.Today;
        
        // Check if reset is needed
        if (ShouldReset(date))
        {
            Reset(date);
        }
        
        // Increment counter
        CurrentNumber++;
        LastGenerated = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
        
        // Generate number based on format
        return GenerateFormattedNumber(date);
    }
    
    public string PreviewNext(DateTime? invoiceDate = null)
    {
        var date = invoiceDate ?? DateTime.Today;
        var tempNumber = CurrentNumber + 1;
        
        if (ShouldReset(date))
        {
            tempNumber = StartNumber;
        }
        
        return GenerateFormattedNumber(date, tempNumber);
    }
    
    private bool ShouldReset(DateTime date)
    {
        if (ResetDaily && date.Day != CurrentDay) return true;
        if (ResetMonthly && date.Month != CurrentMonth) return true;
        if (ResetAnnually && date.Year != CurrentYear) return true;
        return false;
    }
    
    private void Reset(DateTime date)
    {
        CurrentNumber = StartNumber - 1; // Will be incremented to StartNumber
        CurrentYear = date.Year;
        CurrentMonth = date.Month;
        CurrentDay = date.Day;
    }
    
    private string GenerateFormattedNumber(DateTime date, int? number = null)
    {
        var num = number ?? CurrentNumber;
        var result = Format;
        
        // Replace date placeholders
        result = result.Replace("{YYYY}", date.Year.ToString());
        result = result.Replace("{YY}", date.Year.ToString().Substring(2));
        result = result.Replace("{MM}", date.Month.ToString().PadLeft(2, '0'));
        result = result.Replace("{M}", date.Month.ToString());
        result = result.Replace("{DD}", date.Day.ToString().PadLeft(2, '0'));
        result = result.Replace("{D}", date.Day.ToString());
        
        // Replace number placeholders
        var paddedNumber = num.ToString().PadLeft(Length, PaddingChar);
        result = result.Replace("{NNNN}", paddedNumber);
        result = result.Replace("{NNN}", paddedNumber);
        result = result.Replace("{NN}", paddedNumber);
        result = result.Replace("{N}", num.ToString());
        
        // Replace prefix and suffix
        if (!string.IsNullOrEmpty(Prefix))
        {
            result = Prefix + result;
        }
        
        if (!string.IsNullOrEmpty(Suffix))
        {
            result = result + Suffix;
        }
        
        return result;
    }
    
    public void SetCurrentNumber(int number, DateTime? date = null)
    {
        CurrentNumber = number;
        var contextDate = date ?? DateTime.Today;
        CurrentYear = contextDate.Year;
        CurrentMonth = contextDate.Month;
        CurrentDay = contextDate.Day;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public bool IsValidFormat()
    {
        try
        {
            var testNumber = GenerateFormattedNumber(DateTime.Today, 1);
            return !string.IsNullOrEmpty(testNumber);
        }
        catch
        {
            return false;
        }
    }
    
    public Dictionary<string, object> GetSequenceInfo()
    {
        return new Dictionary<string, object>
        {
            ["SequenceName"] = SequenceName,
            ["Format"] = Format,
            ["CurrentNumber"] = CurrentNumber,
            ["NextNumber"] = CurrentNumber + 1,
            ["LastGenerated"] = LastGenerated,
            ["IsActive"] = IsActive,
            ["CompanyId"] = CompanyId,
            ["PreviewNext"] = PreviewNext()
        };
    }
}