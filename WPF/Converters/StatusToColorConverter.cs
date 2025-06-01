using System.Globalization;
using System.Windows.Data;
using System.Windows.Media;
using InvoiceApp.Core.Enums;

namespace InvoiceApp.WPF.Converters;

public class StatusToColorConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value == null) return Brushes.Gray;

        // Handle InvoiceStatus enum
        if (value is InvoiceStatus invoiceStatus)
        {
            return invoiceStatus switch
            {
                InvoiceStatus.Draft => Brushes.Orange,
                InvoiceStatus.Finalized => Brushes.Blue,
                InvoiceStatus.Paid => Brushes.Green,
                InvoiceStatus.Cancelled => Brushes.Red,
                _ => Brushes.Gray
            };
        }

        // Handle string status values
        var statusString = value.ToString()?.ToLowerInvariant();
        
        return statusString switch
        {
            "draft" or "pending" or "new" => Brushes.Orange,
            "finalized" or "final" or "completed" or "finished" => Brushes.Blue,
            "paid" or "success" or "approved" or "active" => Brushes.Green,
            "cancelled" or "canceled" or "rejected" or "failed" or "inactive" => Brushes.Red,
            "processing" or "in progress" or "working" => Brushes.Purple,
            "warning" or "attention" or "review" => Brushes.Goldenrod,
            "overdue" or "expired" or "late" => Brushes.Crimson,
            "on hold" or "paused" or "suspended" => Brushes.Gray,
            _ => Brushes.Black
        };
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class StatusToBrushConverter : IValueConverter
{
    private static readonly SolidColorBrush DraftBrush = new(Color.FromRgb(255, 152, 0)); // Orange
    private static readonly SolidColorBrush FinalizedBrush = new(Color.FromRgb(33, 150, 243)); // Blue
    private static readonly SolidColorBrush PaidBrush = new(Color.FromRgb(76, 175, 80)); // Green
    private static readonly SolidColorBrush CancelledBrush = new(Color.FromRgb(244, 67, 54)); // Red
    private static readonly SolidColorBrush ProcessingBrush = new(Color.FromRgb(156, 39, 176)); // Purple
    private static readonly SolidColorBrush WarningBrush = new(Color.FromRgb(255, 193, 7)); // Amber
    private static readonly SolidColorBrush OverdueBrush = new(Color.FromRgb(220, 53, 69)); // Crimson
    private static readonly SolidColorBrush DefaultBrush = new(Color.FromRgb(96, 125, 139)); // Blue Gray

    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value == null) return DefaultBrush;

        // Handle InvoiceStatus enum
        if (value is InvoiceStatus invoiceStatus)
        {
            return invoiceStatus switch
            {
                InvoiceStatus.Draft => DraftBrush,
                InvoiceStatus.Finalized => FinalizedBrush,
                InvoiceStatus.Paid => PaidBrush,
                InvoiceStatus.Cancelled => CancelledBrush,
                _ => DefaultBrush
            };
        }

        // Handle string status values
        var statusString = value.ToString()?.ToLowerInvariant();
        
        return statusString switch
        {
            "draft" or "pending" or "new" => DraftBrush,
            "finalized" or "final" or "completed" or "finished" => FinalizedBrush,
            "paid" or "success" or "approved" or "active" => PaidBrush,
            "cancelled" or "canceled" or "rejected" or "failed" or "inactive" => CancelledBrush,
            "processing" or "in progress" or "working" => ProcessingBrush,
            "warning" or "attention" or "review" => WarningBrush,
            "overdue" or "expired" or "late" => OverdueBrush,
            _ => DefaultBrush
        };
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class StatusToTextConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value == null) return "Unknown";

        // Handle InvoiceStatus enum
        if (value is InvoiceStatus invoiceStatus)
        {
            return invoiceStatus switch
            {
                InvoiceStatus.Draft => "Draft",
                InvoiceStatus.Finalized => "Final",
                InvoiceStatus.Paid => "Lunas",
                InvoiceStatus.Cancelled => "Dibatalkan",
                _ => "Unknown"
            };
        }

        // Handle string status values with Indonesian translation
        var statusString = value.ToString()?.ToLowerInvariant();
        
        return statusString switch
        {
            "draft" => "Draft",
            "pending" => "Menunggu",
            "new" => "Baru",
            "finalized" or "final" => "Final",
            "completed" => "Selesai",
            "finished" => "Selesai",
            "paid" => "Lunas",
            "success" => "Berhasil",
            "approved" => "Disetujui",
            "active" => "Aktif",
            "cancelled" or "canceled" => "Dibatalkan",
            "rejected" => "Ditolak",
            "failed" => "Gagal",
            "inactive" => "Tidak Aktif",
            "processing" => "Diproses",
            "in progress" => "Dalam Proses",
            "working" => "Sedang Dikerjakan",
            "warning" => "Peringatan",
            "attention" => "Perhatian",
            "review" => "Ditinjau",
            "overdue" => "Terlambat",
            "expired" => "Kedaluwarsa",
            "late" => "Terlambat",
            "on hold" => "Ditahan",
            "paused" => "Dijeda",
            "suspended" => "Ditangguhkan",
            _ => value.ToString() ?? "Unknown"
        };
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        var textValue = value?.ToString()?.ToLowerInvariant();
        
        return textValue switch
        {
            "draft" => InvoiceStatus.Draft,
            "final" => InvoiceStatus.Finalized,
            "lunas" => InvoiceStatus.Paid,
            "dibatalkan" => InvoiceStatus.Cancelled,
            _ => InvoiceStatus.Draft
        };
    }
}

