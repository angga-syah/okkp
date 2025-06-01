// E:\kp\4 invoice\Core\Enums\SearchMatchType.cs (already exists, but adding for completeness)
namespace InvoiceApp.Core.Enums;

public enum SearchMatchType
{
    ExactFullMatch = 1,
    ExactWordMatch = 2,
    StartsWith = 3,
    Contains = 4,
    MultiWordMatch = 5,
    FuzzyMatch = 6,
    PartialMatch = 7,
    NoMatch = 999
}