using System.ComponentModel;
using System.Globalization;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;

namespace InvoiceApp.WPF.Controls;

public enum NumericType
{
    Integer,
    Decimal,
    Currency,
    Percentage
}

public partial class NumericTextBox : UserControl, INotifyPropertyChanged
{
    // Dependency Properties
    public static readonly DependencyProperty ValueProperty =
        DependencyProperty.Register(nameof(Value), typeof(decimal?), typeof(NumericTextBox),
            new FrameworkPropertyMetadata(null, FrameworkPropertyMetadataOptions.BindsTwoWayByDefault, OnValueChanged));

    public static readonly DependencyProperty MinimumProperty =
        DependencyProperty.Register(nameof(Minimum), typeof(decimal?), typeof(NumericTextBox),
            new PropertyMetadata(null, OnMinimumChanged));

    public static readonly DependencyProperty MaximumProperty =
        DependencyProperty.Register(nameof(Maximum), typeof(decimal?), typeof(NumericTextBox),
            new PropertyMetadata(null, OnMaximumChanged));

    public static readonly DependencyProperty DecimalPlacesProperty =
        DependencyProperty.Register(nameof(DecimalPlaces), typeof(int), typeof(NumericTextBox),
            new PropertyMetadata(2, OnDecimalPlacesChanged));

    public static readonly DependencyProperty IncrementProperty =
        DependencyProperty.Register(nameof(Increment), typeof(decimal), typeof(NumericTextBox),
            new PropertyMetadata(1m));

    public static readonly DependencyProperty NumericTypeProperty =
        DependencyProperty.Register(nameof(NumericType), typeof(NumericType), typeof(NumericTextBox),
            new PropertyMetadata(NumericType.Decimal, OnNumericTypeChanged));

    public static readonly DependencyProperty PrefixProperty =
        DependencyProperty.Register(nameof(Prefix), typeof(string), typeof(NumericTextBox),
            new PropertyMetadata(string.Empty));

    public static readonly DependencyProperty SuffixProperty =
        DependencyProperty.Register(nameof(Suffix), typeof(string), typeof(NumericTextBox),
            new PropertyMetadata(string.Empty));

    public static readonly DependencyProperty PlaceholderTextProperty =
        DependencyProperty.Register(nameof(PlaceholderText), typeof(string), typeof(NumericTextBox),
            new PropertyMetadata("Enter number"));

    public static readonly DependencyProperty HelperTextProperty =
        DependencyProperty.Register(nameof(HelperText), typeof(string), typeof(NumericTextBox));

    public static readonly DependencyProperty IsReadOnlyProperty =
        DependencyProperty.Register(nameof(IsReadOnly), typeof(bool), typeof(NumericTextBox),
            new PropertyMetadata(false));

    public static readonly DependencyProperty ShowPrefixProperty =
        DependencyProperty.Register(nameof(ShowPrefix), typeof(bool), typeof(NumericTextBox),
            new PropertyMetadata(false));

    public static readonly DependencyProperty ShowSuffixProperty =
        DependencyProperty.Register(nameof(ShowSuffix), typeof(bool), typeof(NumericTextBox),
            new PropertyMetadata(false));

    public static readonly DependencyProperty ShowSpinButtonsProperty =
        DependencyProperty.Register(nameof(ShowSpinButtons), typeof(bool), typeof(NumericTextBox),
            new PropertyMetadata(false));

    public static readonly DependencyProperty ShowQuickValuesProperty =
        DependencyProperty.Register(nameof(ShowQuickValues), typeof(bool), typeof(NumericTextBox),
            new PropertyMetadata(false));

    public static readonly DependencyProperty ShowHundredProperty =
        DependencyProperty.Register(nameof(ShowHundred), typeof(bool), typeof(NumericTextBox),
            new PropertyMetadata(true));

    public static readonly DependencyProperty ShowThousandProperty =
        DependencyProperty.Register(nameof(ShowThousand), typeof(bool), typeof(NumericTextBox),
            new PropertyMetadata(true));

