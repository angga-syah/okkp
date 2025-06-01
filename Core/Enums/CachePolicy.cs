// E:\kp\4 invoice\Core\Enums\CachePolicy.cs
namespace InvoiceApp.Core.Enums;

public enum CachePolicy
{
    NoCache = 0,
    ShortTerm = 1,    // 5 minutes
    MediumTerm = 2,   // 30 minutes
    LongTerm = 3,     // 2 hours
    Persistent = 4,   // Until manually cleared
    Session = 5       // Until session ends
}