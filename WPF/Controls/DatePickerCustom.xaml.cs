using System.ComponentModel;
using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;

namespace InvoiceApp.WPF.Controls;

public partial class DatePickerCustom : UserControl, INotifyPropertyChanged
{
    public static readonly DependencyProperty SelectedDateProperty =
        DependencyProperty.Register(nameof(SelectedDate), typeof(DateTime?), typeof(DatePickerCustom),
            new FrameworkPropertyMetadata(null, FrameworkPropertyMetadataOptions.BindsTwoWayByDefault, OnSelectedDateChanged));

    public static readonly DependencyProperty DisplayDateStartProperty =
        DependencyProperty.Register(nameof(DisplayDateStart), typeof(DateTime?), typeof(DatePickerCustom));

    public static readonly DependencyProperty DisplayDateEndProperty =
        DependencyProperty.Register(nameof(DisplayDateEnd), typeof(DateTime?), typeof(DatePickerCustom));

    public static readonly DependencyProperty BlackoutDatesProperty =
        DependencyProperty.Register(nameof(BlackoutDates), typeof(CalendarBlackoutDatesCollection), typeof(DatePickerCustom));

    public static readonly DependencyProperty FirstDayOfWeekProperty =
        DependencyProperty.Register(nameof(FirstDayOfWeek), typeof(DayOfWeek), typeof(DatePickerCustom),
            new PropertyMetadata(DayOfWeek.Sunday));

    public static readonly DependencyProperty IsTodayHighlightedProperty =
        DependencyProperty.Register(nameof(IsTodayHighlighted), typeof(bool), typeof(DatePickerCustom),
            new PropertyMetadata(true));

    public static readonly DependencyProperty SelectedDateFormatProperty =
        DependencyProperty.Register(nameof(SelectedDateFormat), typeof(DatePickerFormat), typeof(DatePickerCustom),
            new PropertyMetadata(DatePickerFormat.Short));

    public static readonly DependencyProperty TextProperty =
        DependencyProperty.Register(nameof(Text), typeof(string), typeof(DatePickerCustom),
            new FrameworkPropertyMetadata(string.Empty, FrameworkPropertyMetadataOptions.BindsTwoWayByDefault));

    public static readonly DependencyProperty HintTextProperty =
        DependencyProperty.Register(nameof(HintText), typeof(string), typeof(DatePickerCustom),
            new PropertyMetadata("Select date"));

    public static readonly DependencyProperty HelperTextProperty =
        DependencyProperty.Register(nameof(HelperText), typeof(string), typeof(DatePickerCustom));

    public static readonly DependencyProperty ShowQuickActionsProperty =
        DependencyProperty.Register(nameof(ShowQuickActions), typeof(bool), typeof(DatePickerCustom),
            new PropertyMetadata(true));

    public static readonly DependencyProperty ShowTodayButtonProperty =
        DependencyProperty.Register(nameof(ShowTodayButton), typeof(bool), typeof(DatePickerCustom),
            new PropertyMetadata(true));

    public static readonly DependencyProperty ShowClearButtonProperty =
        DependencyProperty.Register(nameof(ShowClearButton), typeof(bool), typeof(DatePickerCustom),
            new PropertyMetadata(true));

    public static readonly DependencyProperty AllowManualInputProperty =
        DependencyProperty.Register(nameof(AllowManualInput), typeof(bool), typeof(DatePickerCustom),
            new PropertyMetadata(true));

    public static readonly DependencyProperty DateFormatStringProperty =
        DependencyProperty.Register(nameof(DateFormatString), typeof(string), typeof(DatePickerCustom),
            new PropertyMetadata("dd/MM/yyyy"));

    public static readonly DependencyProperty MinDateProperty =
        DependencyProperty.Register(nameof(MinDate), typeof(DateTime?), typeof(DatePickerCustom),
            new PropertyMetadata(null, OnMinDateChanged));

    public static readonly DependencyProperty MaxDateProperty =
        DependencyProperty.Register(nameof(MaxDate), typeof(DateTime?), typeof(DatePickerCustom),
            new PropertyMetadata(null, OnMaxDateChanged));

    public static readonly DependencyProperty IsRequiredProperty =
        DependencyProperty.Register(nameof(IsRequired), typeof(bool), typeof(DatePickerCustom),
            new PropertyMetadata(false, OnIsRequiredChanged));

    // Properties
    public DateTime? SelectedDate
    {
        get => (DateTime?)GetValue(SelectedDateProperty);
        set => SetValue(SelectedDateProperty, value);
    }

    public DateTime? DisplayDateStart
    {
        get => (DateTime?)GetValue(DisplayDateStartProperty);
        set => SetValue(DisplayDateStartProperty, value);
    }

