using System.Globalization;
using System.Windows.Data;

namespace InvoiceApp.WPF.Converters;

public class DateFormatConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value == null) return string.Empty;

        DateTime dateValue;
        
        // Try to parse different date types
        if (value is DateTime dt)
        {
            dateValue = dt;
        }
        else if (value is DateTimeOffset dto)
        {
            dateValue = dto.DateTime;
        }
        else if (DateTime.TryParse(value.ToString(), out var parsedDate))
        {
            dateValue = parsedDate;
        }
        else
        {
            return value.ToString() ?? string.Empty;
        }

        // Get format from parameter or use default Indonesian format
        var format = parameter?.ToString() ?? "dd MMMM yyyy";
        
        // Use Indonesian culture for month names
        var indonesianCulture = new CultureInfo("id-ID");
        
        // Special handling for common Indonesian formats
        switch (format.ToUpperInvariant())
        {
            case "SHORT":
                return dateValue.ToString("dd/MM/yyyy", indonesianCulture);
                
            case "MEDIUM":
                return dateValue.ToString("dd MMM yyyy", indonesianCulture);
                
            case "LONG":
                return dateValue.ToString("dd MMMM yyyy", indonesianCulture);
                
            case "FULL":
                return dateValue.ToString("dddd, dd MMMM yyyy", indonesianCulture);
                
            case "INVOICE":
                // Indonesian invoice format: "Jakarta, 15 Januari 2025"
                var place = "Jakarta"; // Default place, could be configurable
                return $"{place}, {dateValue.ToString("dd MMMM yyyy", indonesianCulture)}";
                
            case "RELATIVE":
                return GetRelativeDate(dateValue);
                
            case "TIME":
                return dateValue.ToString("HH:mm", indonesianCulture);
                
            case "DATETIME":
                return dateValue.ToString("dd/MM/yyyy HH:mm", indonesianCulture);
                
            case "ISO":
                return dateValue.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                
            default:
                return dateValue.ToString(format, indonesianCulture);
        }
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value == null) return null;

        var stringValue = value.ToString();
        if (string.IsNullOrWhiteSpace(stringValue)) return null;

        // Try to parse with Indonesian culture first
        var indonesianCulture = new CultureInfo("id-ID");
        
        if (DateTime.TryParse(stringValue, indonesianCulture, DateTimeStyles.None, out var result))
        {
            return result;
        }

        // Fallback to current culture
        if (DateTime.TryParse(stringValue, culture ?? CultureInfo.CurrentCulture, DateTimeStyles.None, out result))
        {
            return result;
        }

        // Try invariant culture for ISO dates
        if (DateTime.TryParse(stringValue, CultureInfo.InvariantCulture, DateTimeStyles.None, out result))
        {
            return result;
        }

        return null;
    }

    private string GetRelativeDate(DateTime date)
    {
        var now = DateTime.Now;
        var timeSpan = now - date;

        if (timeSpan.TotalDays < 1)
        {
            if (timeSpan.TotalHours < 1)
            {
                if (timeSpan.TotalMinutes < 1)
                    return "Baru saja";
                else
                    return $"{(int)timeSpan.TotalMinutes} menit yang lalu";
            }
            else
            {
                return $"{(int)timeSpan.TotalHours} jam yang lalu";
            }
        }
        else if (timeSpan.TotalDays < 7)
        {
            return $"{(int)timeSpan.TotalDays} hari yang lalu";
        }
        else if (timeSpan.TotalDays < 30)
        {
            var weeks = (int)(timeSpan.TotalDays / 7);
            return $"{weeks} minggu yang lalu";
        }
        else if (timeSpan.TotalDays < 365)
        {
            var months = (int)(timeSpan.TotalDays / 30);
            return $"{months} bulan yang lalu";
        }
        else
        {
            var years = (int)(timeSpan.TotalDays / 365);
            return $"{years} tahun yang lalu";
        }
    }
}

public class DateRangeConverter : IMultiValueConverter
{
    public object Convert(object[] values, Type targetType, object parameter, CultureInfo culture)
    {
        if (values == null || values.Length != 2) return string.Empty;

        var startDate = values[0] as DateTime?;
        var endDate = values[1] as DateTime?;

        if (!startDate.HasValue && !endDate.HasValue)
            return string.Empty;

        var indonesianCulture = new CultureInfo("id-ID");
        var format = parameter?.ToString() ?? "dd MMMM yyyy";

