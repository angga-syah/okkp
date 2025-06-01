// E:\kp\4 invoice\WPF\Controls\AnimatedCard.xaml.cs
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using MaterialDesignThemes.Wpf;

namespace InvoiceApp.WPF.Controls;

/// <summary>
/// Modern animated card control with Material Design styling
/// Provides smooth animations, loading states, and customizable content areas
/// </summary>
public partial class AnimatedCard : UserControl
{
    public AnimatedCard()
    {
        InitializeComponent();
        DataContext = this;
        
        // Set default values
        HeaderIconBrush = Application.Current.FindResource("PrimaryBrush") as Brush ?? Brushes.Blue;
        StatusBrush = Application.Current.FindResource("PrimaryBrush") as Brush ?? Brushes.Blue;
        LoadingText = "Loading...";
    }

    #region Dependency Properties

    // Content Properties
    public static readonly DependencyProperty ContentProperty =
        DependencyProperty.Register(nameof(Content), typeof(object), typeof(AnimatedCard),
            new PropertyMetadata(null));

    public static readonly DependencyProperty HeaderActionsProperty =
        DependencyProperty.Register(nameof(HeaderActions), typeof(object), typeof(AnimatedCard),
            new PropertyMetadata(null));

    public static readonly DependencyProperty FooterContentProperty =
        DependencyProperty.Register(nameof(FooterContent), typeof(object), typeof(AnimatedCard),
            new PropertyMetadata(null));

    // Header Properties
    public static readonly DependencyProperty HeaderTitleProperty =
        DependencyProperty.Register(nameof(HeaderTitle), typeof(string), typeof(AnimatedCard),
            new PropertyMetadata(null, OnHeaderPropertyChanged));

    public static readonly DependencyProperty HeaderSubtitleProperty =
        DependencyProperty.Register(nameof(HeaderSubtitle), typeof(string), typeof(AnimatedCard),
            new PropertyMetadata(null, OnHeaderPropertyChanged));

    public static readonly DependencyProperty HeaderIconProperty =
        DependencyProperty.Register(nameof(HeaderIcon), typeof(PackIconKind?), typeof(AnimatedCard),
            new PropertyMetadata(null, OnHeaderPropertyChanged));

    public static readonly DependencyProperty HeaderIconBrushProperty =
        DependencyProperty.Register(nameof(HeaderIconBrush), typeof(Brush), typeof(AnimatedCard),
            new PropertyMetadata(null));

    // State Properties
    public static readonly DependencyProperty IsLoadingProperty =
        DependencyProperty.Register(nameof(IsLoading), typeof(bool), typeof(AnimatedCard),
            new PropertyMetadata(false));

    public static readonly DependencyProperty LoadingTextProperty =
        DependencyProperty.Register(nameof(LoadingText), typeof(string), typeof(AnimatedCard),
            new PropertyMetadata("Loading..."));

    public static readonly DependencyProperty IsSelectedProperty =
        DependencyProperty.Register(nameof(IsSelected), typeof(bool), typeof(AnimatedCard),
            new PropertyMetadata(false));

    public static readonly DependencyProperty IsClickableProperty =
        DependencyProperty.Register(nameof(IsClickable), typeof(bool), typeof(AnimatedCard),
            new PropertyMetadata(false));

    // Status Properties
    public static readonly DependencyProperty HasStatusProperty =
        DependencyProperty.Register(nameof(HasStatus), typeof(bool), typeof(AnimatedCard),
            new PropertyMetadata(false));

    public static readonly DependencyProperty StatusBrushProperty =
        DependencyProperty.Register(nameof(StatusBrush), typeof(Brush), typeof(AnimatedCard),
            new PropertyMetadata(null));

    // Command Properties
    public static readonly DependencyProperty ClickCommandProperty =
        DependencyProperty.Register(nameof(ClickCommand), typeof(ICommand), typeof(AnimatedCard),
            new PropertyMetadata(null));

    public static readonly DependencyProperty ClickCommandParameterProperty =
        DependencyProperty.Register(nameof(ClickCommandParameter), typeof(object), typeof(AnimatedCard),
            new PropertyMetadata(null));

    // Layout Properties - Override default UserControl properties
    public new static readonly DependencyProperty PaddingProperty =
        DependencyProperty.Register(nameof(Padding), typeof(Thickness), typeof(AnimatedCard),
            new PropertyMetadata(new Thickness(16)));

    public new static readonly DependencyProperty MarginProperty =
        DependencyProperty.Register(nameof(Margin), typeof(Thickness), typeof(AnimatedCard),
            new PropertyMetadata(new Thickness(8)));

    #endregion

    #region Properties

    public new object Content
    {
        get => GetValue(ContentProperty);
        set => SetValue(ContentProperty, value);
    }

    public object HeaderActions
    {
        get => GetValue(HeaderActionsProperty);
        set => SetValue(HeaderActionsProperty, value);
    }

    public object FooterContent
    {
        get => GetValue(FooterContentProperty);
        set => SetValue(FooterContentProperty, value);
    }