    public DateTime? DisplayDateEnd
    {
        get => (DateTime?)GetValue(DisplayDateEndProperty);
        set => SetValue(DisplayDateEndProperty, value);
    }

    public CalendarBlackoutDatesCollection BlackoutDates
    {
        get => (CalendarBlackoutDatesCollection)GetValue(BlackoutDatesProperty);
        set => SetValue(BlackoutDatesProperty, value);
    }

    public DayOfWeek FirstDayOfWeek
    {
        get => (DayOfWeek)GetValue(FirstDayOfWeekProperty);
        set => SetValue(FirstDayOfWeekProperty, value);
    }

    public bool IsTodayHighlighted
    {
        get => (bool)GetValue(IsTodayHighlightedProperty);
        set => SetValue(IsTodayHighlightedProperty, value);
    }

    public DatePickerFormat SelectedDateFormat
    {
        get => (DatePickerFormat)GetValue(SelectedDateFormatProperty);
        set => SetValue(SelectedDateFormatProperty, value);
    }

    public string Text
    {
        get => (string)GetValue(TextProperty);
        set => SetValue(TextProperty, value);
    }

    public string HintText
    {
        get => (string)GetValue(HintTextProperty);
        set => SetValue(HintTextProperty, value);
    }

    public string? HelperText
    {
        get => (string?)GetValue(HelperTextProperty);
        set => SetValue(HelperTextProperty, value);
    }

    public bool ShowQuickActions
    {
        get => (bool)GetValue(ShowQuickActionsProperty);
        set => SetValue(ShowQuickActionsProperty, value);
    }

    public bool ShowTodayButton
    {
        get => (bool)GetValue(ShowTodayButtonProperty);
        set => SetValue(ShowTodayButtonProperty, value);
    }

    public bool ShowClearButton
    {
        get => (bool)GetValue(ShowClearButtonProperty);
        set => SetValue(ShowClearButtonProperty, value);
    }

    public bool AllowManualInput
    {
        get => (bool)GetValue(AllowManualInputProperty);
        set => SetValue(AllowManualInputProperty, value);
    }

    public string DateFormatString
    {
        get => (string)GetValue(DateFormatStringProperty);
        set => SetValue(DateFormatStringProperty, value);
    }

    public DateTime? MinDate
    {
        get => (DateTime?)GetValue(MinDateProperty);
        set => SetValue(MinDateProperty, value);
    }

    public DateTime? MaxDate
    {
        get => (DateTime?)GetValue(MaxDateProperty);
        set => SetValue(MaxDateProperty, value);
    }

    public bool IsRequired
    {
        get => (bool)GetValue(IsRequiredProperty);
        set => SetValue(IsRequiredProperty, value);
    }

    // Validation properties
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

    // Events
    public static readonly RoutedEvent SelectedDateChangedEvent =
        EventManager.RegisterRoutedEvent(nameof(SelectedDateChanged), RoutingStrategy.Bubble,
            typeof(RoutedEventHandler), typeof(DatePickerCustom));

    public static readonly RoutedEvent CalendarOpenedEvent =
        EventManager.RegisterRoutedEvent(nameof(CalendarOpened), RoutingStrategy.Bubble,
            typeof(RoutedEventHandler), typeof(DatePickerCustom));

    public static readonly RoutedEvent CalendarClosedEvent =
        EventManager.RegisterRoutedEvent(nameof(CalendarClosed), RoutingStrategy.Bubble,
            typeof(RoutedEventHandler), typeof(DatePickerCustom));

    public event RoutedEventHandler SelectedDateChanged
    {
        add => AddHandler(SelectedDateChangedEvent, value);
        remove => RemoveHandler(SelectedDateChangedEvent, value);
    }

    public event RoutedEventHandler CalendarOpened
    {
        add => AddHandler(CalendarOpenedEvent, value);
        remove => RemoveHandler(CalendarOpenedEvent, value);
    }

