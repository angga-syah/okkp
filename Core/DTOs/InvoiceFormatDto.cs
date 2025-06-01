// E:\kp\4 invoice\Core\DTOs\InvoiceFormatDto.cs
namespace InvoiceApp.Core.DTOs;

public class InvoiceFormatDto
{
    public int Id { get; set; }
    public string FormatName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
    
    // Header Settings
    public HeaderSettingsDto Header { get; set; } = new();
    
    // Company Info Settings
    public CompanyInfoSettingsDto CompanyInfo { get; set; } = new();
    
    // Table Settings
    public TableSettingsDto Table { get; set; } = new();
    
    // Footer Settings
    public FooterSettingsDto Footer { get; set; } = new();
    
    // Layout Settings
    public LayoutSettingsDto Layout { get; set; } = new();
    
    // Print Settings
    public PrintSettingsDto Print { get; set; } = new();
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class HeaderSettingsDto
{
    public string CompanyName { get; set; } = string.Empty;
    public string CompanyTagline { get; set; } = string.Empty;
    public bool ShowLogo { get; set; }
    public string LogoPath { get; set; } = string.Empty;
    public double LogoWidth { get; set; } = 100;
    public double LogoHeight { get; set; } = 50;
    public string HeaderFontSize { get; set; } = "20px";
    public string HeaderColor { get; set; } = "#000000";
    public string TaglineFontSize { get; set; } = "12px";
    public string TaglineColor { get; set; } = "#666666";
}

public class CompanyInfoSettingsDto
{
    public string InvoicePlace { get; set; } = "Jakarta";
    public string OfficeLabel { get; set; } = "Kantor";
    public string OfficeAddress { get; set; } = string.Empty;
    public List<string> PhoneNumbers { get; set; } = new();
    public string DateFormat { get; set; } = "dd/MM/yyyy";
    public bool ShowPageNumber { get; set; } = true;
    public string PageNumberFormat { get; set; } = "Halaman {page}/{total}";
}

public class TableSettingsDto
{
    public Dictionary<string, string> ColumnHeaders { get; set; } = new()
    {
        ["No"] = "No.",
        ["Date"] = "Tanggal",
        ["PoNumber"] = "No. PO",
        ["Expatriat"] = "Expatriat",
        ["Description"] = "Keterangan",
        ["Amount"] = "Harga"
    };
    
    public Dictionary<string, double> ColumnWidths { get; set; } = new()
    {
        ["No"] = 70,
        ["Date"] = 70,
        ["PoNumber"] = 70,
        ["Expatriat"] = 140,
        ["Description"] = 300,
        ["Amount"] = 110
    };
    
    public double RowHeight { get; set; } = 32;
    public double HeaderRowHeight { get; set; } = 42;
    public string TableFontSize { get; set; } = "8px";
    public string HeaderFontSize { get; set; } = "8px";
    public bool ShowBorders { get; set; } = true;
    public string BorderColor { get; set; } = "#000000";
    public bool AlternateRowColors { get; set; } = false;
    public string AlternateRowColor { get; set; } = "#F5F5F5";
}

public class FooterSettingsDto
{
    public string DppLabel { get; set; } = "DPP";
    public string PpnLabel { get; set; } = "PPN";
    public string TotalLabel { get; set; } = "Total";
    public bool ShowAmountInWords { get; set; } = true;
    public string AmountInWordsLabel { get; set; } = "Terbilang";
    public string AmountInWordsSuffix { get; set; } = "Rupiah";
    public string CompanyNameInFooter { get; set; } = string.Empty;
    public string SignatoryName { get; set; } = string.Empty;
    public bool ShowBankInfoOnLastPage { get; set; } = true;
    public bool ShowTermsAndConditions { get; set; } = false;
    public string TermsAndConditions { get; set; } = string.Empty;
}

public class LayoutSettingsDto
{
    public string PageSize { get; set; } = "A4"; // A4, Letter, Legal
    public string Orientation { get; set; } = "Portrait"; // Portrait, Landscape
    public double TopMargin { get; set; } = 20;
    public double BottomMargin { get; set; } = 20;
    public double LeftMargin { get; set; } = 20;
    public double RightMargin { get; set; } = 20;
    public double HeaderHeight { get; set; } = 80;
    public double FooterHeight { get; set; } = 60;
    public string FontFamily { get; set; } = "Arial";
    public string DefaultFontSize { get; set; } = "10px";
}

public class PrintSettingsDto
{
    public bool FitToPage { get; set; } = true;
    public double ScaleFactor { get; set; } = 1.0;
    public bool PrintInColor { get; set; } = false;
    public string PrintQuality { get; set; } = "Normal"; // Draft, Normal, High
    public bool DuplexPrinting { get; set; } = false;
    public int CopiesCount { get; set; } = 1;
    public bool CollatePages { get; set; } = true;
    public string PaperSource { get; set; } = "Auto";
}