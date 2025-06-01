// E:\kp\4 invoice\WPF\Controls\LoadingSpinner.xaml.cs
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using MaterialDesignThemes.Wpf;

namespace InvoiceApp.WPF.Controls;

/// <summary>
/// Modern loading spinner control with multiple animation types
/// Provides various loading indicators with customizable appearance
/// </summary>
public partial class LoadingSpinner : UserControl
{
    public LoadingSpinner()
    {
        InitializeComponent();
        DataContext = this;
        
        // Set default values
        SpinnerBrush = Application.Current.FindResource("PrimaryBrush") as Brush ?? Brushes.Blue;
        Size = 32;
        DotSize = 8;
        IconKind = PackIconKind.Loading;
        SpinnerType = SpinnerType.Rotation;
        LoadingText = "Loading...";
        IsSpinning = true;
        ShowText = false;
        ShowProgress = false;
    }

    #region Dependency Properties

    // Appearance Properties
    public static readonly DependencyProperty SpinnerBrushProperty =
        DependencyProperty.Register(nameof(SpinnerBrush), typeof(Brush), typeof(LoadingSpinner),
            new PropertyMetadata(null));

    public static readonly DependencyProperty SizeProperty =
        DependencyProperty.Register(nameof(Size), typeof(double), typeof(LoadingSpinner),
            new PropertyMetadata(32.0));

    public static readonly DependencyProperty DotSizeProperty =
        DependencyProperty.Register(nameof(DotSize), typeof(double), typeof(LoadingSpinner),
            new PropertyMetadata(8.0));

    public static readonly DependencyProperty IconKindProperty =
        DependencyProperty.Register(nameof(IconKind), typeof(PackIconKind), typeof(LoadingSpinner),
            new PropertyMetadata(PackIconKind.Loading));

    public static readonly DependencyProperty SpinnerTypeProperty =
        DependencyProperty.Register(nameof(SpinnerType), typeof(SpinnerType), typeof(LoadingSpinner),
            new PropertyMetadata(SpinnerType.Rotation));

    // State Properties
    public static readonly DependencyProperty IsSpinningProperty =
        DependencyProperty.Register(nameof(IsSpinning), typeof(bool), typeof(LoadingSpinner),
            new PropertyMetadata(true));

    public static readonly DependencyProperty LoadingTextProperty =
        DependencyProperty.Register(nameof(LoadingText), typeof(string), typeof(LoadingSpinner),
            new PropertyMetadata("Loading..."));

    public static readonly DependencyProperty ShowTextProperty =
        DependencyProperty.Register(nameof(ShowText), typeof(bool), typeof(LoadingSpinner),
            new PropertyMetadata(false));

    public static readonly DependencyProperty ShowProgressProperty =
        DependencyProperty.Register(nameof(ShowProgress), typeof(bool), typeof(LoadingSpinner),
            new PropertyMetadata(false));

    public static readonly DependencyProperty ProgressPercentageProperty =
        DependencyProperty.Register(nameof(ProgressPercentage), typeof(double), typeof(LoadingSpinner),
            new PropertyMetadata(0.0));

    // Animation Properties
    public static readonly DependencyProperty AnimationSpeedProperty =
        DependencyProperty.Register(nameof(AnimationSpeed), typeof(double), typeof(LoadingSpinner),
            new PropertyMetadata(1.0));

    #endregion

    #region Properties

    public Brush SpinnerBrush
    {
        get => (Brush)GetValue(SpinnerBrushProperty);
        set => SetValue(SpinnerBrushProperty, value);
    }

    public double Size
    {
        get => (double)GetValue(SizeProperty);
        set => SetValue(SizeProperty, value);
    }

    public double DotSize
    {
        get => (double)GetValue(DotSizeProperty);
        set => SetValue(DotSizeProperty, value);
    }

    public PackIconKind IconKind
    {
        get => (PackIconKind)GetValue(IconKindProperty);
        set => SetValue(IconKindProperty, value);
    }

    public SpinnerType SpinnerType
    {
        get => (SpinnerType)GetValue(SpinnerTypeProperty);
        set => SetValue(SpinnerTypeProperty, value);
    }

    public bool IsSpinning
    {
        get => (bool)GetValue(IsSpinningProperty);
        set => SetValue(IsSpinningProperty, value);
    }

    public string LoadingText
    {
        get => (string)GetValue(LoadingTextProperty);
        set => SetValue(LoadingTextProperty, value);
    }

    public bool ShowText
    {
        get => (bool)GetValue(ShowTextProperty);
        set => SetValue(ShowTextProperty, value);
    }

    public bool ShowProgress
    {
        get => (bool)GetValue(ShowProgressProperty);
        set => SetValue(ShowProgressProperty, value);
    }

    public double ProgressPercentage
    {
        get => (double)GetValue(ProgressPercentageProperty);
        set => SetValue(ProgressPercentageProperty, value);
    }

    public double AnimationSpeed
    {
        get => (double)GetValue(AnimationSpeedProperty);
        set => SetValue(AnimationSpeedProperty, value);
    }

    #endregion

    #region Public Methods

    /// <summary>
    /// Start the loading animation
    /// </summary>
    public void Start()
    {
        IsSpinning = true;
    }

    /// <summary>
    /// Stop the loading animation
    /// </summary>
    public void Stop()
    {
        IsSpinning = false;
    }

    /// <summary>
    /// Toggle the loading animation
    /// </summary>
    public void Toggle()
    {
        IsSpinning = !IsSpinning;
    }

    /// <summary>
    /// Set the loading state with optional text
    /// </summary>
    public void SetLoading(bool isLoading, string text = null)
    {
        IsSpinning = isLoading;
        if (!string.IsNullOrEmpty(text))
        {
            LoadingText = text;
            ShowText = true;
        }
    }

