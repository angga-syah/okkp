// E:\kp\4 invoice\Core\Enums\NumberFormat.cs
namespace InvoiceApp.Core.Enums;

public enum NumberFormat
{
    Integer = 1,              // 1,234
    TwoDecimal = 2,          // 1,234.56
    NoDecimal = 3,           // 1234
    Currency = 4,            // Rp 1,234,567
    CurrencyShort = 5,       // 1.2M, 1.5K
    Percentage = 6,          // 12.5%
    Scientific = 7           // 1.23E+3
}