        if (startDate.HasValue && endDate.HasValue)
        {
            if (startDate.Value.Date == endDate.Value.Date)
            {
                return startDate.Value.ToString(format, indonesianCulture);
            }
            else
            {
                return $"{startDate.Value.ToString(format, indonesianCulture)} - {endDate.Value.ToString(format, indonesianCulture)}";
            }
        }
        else if (startDate.HasValue)
        {
            return $"Dari {startDate.Value.ToString(format, indonesianCulture)}";
        }
        else if (endDate.HasValue)
        {
            return $"Sampai {endDate.Value.ToString(format, indonesianCulture)}";
        }

        return string.Empty;
    }

    public object[] ConvertBack(object value, Type[] targetTypes, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class DateStatusConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is not DateTime date) return "Unknown";

        var now = DateTime.Now.Date;
        var dateOnly = date.Date;

        if (dateOnly < now)
            return "Overdue";
        else if (dateOnly == now)
            return "Today";
        else if (dateOnly == now.AddDays(1))
            return "Tomorrow";
        else if (dateOnly <= now.AddDays(7))
            return "This Week";
        else if (dateOnly <= now.AddDays(30))
            return "This Month";
        else
            return "Future";
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class DateColorConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is not DateTime date)
            return System.Windows.Media.Brushes.Black;

        var now = DateTime.Now.Date;
        var dateOnly = date.Date;

        if (dateOnly < now)
            return System.Windows.Media.Brushes.Red; // Overdue
        else if (dateOnly == now)
            return System.Windows.Media.Brushes.Orange; // Today
        else if (dateOnly <= now.AddDays(7))
            return System.Windows.Media.Brushes.Gold; // This week
        else
            return System.Windows.Media.Brushes.Green; // Future
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class AgeConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is not DateTime birthDate) return string.Empty;

        var today = DateTime.Today;
        var age = today.Year - birthDate.Year;

        // Adjust if birthday hasn't occurred this year
        if (birthDate.Date > today.AddYears(-age))
            age--;

        var format = parameter?.ToString()?.ToUpperInvariant() ?? "YEARS";

        return format switch
        {
            "YEARS" => $"{age} tahun",
            "MONTHS" => $"{age * 12 + (today.Month - birthDate.Month)} bulan",
            "DAYS" => $"{(today - birthDate).Days} hari",
            "SHORT" => age.ToString(),
            _ => $"{age} tahun"
        };
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class TimeSpanConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is not TimeSpan timeSpan) return string.Empty;

        var format = parameter?.ToString()?.ToUpperInvariant() ?? "FULL";

        return format switch
        {
            "HOURS" => $"{timeSpan.TotalHours:F1} jam",
            "MINUTES" => $"{timeSpan.TotalMinutes:F0} menit",
            "SECONDS" => $"{timeSpan.TotalSeconds:F0} detik",
            "HHMM" => $"{timeSpan.Hours:D2}:{timeSpan.Minutes:D2}",
            "HHMMSS" => $"{timeSpan.Hours:D2}:{timeSpan.Minutes:D2}:{timeSpan.Seconds:D2}",
            "SHORT" => timeSpan.TotalHours >= 1 ? $"{timeSpan.Hours}j {timeSpan.Minutes}m" : $"{timeSpan.Minutes}m",
            "FULL" => timeSpan.TotalDays >= 1 
                ? $"{(int)timeSpan.TotalDays}h {timeSpan.Hours}j {timeSpan.Minutes}m"
                : timeSpan.TotalHours >= 1 
                    ? $"{timeSpan.Hours}j {timeSpan.Minutes}m" 
                    : $"{timeSpan.Minutes}m",
            _ => timeSpan.ToString()
        };
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value == null) return TimeSpan.Zero;

        var stringValue = value.ToString();
        if (string.IsNullOrWhiteSpace(stringValue)) return TimeSpan.Zero;

        if (TimeSpan.TryParse(stringValue, out var result))
            return result;

        return TimeSpan.Zero;
    }
}

public class WorkingDaysConverter : IMultiValueConverter
{
    public object Convert(object[] values, Type targetType, object parameter, CultureInfo culture)
    {
        if (values == null || values.Length != 2) return 0;

        if (values[0] is not DateTime startDate || values[1] is not DateTime endDate)
            return 0;

        var workingDays = 0;
        var currentDate = startDate.Date;

        while (currentDate <= endDate.Date)
        {
            // Skip weekends (Saturday = 6, Sunday = 0)
            if (currentDate.DayOfWeek != DayOfWeek.Saturday && currentDate.DayOfWeek != DayOfWeek.Sunday)
            {
                workingDays++;
            }
            currentDate = currentDate.AddDays(1);
        }

        var format = parameter?.ToString() ?? "NUMBER";
        
        return format.ToUpperInvariant() switch
        {
            "TEXT" => $"{workingDays} hari kerja",
            "SHORT" => $"{workingDays} hk",
            _ => workingDays
        };
    }

    public object[] ConvertBack(object value, Type[] targetTypes, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}