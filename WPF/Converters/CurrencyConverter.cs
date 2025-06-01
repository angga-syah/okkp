using System.Globalization;
using System.Windows.Data;

namespace InvoiceApp.WPF.Converters;

public class CurrencyConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value == null) return string.Empty;

        // Try to parse the value as decimal
        if (!decimal.TryParse(value.ToString(), out var decimalValue))
            return value.ToString() ?? string.Empty;

        // Get format from parameter or use default
        var format = parameter?.ToString() ?? "C0"; // Default to currency format with no decimals
        var cultureToUse = culture ?? CultureInfo.CurrentCulture;

        // Special handling for Indonesian Rupiah formatting
        if (cultureToUse.Name.StartsWith("id") || format.Contains("IDR"))
        {
            return FormatIndonesianCurrency(decimalValue, format);
        }

        return decimalValue.ToString(format, cultureToUse);
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value == null) return 0m;

        var stringValue = value.ToString();
        if (string.IsNullOrWhiteSpace(stringValue)) return 0m;

        // Remove currency symbols and formatting
        var cleanValue = CleanCurrencyString(stringValue);

        if (decimal.TryParse(cleanValue, NumberStyles.Number, culture ?? CultureInfo.CurrentCulture, out var result))
        {
            return result;
        }

        return 0m;
    }

    private string FormatIndonesianCurrency(decimal value, string format)
    {
        var formatted = value.ToString("N0", CultureInfo.InvariantCulture);
        
        // Replace comma with dot for thousand separator (Indonesian style)
        formatted = formatted.Replace(",", ".");
        
        // Add currency symbol based on format
        if (format.Contains("IDR") || format == "C" || format == "C0")
        {
            return $"Rp {formatted}";
        }
        
        return formatted;
    }

    private string CleanCurrencyString(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "0";

        // Remove common currency symbols and prefixes
        var cleanValue = value
            .Replace("Rp", "")
            .Replace("IDR", "")
            .Replace("$", "")
            .Replace("€", "")
            .Replace("£", "")
            .Replace("¥", "")
            .Replace("₹", "")
            .Trim();

        // Handle Indonesian formatting (dots as thousand separators)
        if (value.Contains("Rp") || value.Contains("IDR"))
        {
            // Convert Indonesian format: dots are thousand separators, comma is decimal
            var parts = cleanValue.Split(',');
            if (parts.Length == 2)
            {
                // Has decimal part
                var integerPart = parts[0].Replace(".", "");
                var decimalPart = parts[1];
                cleanValue = $"{integerPart}.{decimalPart}";
            }
            else
            {
                // No decimal part, just remove dots
                cleanValue = cleanValue.Replace(".", "");
            }
        }
        else
        {
            // Standard formatting: commas are thousand separators
            cleanValue = cleanValue.Replace(",", "");
        }

        return cleanValue;
    }
}

public class CurrencyWithSymbolConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value == null) return string.Empty;

        if (!decimal.TryParse(value.ToString(), out var decimalValue))
            return value.ToString() ?? string.Empty;

        var symbol = parameter?.ToString() ?? "Rp";
        var formatted = decimalValue.ToString("N0", CultureInfo.InvariantCulture);
        
        // Use Indonesian formatting (dots as thousand separators)
        formatted = formatted.Replace(",", ".");
        
        return $"{symbol} {formatted}";
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value == null) return 0m;

        var stringValue = value.ToString();
        if (string.IsNullOrWhiteSpace(stringValue)) return 0m;

        // Remove symbol and clean
        var symbol = parameter?.ToString() ?? "Rp";
        var cleanValue = stringValue.Replace(symbol, "").Trim();
        
        // Remove dots (thousand separators in Indonesian format)
        cleanValue = cleanValue.Replace(".", "");

        if (decimal.TryParse(cleanValue, out var result))
        {
            return result;
        }

        return 0m;
    }
}

public class AmountInWordsConverter : IValueConverter
{
    private static readonly string[] Units = 
    {
        "", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"
    };

    private static readonly string[] Teens = 
    {
        "sepuluh", "sebelas", "dua belas", "tiga belas", "empat belas", "lima belas",
        "enam belas", "tujuh belas", "delapan belas", "sembilan belas"
    };

