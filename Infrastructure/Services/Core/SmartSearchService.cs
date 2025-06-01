// E:\kp\4 invoice\Infrastructure\Services\Core\SmartSearchService.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Enums;
using InvoiceApp.Core.Interfaces.Services;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Infrastructure.Services.Core;

public class SmartSearchService : ISearchService
{
    private readonly ILogger<SmartSearchService> _logger;

    public SmartSearchService(ILogger<SmartSearchService> logger)
    {
        _logger = logger;
    }

    public async Task<List<SearchResult<Company>>> SearchCompaniesAsync(List<Company> companies, string searchTerm)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(searchTerm) || searchTerm.Length < 2)
                return new List<SearchResult<Company>>();

            var results = new List<SearchResult<Company>>();
            var normalizedSearch = NormalizeText(searchTerm);
            var searchWords = normalizedSearch.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            foreach (var company in companies)
            {
                var searchableText = $"{company.CompanyName} {company.Npwp} {company.Idtku} {company.Address} {company.ContactPerson}";
                var normalizedText = NormalizeText(searchableText);
                var textWords = normalizedText.Split(' ', StringSplitOptions.RemoveEmptyEntries);

                var matchResult = AnalyzeMatch(searchWords, textWords, normalizedText, normalizedSearch);

                if (matchResult.HasMatch)
                {
                    results.Add(new SearchResult<Company>
                    {
                        Item = company,
                        SearchRank = matchResult.Rank,
                        MatchedText = matchResult.MatchedText,
                        MatchType = matchResult.MatchType
                    });
                }
            }

            await Task.CompletedTask;
            return results.OrderBy(r => r.SearchRank).ThenBy(r => r.Item.CompanyName).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching companies with term: {SearchTerm}", searchTerm);
            return new List<SearchResult<Company>>();
        }
    }

    public async Task<List<SearchResult<TkaWorker>>> SearchTkaWorkersAsync(List<TkaWorker> tkaWorkers, string searchTerm)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(searchTerm) || searchTerm.Length < 2)
                return new List<SearchResult<TkaWorker>>();

            var results = new List<SearchResult<TkaWorker>>();
            var normalizedSearch = NormalizeText(searchTerm);
            var searchWords = normalizedSearch.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            foreach (var tka in tkaWorkers)
            {
                var searchableText = $"{tka.Nama} {tka.Passport} {tka.Divisi}";
                var normalizedText = NormalizeText(searchableText);
                var textWords = normalizedText.Split(' ', StringSplitOptions.RemoveEmptyEntries);

                var matchResult = AnalyzeMatch(searchWords, textWords, normalizedText, normalizedSearch);

                if (matchResult.HasMatch)
                {
                    results.Add(new SearchResult<TkaWorker>
                    {
                        Item = tka,
                        SearchRank = matchResult.Rank,
                        MatchedText = matchResult.MatchedText,
                        MatchType = matchResult.MatchType
                    });
                }

                // Also search family members
                foreach (var family in tka.FamilyMembers.Where(f => f.IsActive))
                {
                    var familySearchText = $"{family.Nama} {family.Passport}";
                    var familyNormalizedText = NormalizeText(familySearchText);
                    var familyTextWords = familyNormalizedText.Split(' ', StringSplitOptions.RemoveEmptyEntries);

                    var familyMatchResult = AnalyzeMatch(searchWords, familyTextWords, familyNormalizedText, normalizedSearch);

                    if (familyMatchResult.HasMatch)
                    {
                        // Create pseudo TkaWorker for family member search result
                        var familyAsTka = new TkaWorker
                        {
                            Id = family.Id + 100000, // Offset to distinguish
                            Nama = $"{family.Nama} ({family.Relationship} of {tka.Nama})",
                            Passport = family.Passport,
                            Divisi = tka.Divisi,
                            JenisKelamin = family.JenisKelamin,
                            IsActive = family.IsActive
                        };

                        results.Add(new SearchResult<TkaWorker>
                        {
                            Item = familyAsTka,
                            SearchRank = familyMatchResult.Rank + 10, // Lower priority than main TKA
                            MatchedText = familyMatchResult.MatchedText,
                            MatchType = familyMatchResult.MatchType
                        });
                    }
                }
            }

            await Task.CompletedTask;
            return results.OrderBy(r => r.SearchRank).ThenBy(r => r.Item.Nama).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching TKA workers with term: {SearchTerm}", searchTerm);
            return new List<SearchResult<TkaWorker>>();
        }
    }

    public async Task<List<SearchResult<Invoice>>> SearchInvoicesAsync(List<Invoice> invoices, string searchTerm)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(searchTerm) || searchTerm.Length < 2)
                return new List<SearchResult<Invoice>>();

            var results = new List<SearchResult<Invoice>>();
            var normalizedSearch = NormalizeText(searchTerm);
            var searchWords = normalizedSearch.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            foreach (var invoice in invoices)
            {
                var searchableText = $"{invoice.InvoiceNumber} {invoice.Company?.CompanyName} {invoice.Notes}";
                var normalizedText = NormalizeText(searchableText);
                var textWords = normalizedText.Split(' ', StringSplitOptions.RemoveEmptyEntries);

                var matchResult = AnalyzeMatch(searchWords, textWords, normalizedText, normalizedSearch);

                if (matchResult.HasMatch)
                {
                    results.Add(new SearchResult<Invoice>
                    {
                        Item = invoice,
                        SearchRank = matchResult.Rank,
                        MatchedText = matchResult.MatchedText,
                        MatchType = matchResult.MatchType
                    });
                }
            }

            await Task.CompletedTask;
            return results.OrderBy(r => r.SearchRank).ThenByDescending(r => r.Item.InvoiceDate).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching invoices with term: {SearchTerm}", searchTerm);
            return new List<SearchResult<Invoice>>();
        }
    }

    public async Task<List<SearchResultDto>> SearchGlobalAsync(string searchTerm, int maxResults = 20)
    {
        try
        {
            var results = new List<SearchResultDto>();

            // This would typically search across all entity types
            // For now, return empty list as it requires access to repositories
            
            await Task.CompletedTask;
            return results.Take(maxResults).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in global search with term: {SearchTerm}", searchTerm);
            return new List<SearchResultDto>();
        }
    }

    #region Helper Methods

    private MatchResult AnalyzeMatch(string[] searchWords, string[] itemWords, string fullText, string fullSearch)
    {
        // 1. Exact full match
        if (fullText == fullSearch)
            return new MatchResult(true, 1, SearchMatchType.ExactFullMatch, fullText);

        // 2. Exact word match (any word in search matches any word in item)
        foreach (var searchWord in searchWords)
        {
            if (itemWords.Any(w => w == searchWord))
                return new MatchResult(true, 2, SearchMatchType.ExactWordMatch, searchWord);
        }

        // 3. Starts with match
        if (fullText.StartsWith(fullSearch))
            return new MatchResult(true, 3, SearchMatchType.StartsWith, fullSearch);

        // 4. Contains match (substring)
        if (fullText.Contains(fullSearch))
            return new MatchResult(true, 4, SearchMatchType.Contains, fullSearch);

        // 5. All search words found in item (any order)
        var allWordsFound = searchWords.All(sw => 
            itemWords.Any(iw => iw.Contains(sw)) || fullText.Contains(sw));
        
        if (allWordsFound)
            return new MatchResult(true, 5, SearchMatchType.MultiWordMatch, fullSearch);

        // 6. Partial word matches with fuzzy tolerance
        var partialMatches = 0;
        var matchedWords = new List<string>();
        
        foreach (var searchWord in searchWords)
        {
            foreach (var itemWord in itemWords)
            {
                if (itemWord.Contains(searchWord) || 
                    LevenshteinDistance(searchWord, itemWord) <= 2)
                {
                    partialMatches++;
                    matchedWords.Add(itemWord);
                    break;
                }
            }
        }

        if (partialMatches >= searchWords.Length * 0.6) // 60% of words match
        {
            var matchType = matchedWords.Any(w => LevenshteinDistance(fullSearch, w) <= 2) 
                ? SearchMatchType.FuzzyMatch 
                : SearchMatchType.PartialMatch;
            
            return new MatchResult(true, matchType == SearchMatchType.FuzzyMatch ? 6 : 7, 
                matchType, string.Join(" ", matchedWords));
        }

        return new MatchResult(false, 999, SearchMatchType.NoMatch, "");
    }

    private string NormalizeText(string text)
    {
        return text?.ToLowerInvariant()
            .Replace(".", "")
            .Replace(",", "")
            .Replace("-", " ")
            .Replace("  ", " ")
            .Trim() ?? "";
    }

    private int LevenshteinDistance(string a, string b)
    {
        if (string.IsNullOrEmpty(a)) return b?.Length ?? 0;
        if (string.IsNullOrEmpty(b)) return a.Length;

        var matrix = new int[a.Length + 1, b.Length + 1];

        for (int i = 0; i <= a.Length; i++) matrix[i, 0] = i;
        for (int j = 0; j <= b.Length; j++) matrix[0, j] = j;

        for (int i = 1; i <= a.Length; i++)
        {
            for (int j = 1; j <= b.Length; j++)
            {
                var cost = a[i - 1] == b[j - 1] ? 0 : 1;
                matrix[i, j] = Math.Min(
                    Math.Min(matrix[i - 1, j] + 1, matrix[i, j - 1] + 1),
                    matrix[i - 1, j - 1] + cost);
            }
        }

        return matrix[a.Length, b.Length];
    }

    #endregion
}

public class MatchResult
{
    public bool HasMatch { get; set; }
    public double Rank { get; set; }
    public SearchMatchType MatchType { get; set; }
    public string MatchedText { get; set; }

    public MatchResult(bool hasMatch, double rank, SearchMatchType matchType, string matchedText)
    {
        HasMatch = hasMatch;
        Rank = rank;
        MatchType = matchType;
        MatchedText = matchedText;
    }
}