    public static readonly DependencyProperty ShowTenThousandProperty =
        DependencyProperty.Register(nameof(ShowTenThousand), typeof(bool), typeof(NumericTextBox),
            new PropertyMetadata(true));

    public static readonly DependencyProperty AllowNegativeProperty =
        DependencyProperty.Register(nameof(AllowNegative), typeof(bool), typeof(NumericTextBox),
            new PropertyMetadata(true));

    public static readonly DependencyProperty UseThousandSeparatorProperty =
        DependencyProperty.Register(nameof(UseThousandSeparator), typeof(bool), typeof(NumericTextBox),
            new PropertyMetadata(true));

    public static readonly DependencyProperty CustomFormatStringProperty =
        DependencyProperty.Register(nameof(CustomFormatString), typeof(string), typeof(NumericTextBox));

    public static readonly DependencyProperty ApplyVATRoundingProperty =
        DependencyProperty.Register(nameof(ApplyVATRounding), typeof(bool), typeof(NumericTextBox),
            new PropertyMetadata(false));

    // Properties
    public decimal? Value
    {
        get => (decimal?)GetValue(ValueProperty);
        set => SetValue(ValueProperty, value);
    }

    public decimal? Minimum
    {
        get => (decimal?)GetValue(MinimumProperty);
        set => SetValue(MinimumProperty, value);
    }

    public decimal? Maximum
    {
        get => (decimal?)GetValue(MaximumProperty);
        set => SetValue(MaximumProperty, value);
    }

    public int DecimalPlaces
    {
        get => (int)GetValue(DecimalPlacesProperty);
        set => SetValue(DecimalPlacesProperty, value);
    }

    public decimal Increment
    {
        get => (decimal)GetValue(IncrementProperty);
        set => SetValue(IncrementProperty, value);
    }

    public NumericType NumericType
    {
        get => (NumericType)GetValue(NumericTypeProperty);
        set => SetValue(NumericTypeProperty, value);
    }

    public string Prefix
    {
        get => (string)GetValue(PrefixProperty);
        set => SetValue(PrefixProperty, value);
    }

    public string Suffix
    {
        get => (string)GetValue(SuffixProperty);
        set => SetValue(SuffixProperty, value);
    }

    public string PlaceholderText
    {
        get => (string)GetValue(PlaceholderTextProperty);
        set => SetValue(PlaceholderTextProperty, value);
    }

    public string? HelperText
    {
        get => (string?)GetValue(HelperTextProperty);
        set => SetValue(HelperTextProperty, value);
    }

    public bool IsReadOnly
    {
        get => (bool)GetValue(IsReadOnlyProperty);
        set => SetValue(IsReadOnlyProperty, value);
    }

    public bool ShowPrefix
    {
        get => (bool)GetValue(ShowPrefixProperty);
        set => SetValue(ShowPrefixProperty, value);
    }

    public bool ShowSuffix
    {
        get => (bool)GetValue(ShowSuffixProperty);
        set => SetValue(ShowSuffixProperty, value);
    }

    public bool ShowSpinButtons
    {
        get => (bool)GetValue(ShowSpinButtonsProperty);
        set => SetValue(ShowSpinButtonsProperty, value);
    }

    public bool ShowQuickValues
    {
        get => (bool)GetValue(ShowQuickValuesProperty);
        set => SetValue(ShowQuickValuesProperty, value);
    }

    public bool ShowHundred
    {
        get => (bool)GetValue(ShowHundredProperty);
        set => SetValue(ShowHundredProperty, value);
    }

    public bool ShowThousand
    {
        get => (bool)GetValue(ShowThousandProperty);
        set => SetValue(ShowThousandProperty, value);
    }

    public bool ShowTenThousand
    {
        get => (bool)GetValue(ShowTenThousandProperty);
        set => SetValue(ShowTenThousandProperty, value);
    }