    public string HeaderTitle
    {
        get => (string)GetValue(HeaderTitleProperty);
        set => SetValue(HeaderTitleProperty, value);
    }

    public string HeaderSubtitle
    {
        get => (string)GetValue(HeaderSubtitleProperty);
        set => SetValue(HeaderSubtitleProperty, value);
    }

    public PackIconKind? HeaderIcon
    {
        get => (PackIconKind?)GetValue(HeaderIconProperty);
        set => SetValue(HeaderIconProperty, value);
    }

    public Brush HeaderIconBrush
    {
        get => (Brush)GetValue(HeaderIconBrushProperty);
        set => SetValue(HeaderIconBrushProperty, value);
    }

    public bool IsLoading
    {
        get => (bool)GetValue(IsLoadingProperty);
        set => SetValue(IsLoadingProperty, value);
    }

    public string LoadingText
    {
        get => (string)GetValue(LoadingTextProperty);
        set => SetValue(LoadingTextProperty, value);
    }

    public bool IsSelected
    {
        get => (bool)GetValue(IsSelectedProperty);
        set => SetValue(IsSelectedProperty, value);
    }

    public bool IsClickable
    {
        get => (bool)GetValue(IsClickableProperty);
        set => SetValue(IsClickableProperty, value);
    }

    public bool HasStatus
    {
        get => (bool)GetValue(HasStatusProperty);
        set => SetValue(HasStatusProperty, value);
    }

    public Brush StatusBrush
    {
        get => (Brush)GetValue(StatusBrushProperty);
        set => SetValue(StatusBrushProperty, value);
    }

    public ICommand ClickCommand
    {
        get => (ICommand)GetValue(ClickCommandProperty);
        set => SetValue(ClickCommandProperty, value);
    }

    public object ClickCommandParameter
    {
        get => GetValue(ClickCommandParameterProperty);
        set => SetValue(ClickCommandParameterProperty, value);
    }

    public new Thickness Padding
    {
        get => (Thickness)GetValue(PaddingProperty);
        set => SetValue(PaddingProperty, value);
    }

    public new Thickness Margin
    {
        get => (Thickness)GetValue(MarginProperty);
        set => SetValue(MarginProperty, value);
    }

    // Computed Properties
    public bool HasHeader => !string.IsNullOrEmpty(HeaderTitle) || 
                            !string.IsNullOrEmpty(HeaderSubtitle) || 
                            HeaderIcon.HasValue;

    public bool HasHeaderActions => HeaderActions != null;

    public bool HasFooter => FooterContent != null;

    #endregion

    #region Events

    public event RoutedEventHandler CardClicked;
    public event RoutedEventHandler CardDoubleClicked;
    public event RoutedEventHandler CardRightClicked;

    #endregion

    #region Event Handlers

