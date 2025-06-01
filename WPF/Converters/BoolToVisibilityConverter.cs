using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace InvoiceApp.WPF.Converters;

public class BoolToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is bool boolValue)
        {
            return boolValue ? Visibility.Visible : Visibility.Collapsed;
        }

        return Visibility.Collapsed;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is Visibility visibility)
        {
            return visibility == Visibility.Visible;
        }

        return false;
    }
}

public class InverseBoolToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is bool boolValue)
        {
            return boolValue ? Visibility.Collapsed : Visibility.Visible;
        }

        return Visibility.Visible;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is Visibility visibility)
        {
            return visibility == Visibility.Collapsed;
        }

        return true;
    }
}

public class BoolToVisibilityHiddenConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is bool boolValue)
        {
            return boolValue ? Visibility.Visible : Visibility.Hidden;
        }

        return Visibility.Hidden;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is Visibility visibility)
        {
            return visibility == Visibility.Visible;
        }

        return false;
    }
}

public class MultiBoolToVisibilityConverter : IMultiValueConverter
{
    public object Convert(object[] values, Type targetType, object parameter, CultureInfo culture)
    {
        if (values == null || values.Length == 0)
            return Visibility.Collapsed;

        var operation = parameter?.ToString()?.ToUpperInvariant() ?? "AND";

        switch (operation)
        {
            case "AND":
                return values.All(v => v is bool b && b) ? Visibility.Visible : Visibility.Collapsed;
                
            case "OR":
                return values.Any(v => v is bool b && b) ? Visibility.Visible : Visibility.Collapsed;
                
            case "NAND":
                return values.All(v => v is bool b && b) ? Visibility.Collapsed : Visibility.Visible;
                
            case "NOR":
                return values.Any(v => v is bool b && b) ? Visibility.Collapsed : Visibility.Visible;
                
            default:
                return Visibility.Collapsed;
        }
    }

    public object[] ConvertBack(object value, Type[] targetTypes, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class NullToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        var isVisible = value != null;
        
        // Check if parameter indicates inverse behavior
        if (parameter?.ToString()?.ToUpperInvariant() == "INVERSE")
        {
            isVisible = !isVisible;
        }

        return isVisible ? Visibility.Visible : Visibility.Collapsed;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class StringToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        var stringValue = value?.ToString();
        var isEmpty = string.IsNullOrWhiteSpace(stringValue);
        
        // Check if parameter indicates inverse behavior
        if (parameter?.ToString()?.ToUpperInvariant() == "INVERSE")
        {
            isEmpty = !isEmpty;
        }

        return isEmpty ? Visibility.Collapsed : Visibility.Visible;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class CountToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        var count = 0;
        
        if (value is int intValue)
        {
            count = intValue;
        }
        else if (value is System.Collections.ICollection collection)
        {
            count = collection.Count;
        }
        else if (value is System.Collections.IEnumerable enumerable)
        {
            count = enumerable.Cast<object>().Count();
        }

        var threshold = 0;
        if (parameter != null && int.TryParse(parameter.ToString(), out var paramValue))
        {
            threshold = paramValue;
        }

        return count > threshold ? Visibility.Visible : Visibility.Collapsed;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class EqualityToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value == null && parameter == null)
            return Visibility.Visible;
            
        if (value == null || parameter == null)
            return Visibility.Collapsed;

        var isEqual = value.ToString() == parameter.ToString();
        
        return isEqual ? Visibility.Visible : Visibility.Collapsed;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class ComparisonToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (parameter?.ToString() is not string paramString || paramString.Length < 2)
            return Visibility.Collapsed;

        var operation = paramString.Substring(0, 1);
        var compareValueString = paramString.Substring(1);

        if (!double.TryParse(value?.ToString(), out var numericValue) ||
            !double.TryParse(compareValueString, out var compareValue))
        {
            return Visibility.Collapsed;
        }

        var isVisible = operation switch
        {
            ">" => numericValue > compareValue,
            "<" => numericValue < compareValue,
            "=" => Math.Abs(numericValue - compareValue) < 0.0001,
            "!" => Math.Abs(numericValue - compareValue) >= 0.0001,
            _ => false
        };

        return isVisible ? Visibility.Visible : Visibility.Collapsed;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}