    public bool AllowNegative
    {
        get => (bool)GetValue(AllowNegativeProperty);
        set => SetValue(AllowNegativeProperty, value);
    }

    public bool UseThousandSeparator
    {
        get => (bool)GetValue(UseThousandSeparatorProperty);
        set => SetValue(UseThousandSeparatorProperty, value);
    }

    public string? CustomFormatString
    {
        get => (string?)GetValue(CustomFormatStringProperty);
        set => SetValue(CustomFormatStringProperty, value);
    }

    public bool ApplyVATRounding
    {
        get => (bool)GetValue(ApplyVATRoundingProperty);
        set => SetValue(ApplyVATRoundingProperty, value);
    }

    // Bindable Properties
    private string _displayText = string.Empty;
    public string DisplayText
    {
        get => _displayText;
        set
        {
            if (_displayText != value)
            {
                _displayText = value;
                OnPropertyChanged();
            }
        }
    }

    private string _errorMessage = string.Empty;
    public string ErrorMessage
    {
        get => _errorMessage;
        private set
        {
            _errorMessage = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(HasError));
        }
    }

    public bool HasError => !string.IsNullOrEmpty(ErrorMessage);

    public bool CanIncrement => Value < Maximum;
    public bool CanDecrement => Value > Minimum;

    // Private fields
    private bool _isUpdatingText;
    private readonly CultureInfo _culture = CultureInfo.CurrentCulture;

    // Events
    public static readonly RoutedEvent ValueChangedEvent =
        EventManager.RegisterRoutedEvent(nameof(ValueChanged), RoutingStrategy.Bubble,
            typeof(RoutedEventHandler), typeof(NumericTextBox));

    public event RoutedEventHandler ValueChanged
    {
        add => AddHandler(ValueChangedEvent, value);
        remove => RemoveHandler(ValueChangedEvent, value);
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public NumericTextBox()
    {
        InitializeComponent();
        UpdateDisplayText();
        UpdateNumericType();
    }

    private static void OnValueChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is NumericTextBox control && !control._isUpdatingText)
        {
            control.UpdateDisplayText();
            control.ValidateValue();
            control.OnPropertyChanged(nameof(CanIncrement));
            control.OnPropertyChanged(nameof(CanDecrement));
            control.RaiseEvent(new RoutedEventArgs(ValueChangedEvent));
        }
    }

    private static void OnMinimumChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is NumericTextBox control)
        {
            control.ValidateValue();
            control.OnPropertyChanged(nameof(CanDecrement));
        }
    }

    private static void OnMaximumChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is NumericTextBox control)
        {
            control.ValidateValue();
            control.OnPropertyChanged(nameof(CanIncrement));
        }
    }

    private static void OnDecimalPlacesChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is NumericTextBox control)
        {
            control.UpdateDisplayText();
        }
    }

    private static void OnNumericTypeChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is NumericTextBox control)
        {
            control.UpdateNumericType();
            control.UpdateDisplayText();
        }
    }

    private void UpdateNumericType()
    {
        var styleName = NumericType switch
        {
            NumericType.Currency => "CurrencyTextBoxStyle",
            NumericType.Percentage => "PercentageTextBoxStyle",
            _ => "NumericTextBoxStyle"
        };

        if (Resources[styleName] is Style style)
        {
            MainTextBox.Style = style;
        }

        // Update prefix/suffix based on type
        switch (NumericType)
        {
            case NumericType.Currency:
                if (string.IsNullOrEmpty(Prefix))
                {
                    Prefix = _culture.NumberFormat.CurrencySymbol;
                    ShowPrefix = true;
                }
                break;
                
            case NumericType.Percentage:
                if (string.IsNullOrEmpty(Suffix))
                {
                    Suffix = "%";
                    ShowSuffix = true;
                }
                break;
        }
    }

    private void UpdateDisplayText()
    {
        if (_isUpdatingText) return;

        _isUpdatingText = true;
        try
        {
            if (Value.HasValue)
            {
                DisplayText = FormatValue(Value.Value);
            }
            else
            {
                DisplayText = string.Empty;
            }
        }
        finally
        {
            _isUpdatingText = false;
        }
    }

    private string FormatValue(decimal value)
    {
        if (!string.IsNullOrEmpty(CustomFormatString))
        {
            return value.ToString(CustomFormatString, _culture);
        }

        return NumericType switch
        {
            NumericType.Integer => value.ToString("N0", _culture),
            NumericType.Currency => value.ToString("N" + DecimalPlaces, _culture),
            NumericType.Percentage => value.ToString("N" + DecimalPlaces, _culture),
            NumericType.Decimal => value.ToString("N" + DecimalPlaces, _culture),
            _ => value.ToString("N" + DecimalPlaces, _culture)
        };
    }

    private decimal? ParseValue(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return null;

        // Remove prefix and suffix
        var cleanText = text;
        if (!string.IsNullOrEmpty(Prefix))
            cleanText = cleanText.Replace(Prefix, "");
        if (!string.IsNullOrEmpty(Suffix))
            cleanText = cleanText.Replace(Suffix, "");

        // Remove thousand separators
        cleanText = cleanText.Replace(_culture.NumberFormat.NumberGroupSeparator, "");

        // Try to parse
        if (decimal.TryParse(cleanText, NumberStyles.Number, _culture, out var result))
        {
            if (ApplyVATRounding)
            {
                result = ApplyVATRoundingRule(result);
            }
            
            return result;
        }

        return null;
    }

    private decimal ApplyVATRoundingRule(decimal value)
    {
        // Apply Indonesian VAT rounding rule: 
        // 18.000,49 → 18.000 | 18.000,50 → 18.001
        var integerPart = Math.Truncate(value);
        var fractionalPart = value - integerPart;

        if (fractionalPart >= 0.5m)
        {
            return integerPart + 1;
        }
        else
        {
            return integerPart;
        }
    }

    private void ValidateValue()
    {
        ErrorMessage = string.Empty;

        if (Value.HasValue)
        {
            var value = Value.Value;

            if (Minimum.HasValue && value < Minimum.Value)
            {
                ErrorMessage = $"Value must be at least {FormatValue(Minimum.Value)}";
                return;
            }

            if (Maximum.HasValue && value > Maximum.Value)
            {
                ErrorMessage = $"Value must not exceed {FormatValue(Maximum.Value)}";
                return;
            }

            if (!AllowNegative && value < 0)
            {
                ErrorMessage = "Negative values are not allowed";
                return;
            }
        }
    }

    // Event Handlers
    private void MainTextBox_TextChanged(object sender, TextChangedEventArgs e)
    {
        if (_isUpdatingText) return;

        var parsedValue = ParseValue(DisplayText);
        
        _isUpdatingText = true;
        try
        {
            Value = parsedValue;
        }
        finally
        {
            _isUpdatingText = false;
        }

        ValidateValue();
    }

    private void MainTextBox_PreviewTextInput(object sender, TextCompositionEventArgs e)
    {
        // Allow only numeric input
        var isNumeric = IsNumericInput(e.Text);
        var isDecimalSeparator = e.Text == _culture.NumberFormat.NumberDecimalSeparator;
        var isNegativeSign = e.Text == _culture.NumberFormat.NegativeSign && AllowNegative;

        // Check if decimal separator is already present
        if (isDecimalSeparator && MainTextBox.Text.Contains(_culture.NumberFormat.NumberDecimalSeparator))
        {
            e.Handled = true;
            return;
        }

        // For integer type, don't allow decimal separator
        if (isDecimalSeparator && NumericType == NumericType.Integer)
        {
            e.Handled = true;
            return;
        }

        // For negative sign, only allow at the beginning
        if (isNegativeSign && MainTextBox.CaretIndex != 0)
        {
            e.Handled = true;
            return;
        }

        e.Handled = !(isNumeric || isDecimalSeparator || isNegativeSign);
    }

    private bool IsNumericInput(string input)
    {
        return input.All(char.IsDigit);
    }

    private void MainTextBox_PreviewKeyDown(object sender, KeyEventArgs e)
    {
        // Handle special keys
        switch (e.Key)
        {
            case Key.Up:
                IncrementValue();
                e.Handled = true;
                break;
                
            case Key.Down:
                DecrementValue();
                e.Handled = true;
                break;
                
            case Key.PageUp:
                IncrementValue(Increment * 10);
                e.Handled = true;
                break;
                
            case Key.PageDown:
                DecrementValue(Increment * 10);
                e.Handled = true;
                break;
                
            case Key.Home:
                if (Minimum.HasValue)
                {
                    Value = Minimum.Value;
                    e.Handled = true;
                }
                break;
                
            case Key.End:
                if (Maximum.HasValue)
                {
                    Value = Maximum.Value;
                    e.Handled = true;
                }
                break;
        }
    }

    private void MainTextBox_GotFocus(object sender, RoutedEventArgs e)
    {
        // Select all text when focused
        MainTextBox.SelectAll();
    }

    private void MainTextBox_LostFocus(object sender, RoutedEventArgs e)
    {
        // Format the value when focus is lost
        UpdateDisplayText();
    }

    private void IncrementButton_Click(object sender, RoutedEventArgs e)
    {
        IncrementValue();
    }

    private void DecrementButton_Click(object sender, RoutedEventArgs e)
    {
        DecrementValue();
    }

    private void QuickValueButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button button && button.Tag is string tagValue)
        {
            if (decimal.TryParse(tagValue, out var value))
            {
                Value = value;
            }
        }
    }

    // Public Methods
    public void IncrementValue(decimal? increment = null)
    {
        var inc = increment ?? Increment;
        var currentValue = Value ?? 0;
        var newValue = currentValue + inc;

        if (Maximum.HasValue && newValue > Maximum.Value)
            newValue = Maximum.Value;

        Value = newValue;
    }

    public void DecrementValue(decimal? decrement = null)
    {
        var dec = decrement ?? Increment;
        var currentValue = Value ?? 0;
        var newValue = currentValue - dec;

        if (Minimum.HasValue && newValue < Minimum.Value)
            newValue = Minimum.Value;

        Value = newValue;
    }

    public void SetValue(decimal value)
    {
        Value = value;
    }

    public void Clear()
    {
        Value = null;
    }

    public bool IsValid()
    {
        ValidateValue();
        return !HasError;
    }

    public void Focus()
    {
        MainTextBox.Focus();
    }

    // Static factory methods
    public static NumericTextBox CreateCurrencyBox(decimal? value = null, decimal? minimum = null, decimal? maximum = null)
    {
        return new NumericTextBox
        {
            NumericType = NumericType.Currency,
            Value = value,
            Minimum = minimum,
            Maximum = maximum,
            DecimalPlaces = 0,
            UseThousandSeparator = true,
            ApplyVATRounding = true
        };
    }

    public static NumericTextBox CreatePercentageBox(decimal? value = null, decimal? minimum = 0, decimal? maximum = 100)
    {
        return new NumericTextBox
        {
            NumericType = NumericType.Percentage,
            Value = value,
            Minimum = minimum,
            Maximum = maximum,
            DecimalPlaces = 2
        };
    }

    public static NumericTextBox CreateIntegerBox(decimal? value = null, decimal? minimum = null, decimal? maximum = null)
    {
        return new NumericTextBox
        {
            NumericType = NumericType.Integer,
            Value = value,
            Minimum = minimum,
            Maximum = maximum,
            DecimalPlaces = 0
        };
    }

    protected virtual void OnPropertyChanged([System.Runtime.CompilerServices.CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}