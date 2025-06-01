// E:\kp\4 invoice\Core\Enums\DateFormat.cs
namespace InvoiceApp.Core.Enums;

public enum DateFormat
{
    DDMMYYYY = 1,      // 31/12/2024
    MMDDYYYY = 2,      // 12/31/2024
    YYYYMMDD = 3,      // 2024/12/31
    ISO8601 = 4,       // 2024-12-31
    LongFormat = 5,    // 31 December 2024
    ShortFormat = 6    // 31 Dec 2024
}