    private static readonly string[] Tens = 
    {
        "", "", "dua puluh", "tiga puluh", "empat puluh", "lima puluh",
        "enam puluh", "tujuh puluh", "delapan puluh", "sembilan puluh"
    };

    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value == null) return string.Empty;

        if (!decimal.TryParse(value.ToString(), out var decimalValue))
            return string.Empty;

        // Round to nearest integer for word conversion
        var integerValue = (long)Math.Round(decimalValue, 0, MidpointRounding.AwayFromZero);

        if (integerValue == 0)
            return "nol rupiah";

        var result = ConvertToWords(integerValue);
        return $"{result} rupiah";
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException("Converting words back to numbers is not supported");
    }

    private string ConvertToWords(long number)
    {
        if (number == 0) return "nol";

        var words = new List<string>();

        // Handle billions
        if (number >= 1000000000)
        {
            var billions = number / 1000000000;
            if (billions == 1)
                words.Add("satu milyar");
            else
                words.Add($"{ConvertHundreds((int)billions)} milyar");
            number %= 1000000000;
        }

        // Handle millions
        if (number >= 1000000)
        {
            var millions = number / 1000000;
            if (millions == 1)
                words.Add("satu juta");
            else
                words.Add($"{ConvertHundreds((int)millions)} juta");
            number %= 1000000;
        }

        // Handle thousands
        if (number >= 1000)
        {
            var thousands = number / 1000;
            if (thousands == 1)
                words.Add("seribu");
            else
                words.Add($"{ConvertHundreds((int)thousands)} ribu");
            number %= 1000;
        }

        // Handle hundreds
        if (number > 0)
        {
            words.Add(ConvertHundreds((int)number));
        }

        return string.Join(" ", words);
    }

    private string ConvertHundreds(int number)
    {
        var words = new List<string>();

        // Handle hundreds
        if (number >= 100)
        {
            var hundreds = number / 100;
            if (hundreds == 1)
                words.Add("seratus");
            else
                words.Add($"{Units[hundreds]} ratus");
            number %= 100;
        }

        // Handle tens and units
        if (number >= 20)
        {
            var tens = number / 10;
            words.Add(Tens[tens]);
            number %= 10;
            if (number > 0)
                words.Add(Units[number]);
        }
        else if (number >= 10)
        {
            words.Add(Teens[number - 10]);
        }
        else if (number > 0)
        {
            words.Add(Units[number]);
        }

        return string.Join(" ", words);
    }
}

public class CurrencyCompactConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value == null) return string.Empty;

        if (!decimal.TryParse(value.ToString(), out var decimalValue))
            return value.ToString() ?? string.Empty;

        var absValue = Math.Abs(decimalValue);
        var sign = decimalValue < 0 ? "-" : "";

        string formatted;
        if (absValue >= 1000000000) // Billions
        {
            formatted = $"{sign}Rp {absValue / 1000000000:F1}M";
        }
        else if (absValue >= 1000000) // Millions
        {
            formatted = $"{sign}Rp {absValue / 1000000:F1}Jt";
        }
        else if (absValue >= 1000) // Thousands
        {
            formatted = $"{sign}Rp {absValue / 1000:F1}K";
        }
        else
        {
            formatted = $"{sign}Rp {absValue:F0}";
        }

        return formatted;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value == null) return 0m;

        var stringValue = value.ToString();
        if (string.IsNullOrWhiteSpace(stringValue)) return 0m;

        // Remove currency symbol
        var cleanValue = stringValue.Replace("Rp", "").Trim();
        
        var isNegative = cleanValue.StartsWith("-");
        if (isNegative) cleanValue = cleanValue.Substring(1).Trim();

        decimal multiplier = 1;
        if (cleanValue.EndsWith("M"))
        {
            multiplier = 1000000000;
            cleanValue = cleanValue.Substring(0, cleanValue.Length - 1);
        }
        else if (cleanValue.EndsWith("Jt"))
        {
            multiplier = 1000000;
            cleanValue = cleanValue.Substring(0, cleanValue.Length - 2);
        }
        else if (cleanValue.EndsWith("K"))
        {
            multiplier = 1000;
            cleanValue = cleanValue.Substring(0, cleanValue.Length - 1);
        }

        if (decimal.TryParse(cleanValue, out var result))
        {
            result *= multiplier;
            return isNegative ? -result : result;
        }

        return 0m;
    }
}

public class CurrencyColorConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value == null) return System.Windows.Media.Brushes.Black;

        if (!decimal.TryParse(value.ToString(), out var decimalValue))
            return System.Windows.Media.Brushes.Black;

        if (decimalValue > 0)
            return System.Windows.Media.Brushes.Green;
        else if (decimalValue < 0)
            return System.Windows.Media.Brushes.Red;
        else
            return System.Windows.Media.Brushes.Gray;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}