    public event RoutedEventHandler CalendarClosed
    {
        add => AddHandler(CalendarClosedEvent, value);
        remove => RemoveHandler(CalendarClosedEvent, value);
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public DatePickerCustom()
    {
        InitializeComponent();
        BlackoutDates = new CalendarBlackoutDatesCollection();
        
        // Set culture-specific settings
        SetupCultureSettings();
        
        // Validate initial state
        ValidateDate();
    }

    private void SetupCultureSettings()
    {
        var culture = CultureInfo.CurrentCulture;
        FirstDayOfWeek = culture.DateTimeFormat.FirstDayOfWeek;
        
        // Set format based on culture if not explicitly set
        if (DateFormatString == "dd/MM/yyyy")
        {
            DateFormatString = culture.DateTimeFormat.ShortDatePattern;
        }
    }

    private static void OnSelectedDateChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is DatePickerCustom control)
        {
            control.ValidateDate();
            control.RaiseEvent(new RoutedEventArgs(SelectedDateChangedEvent));
        }
    }

    private static void OnMinDateChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is DatePickerCustom control)
        {
            control.DisplayDateStart = (DateTime?)e.NewValue;
            control.ValidateDate();
        }
    }

    private static void OnMaxDateChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is DatePickerCustom control)
        {
            control.DisplayDateEnd = (DateTime?)e.NewValue;
            control.ValidateDate();
        }
    }

    private static void OnIsRequiredChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is DatePickerCustom control)
        {
            control.ValidateDate();
        }
    }

    private void ValidateDate()
    {
        ErrorMessage = string.Empty;

        // Required validation
        if (IsRequired && !SelectedDate.HasValue)
        {
            ErrorMessage = "Date is required";
            return;
        }

        if (SelectedDate.HasValue)
        {
            var date = SelectedDate.Value;

            // Min date validation
            if (MinDate.HasValue && date < MinDate.Value)
            {
                ErrorMessage = $"Date must be after {MinDate.Value:d}";
                return;
            }

            // Max date validation
            if (MaxDate.HasValue && date > MaxDate.Value)
            {
                ErrorMessage = $"Date must be before {MaxDate.Value:d}";
                return;
            }

            // Check blackout dates
            if (IsDateBlackedOut(date))
            {
                ErrorMessage = "Selected date is not available";
                return;
            }
        }
    }

    private bool IsDateBlackedOut(DateTime date)
    {
        if (BlackoutDates == null) return false;

        return BlackoutDates.Any(range => 
            date >= range.Start && date <= range.End);
    }

    // Event Handlers
    private void MainDatePicker_SelectedDateChanged(object sender, SelectionChangedEventArgs e)
    {
        ValidateDate();
    }

    private void MainDatePicker_CalendarOpened(object sender, RoutedEventArgs e)
    {
        RaiseEvent(new RoutedEventArgs(CalendarOpenedEvent));
    }

    private void MainDatePicker_CalendarClosed(object sender, RoutedEventArgs e)
    {
        RaiseEvent(new RoutedEventArgs(CalendarClosedEvent));
    }

    private void MainDatePicker_PreviewKeyDown(object sender, KeyEventArgs e)
    {
        if (!AllowManualInput && e.Key != Key.Tab && e.Key != Key.Enter && 
            e.Key != Key.Delete && e.Key != Key.Back)
        {
            // Allow only navigation keys when manual input is disabled
            var navigationKeys = new[]
            {
                Key.Left, Key.Right, Key.Up, Key.Down,
                Key.Home, Key.End, Key.PageUp, Key.PageDown
            };

            if (!navigationKeys.Contains(e.Key))
            {
                e.Handled = true;
            }
        }

        // Handle special key combinations
        if (e.Key == Key.T && Keyboard.Modifiers == ModifierKeys.Control)
        {
            // Ctrl+T for today
            SetToday();
            e.Handled = true;
        }
        else if (e.Key == Key.Delete && Keyboard.Modifiers == ModifierKeys.Control)
        {
            // Ctrl+Delete for clear
            ClearDate();
            e.Handled = true;
        }
    }

    private void TodayButton_Click(object sender, RoutedEventArgs e)
    {
        SetToday();
    }

    private void ClearButton_Click(object sender, RoutedEventArgs e)
    {
        ClearDate();
    }

    // Public Methods
    public void SetToday()
    {
        var today = DateTime.Today;
        
        // Check if today is within bounds
        if ((MinDate.HasValue && today < MinDate.Value) ||
            (MaxDate.HasValue && today > MaxDate.Value) ||
            IsDateBlackedOut(today))
        {
            return; // Can't set today if it's out of bounds
        }

        SelectedDate = today;
    }

    public void ClearDate()
    {
        SelectedDate = null;
    }

    public void SetDateRange(DateTime? minDate, DateTime? maxDate)
    {
        MinDate = minDate;
        MaxDate = maxDate;
    }

    public void AddBlackoutDate(DateTime date)
    {
        BlackoutDates.Add(new CalendarDateRange(date));
    }

    public void AddBlackoutDateRange(DateTime start, DateTime end)
    {
        BlackoutDates.Add(new CalendarDateRange(start, end));
    }

    public void ClearBlackoutDates()
    {
        BlackoutDates.Clear();
    }

    public bool IsValidDate()
    {
        ValidateDate();
        return !HasError;
    }

    public void Focus()
    {
        MainDatePicker.Focus();
    }

    protected virtual void OnPropertyChanged([System.Runtime.CompilerServices.CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}