    /// <summary>
    /// Set progress percentage and show progress indicator
    /// </summary>
    public void SetProgress(double percentage, string text = null)
    {
        ProgressPercentage = Math.Max(0, Math.Min(100, percentage));
        ShowProgress = true;
        
        if (!string.IsNullOrEmpty(text))
        {
            LoadingText = text;
            ShowText = true;
        }
    }

    /// <summary>
    /// Hide progress indicator
    /// </summary>
    public void HideProgress()
    {
        ShowProgress = false;
        ProgressPercentage = 0;
    }

    /// <summary>
    /// Set spinner appearance
    /// </summary>
    public void SetAppearance(SpinnerType type, double size = 32, Brush brush = null)
    {
        SpinnerType = type;
        Size = size;
        
        if (brush != null)
        {
            SpinnerBrush = brush;
        }

        // Adjust dot size based on main size for dots spinner
        if (type == SpinnerType.Dots)
        {
            DotSize = size * 0.25; // 25% of main size
        }
    }

    /// <summary>
    /// Set spinner colors for different states
    /// </summary>
    public void SetStateColor(LoadingState state)
    {
        SpinnerBrush = state switch
        {
            LoadingState.Normal => Application.Current.FindResource("PrimaryBrush") as Brush,
            LoadingState.Success => Application.Current.FindResource("SuccessBrush") as Brush,
            LoadingState.Warning => Application.Current.FindResource("WarningBrush") as Brush,
            LoadingState.Error => Application.Current.FindResource("ErrorBrush") as Brush,
            LoadingState.Info => Application.Current.FindResource("InfoBrush") as Brush,
            _ => Application.Current.FindResource("PrimaryBrush") as Brush
        } ?? Brushes.Blue;
    }

    /// <summary>
    /// Create a preset spinner configuration
    /// </summary>
    public void ApplyPreset(LoadingPreset preset)
    {
        switch (preset)
        {
            case LoadingPreset.Small:
                SetAppearance(SpinnerType.Rotation, 16);
                ShowText = false;
                ShowProgress = false;
                break;

            case LoadingPreset.Medium:
                SetAppearance(SpinnerType.Rotation, 32);
                ShowText = false;
                ShowProgress = false;
                break;

            case LoadingPreset.Large:
                SetAppearance(SpinnerType.ProgressRing, 48);
                ShowText = true;
                ShowProgress = false;
                break;

            case LoadingPreset.Dots:
                SetAppearance(SpinnerType.Dots, 32);
                ShowText = true;
                ShowProgress = false;
                break;

            case LoadingPreset.Progress:
                SetAppearance(SpinnerType.ProgressRing, 40);
                ShowText = true;
                ShowProgress = true;
                break;

            case LoadingPreset.Minimal:
                SetAppearance(SpinnerType.Pulse, 24);
                ShowText = false;
                ShowProgress = false;
                break;

            case LoadingPreset.Ripple:
                SetAppearance(SpinnerType.Ripple, 40);
                ShowText = false;
                ShowProgress = false;
                break;
        }
    }

    #endregion

    #region Static Factory Methods

    /// <summary>
    /// Create a small inline spinner
    /// </summary>
    public static LoadingSpinner CreateSmall(Brush brush = null)
    {
        var spinner = new LoadingSpinner();
        spinner.ApplyPreset(LoadingPreset.Small);
        if (brush != null) spinner.SpinnerBrush = brush;
        return spinner;
    }

    /// <summary>
    /// Create a medium spinner with text
    /// </summary>
    public static LoadingSpinner CreateMedium(string text = "Loading...", Brush brush = null)
    {
        var spinner = new LoadingSpinner();
        spinner.ApplyPreset(LoadingPreset.Medium);
        spinner.LoadingText = text;
        spinner.ShowText = true;
        if (brush != null) spinner.SpinnerBrush = brush;
        return spinner;
    }

    /// <summary>
    /// Create a large spinner for full-screen overlays
    /// </summary>
    public static LoadingSpinner CreateLarge(string text = "Loading...", Brush brush = null)
    {
        var spinner = new LoadingSpinner();
        spinner.ApplyPreset(LoadingPreset.Large);
        spinner.LoadingText = text;
        if (brush != null) spinner.SpinnerBrush = brush;
        return spinner;
    }

    /// <summary>
    /// Create a progress spinner with percentage display
    /// </summary>
    public static LoadingSpinner CreateProgress(string text = "Processing...", Brush brush = null)
    {
        var spinner = new LoadingSpinner();
        spinner.ApplyPreset(LoadingPreset.Progress);
        spinner.LoadingText = text;
        if (brush != null) spinner.SpinnerBrush = brush;
        return spinner;
    }

    /// <summary>
    /// Create a dots spinner for subtle loading indication
    /// </summary>
    public static LoadingSpinner CreateDots(string text = "Loading", Brush brush = null)
    {
        var spinner = new LoadingSpinner();
        spinner.ApplyPreset(LoadingPreset.Dots);
        spinner.LoadingText = text;
        if (brush != null) spinner.SpinnerBrush = brush;
        return spinner;
    }

    #endregion
}

#region Enums

/// <summary>
/// Available spinner animation types
/// </summary>
public enum SpinnerType
{
    Rotation,
    Pulse,
    Dots,
    Ripple,
    ProgressRing
}

/// <summary>
/// Loading state colors
/// </summary>
public enum LoadingState
{
    Normal,
    Success,
    Warning,
    Error,
    Info
}

/// <summary>
/// Predefined spinner configurations
/// </summary>
public enum LoadingPreset
{
    Small,
    Medium,
    Large,
    Dots,
    Progress,
    Minimal,
    Ripple
}

#endregion