    private static void OnHeaderPropertyChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is AnimatedCard card)
        {
            // Trigger property change notifications for computed properties
            card.OnPropertyChanged(nameof(HasHeader));
        }
    }

    protected override void OnMouseLeftButtonDown(MouseButtonEventArgs e)
    {
        base.OnMouseLeftButtonDown(e);
        
        if (IsClickable && IsEnabled)
        {
            // Execute command if available
            if (ClickCommand?.CanExecute(ClickCommandParameter) == true)
            {
                ClickCommand.Execute(ClickCommandParameter);
            }

            // Raise event
            CardClicked?.Invoke(this, new RoutedEventArgs());
        }
    }

    protected override void OnMouseDoubleClick(MouseButtonEventArgs e)
    {
        base.OnMouseDoubleClick(e);
        
        if (IsClickable && IsEnabled)
        {
            CardDoubleClicked?.Invoke(this, new RoutedEventArgs());
        }
    }

    protected override void OnMouseRightButtonDown(MouseButtonEventArgs e)
    {
        base.OnMouseRightButtonDown(e);
        
        if (IsEnabled)
        {
            CardRightClicked?.Invoke(this, new RoutedEventArgs());
        }
    }

    protected override void OnKeyDown(KeyEventArgs e)
    {
        base.OnKeyDown(e);
        
        if (IsClickable && IsEnabled && (e.Key == Key.Enter || e.Key == Key.Space))
        {
            if (ClickCommand?.CanExecute(ClickCommandParameter) == true)
            {
                ClickCommand.Execute(ClickCommandParameter);
            }
            
            CardClicked?.Invoke(this, new RoutedEventArgs());
            e.Handled = true;
        }
    }

    #endregion

    #region Public Methods

    /// <summary>
    /// Set the card to loading state with optional custom text
    /// </summary>
    public void SetLoading(bool isLoading, string loadingText = null)
    {
        IsLoading = isLoading;
        if (!string.IsNullOrEmpty(loadingText))
        {
            LoadingText = loadingText;
        }
    }

    /// <summary>
    /// Set the card status with brush and visibility
    /// </summary>
    public void SetStatus(bool hasStatus, Brush statusBrush = null)
    {
        HasStatus = hasStatus;
        if (statusBrush != null)
        {
            StatusBrush = statusBrush;
        }
    }

    /// <summary>
    /// Set the card selection state
    /// </summary>
    public void SetSelected(bool isSelected)
    {
        IsSelected = isSelected;
    }

    /// <summary>
    /// Configure the card header
    /// </summary>
    public void SetHeader(string title, string subtitle = null, PackIconKind? icon = null, Brush iconBrush = null)
    {
        HeaderTitle = title;
        HeaderSubtitle = subtitle;
        HeaderIcon = icon;
        if (iconBrush != null)
        {
            HeaderIconBrush = iconBrush;
        }
    }

    /// <summary>
    /// Show success status
    /// </summary>
    public void ShowSuccessStatus()
    {
        SetStatus(true, Application.Current.FindResource("SuccessBrush") as Brush);
    }

    /// <summary>
    /// Show warning status
    /// </summary>
    public void ShowWarningStatus()
    {
        SetStatus(true, Application.Current.FindResource("WarningBrush") as Brush);
    }

    /// <summary>
    /// Show error status
    /// </summary>
    public void ShowErrorStatus()
    {
        SetStatus(true, Application.Current.FindResource("ErrorBrush") as Brush);
    }

    /// <summary>
    /// Show info status
    /// </summary>
    public void ShowInfoStatus()
    {
        SetStatus(true, Application.Current.FindResource("InfoBrush") as Brush);
    }

    /// <summary>
    /// Hide status indicator
    /// </summary>
    public void HideStatus()
    {
        SetStatus(false);
    }

    /// <summary>
    /// Animate the card with a bounce effect
    /// </summary>
    public void AnimateBounce()
    {
        var bounceAnimation = new System.Windows.Media.Animation.DoubleAnimationUsingKeyFrames
        {
            Duration = TimeSpan.FromMilliseconds(600)
        };
        
        bounceAnimation.KeyFrames.Add(new System.Windows.Media.Animation.EasingDoubleKeyFrame(1.0, TimeSpan.Zero));
        bounceAnimation.KeyFrames.Add(new System.Windows.Media.Animation.EasingDoubleKeyFrame(1.1, TimeSpan.FromMilliseconds(200)));
        bounceAnimation.KeyFrames.Add(new System.Windows.Media.Animation.EasingDoubleKeyFrame(0.95, TimeSpan.FromMilliseconds(400)));
        bounceAnimation.KeyFrames.Add(new System.Windows.Media.Animation.EasingDoubleKeyFrame(1.0, TimeSpan.FromMilliseconds(600)));

        var scaleTransform = MainCard.RenderTransform as System.Windows.Media.TransformGroup;
        var scale = scaleTransform?.Children.OfType<System.Windows.Media.ScaleTransform>().FirstOrDefault();
        
        if (scale != null)
        {
            scale.BeginAnimation(System.Windows.Media.ScaleTransform.ScaleXProperty, bounceAnimation);
            scale.BeginAnimation(System.Windows.Media.ScaleTransform.ScaleYProperty, bounceAnimation);
        }
    }

    /// <summary>
    /// Flash the card with a color highlight
    /// </summary>
    public void FlashHighlight(Brush highlightBrush = null, TimeSpan? duration = null)
    {
        var brush = highlightBrush ?? Application.Current.FindResource("PrimaryLightBrush") as Brush;
        var originalBrush = MainCard.Background;
        var animationDuration = duration ?? TimeSpan.FromMilliseconds(800);

        var colorAnimation = new System.Windows.Media.Animation.ColorAnimation
        {
            To = ((SolidColorBrush)brush).Color,
            Duration = TimeSpan.FromMilliseconds(animationDuration.TotalMilliseconds / 2),
            AutoReverse = true
        };

        if (MainCard.Background is SolidColorBrush solidBrush)
        {
            solidBrush.BeginAnimation(SolidColorBrush.ColorProperty, colorAnimation);
        }
    }

    #endregion

    #region INotifyPropertyChanged Implementation

    public event System.ComponentModel.PropertyChangedEventHandler PropertyChanged;

    protected virtual void OnPropertyChanged([System.Runtime.CompilerServices.CallerMemberName] string propertyName = null)
    {
        PropertyChanged?.Invoke(this, new System.ComponentModel.PropertyChangedEventArgs(propertyName));
    }

    #endregion

    #region Override Methods

    protected override void OnGotFocus(RoutedEventArgs e)
    {
        base.OnGotFocus(e);
        
        if (IsClickable)
        {
            // Add focus indicator
            MainCard.BorderThickness = new Thickness(1);
            MainCard.BorderBrush = Application.Current.FindResource("PrimaryBrush") as Brush;
        }
    }

    protected override void OnLostFocus(RoutedEventArgs e)
    {
        base.OnLostFocus(e);
        
        // Remove focus indicator
        MainCard.BorderThickness = new Thickness(0);
        MainCard.BorderBrush = null;
    }

    #endregion
}