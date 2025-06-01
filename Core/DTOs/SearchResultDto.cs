// E:\kp\4 invoice\Core\DTOs\SearchResultDto.cs
namespace InvoiceApp.Core.DTOs;

public class SearchResultDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // Company, TKA, Invoice, etc.
    public string Url { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public double Score { get; set; }
    public SearchMatchType MatchType { get; set; }
    public string MatchedText { get; set; } = string.Empty;
    public Dictionary<string, object> Metadata { get; set; } = new();
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class SearchResult<T>
{
    public T Item { get; set; } = default!;
    public double SearchRank { get; set; }
    public string MatchedText { get; set; } = string.Empty;
    public SearchMatchType MatchType { get; set; }
    public bool HasMatch => SearchRank < 999;
}