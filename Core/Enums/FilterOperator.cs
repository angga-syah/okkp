// E:\kp\4 invoice\Core\Enums\FilterOperator.cs
namespace InvoiceApp.Core.Enums;

public enum FilterOperator
{
    Equals = 1,
    NotEquals = 2,
    Contains = 3,
    NotContains = 4,
    StartsWith = 5,
    EndsWith = 6,
    GreaterThan = 7,
    LessThan = 8,
    GreaterThanOrEqual = 9,
    LessThanOrEqual = 10,
    Between = 11,
    In = 12,
    NotIn = 13,
    IsNull = 14,
    IsNotNull = 15
}