public class PriorityToColorConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value == null) return Brushes.Gray;

        var priority = value.ToString()?.ToLowerInvariant();
        
        return priority switch
        {
            "high" or "urgent" or "critical" or "tinggi" => Brushes.Red,
            "medium" or "normal" or "sedang" => Brushes.Orange,
            "low" or "rendah" => Brushes.Green,
            _ => Brushes.Gray
        };
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class BooleanToStatusColorConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is not bool boolValue) return Brushes.Gray;

        var colorType = parameter?.ToString()?.ToLowerInvariant() ?? "success";
        
        return colorType switch
        {
            "success" => boolValue ? Brushes.Green : Brushes.Red,
            "warning" => boolValue ? Brushes.Orange : Brushes.Green,
            "info" => boolValue ? Brushes.Blue : Brushes.Gray,
            _ => boolValue ? Brushes.Green : Brushes.Red
        };
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class NumericToStatusConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value == null) return Brushes.Gray;

        if (!double.TryParse(value.ToString(), out var numericValue))
            return Brushes.Gray;

        // Parse parameter for thresholds: "low,high" e.g., "30,70"
        var thresholds = parameter?.ToString()?.Split(',');
        if (thresholds?.Length == 2 && 
            double.TryParse(thresholds[0], out var lowThreshold) &&
            double.TryParse(thresholds[1], out var highThreshold))
        {
            if (numericValue <= lowThreshold)
                return Brushes.Red;
            else if (numericValue <= highThreshold)
                return Brushes.Orange;
            else
                return Brushes.Green;
        }

        // Default thresholds
        return numericValue switch
        {
            <= 30 => Brushes.Red,
            <= 70 => Brushes.Orange,
            _ => Brushes.Green
        };
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class ConnectionStatusConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is not bool isConnected) return Brushes.Gray;

        if (targetType == typeof(Brush) || targetType == typeof(SolidColorBrush))
        {
            return isConnected ? Brushes.Green : Brushes.Red;
        }
        
        if (targetType == typeof(string))
        {
            return isConnected ? "Terhubung" : "Terputus";
        }

        return isConnected;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class MultiStatusConverter : IMultiValueConverter
{
    public object Convert(object[] values, Type targetType, object parameter, CultureInfo culture)
    {
        if (values == null || values.Length == 0) return Brushes.Gray;

        var operation = parameter?.ToString()?.ToUpperInvariant() ?? "AND";
        
        // Convert all values to status strings
        var statuses = values.Select(v => v?.ToString()?.ToLowerInvariant()).ToArray();
        
        // Determine overall status based on operation
        switch (operation)
        {
            case "WORST":
                // Return worst status (priority: cancelled > overdue > warning > processing > success)
                if (statuses.Any(s => s == "cancelled" || s == "failed"))
                    return Brushes.Red;
                if (statuses.Any(s => s == "overdue" || s == "expired"))
                    return Brushes.Crimson;
                if (statuses.Any(s => s == "warning" || s == "attention"))
                    return Brushes.Orange;
                if (statuses.Any(s => s == "processing" || s == "pending"))
                    return Brushes.Purple;
                if (statuses.All(s => s == "success" || s == "paid" || s == "completed"))
                    return Brushes.Green;
                return Brushes.Gray;
                
            case "BEST":
                // Return best status
                if (statuses.Any(s => s == "success" || s == "paid" || s == "completed"))
                    return Brushes.Green;
                if (statuses.Any(s => s == "processing" || s == "pending"))
                    return Brushes.Purple;
                if (statuses.Any(s => s == "warning" || s == "attention"))
                    return Brushes.Orange;
                return Brushes.Red;
                
            default: // "AVERAGE" or any other
                var successCount = statuses.Count(s => s == "success" || s == "paid" || s == "completed");
                var totalCount = statuses.Length;
                var ratio = (double)successCount / totalCount;
                
                return ratio switch
                {
                    >= 0.8 => Brushes.Green,
                    >= 0.5 => Brushes.Orange,
                    _ => Brushes.Red
                };
        }
    }

    public object[] ConvertBack(object value, Type[] targetTypes, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}