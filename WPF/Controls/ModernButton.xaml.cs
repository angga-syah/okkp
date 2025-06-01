using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using MaterialDesignThemes.Wpf;

namespace InvoiceApp.WPF.Controls;

public enum ButtonVariant
{
    Filled,
    Outlined,
    Text,
    Icon
}

public enum IconPosition
{
    Left,
    Right,
    Top,
    Bottom,
    Only
}

public partial class ModernButton : UserControl
{
    public static readonly DependencyProperty TextProperty =
        DependencyProperty.Register(nameof(Text), typeof(string), typeof(ModernButton),
            new PropertyMetadata(string.Empty));

    public static readonly DependencyProperty CommandProperty =
        DependencyProperty.Register(nameof(Command), typeof(ICommand), typeof(ModernButton));

    public static readonly DependencyProperty CommandParameterProperty =
        DependencyProperty.Register(nameof(CommandParameter), typeof(object), typeof(ModernButton));

    public static readonly DependencyProperty IconProperty =
        DependencyProperty.Register(nameof(Icon), typeof(PackIconKind), typeof(ModernButton),
            new PropertyMetadata(PackIconKind.None));

    public static readonly DependencyProperty IconSizeProperty =
        DependencyProperty.Register(nameof(IconSize), typeof(double), typeof(ModernButton),
            new PropertyMetadata(16.0));

    public static readonly DependencyProperty IconPositionProperty =
        DependencyProperty.Register(nameof(IconPosition), typeof(IconPosition), typeof(ModernButton),
            new PropertyMetadata(IconPosition.Left, OnIconPositionChanged));

    public static readonly DependencyProperty VariantProperty =
        DependencyProperty.Register(nameof(Variant), typeof(ButtonVariant), typeof(ModernButton),
            new PropertyMetadata(ButtonVariant.Filled, OnVariantChanged));

    public static readonly DependencyProperty CornerRadiusProperty =
        DependencyProperty.Register(nameof(CornerRadius), typeof(double), typeof(ModernButton),
            new PropertyMetadata(8.0));

    public static readonly DependencyProperty ElevationProperty =
        DependencyProperty.Register(nameof(Elevation), typeof(Elevation), typeof(ModernButton),
            new PropertyMetadata(Elevation.Dp2));

    public static readonly DependencyProperty ShowIconProperty =
        DependencyProperty.Register(nameof(ShowIcon), typeof(bool), typeof(ModernButton),
            new PropertyMetadata(false, OnShowIconChanged));

    public static readonly DependencyProperty ShowTextProperty =
        DependencyProperty.Register(nameof(ShowText), typeof(bool), typeof(ModernButton),
            new PropertyMetadata(true, OnShowTextChanged));

    public static readonly DependencyProperty LoadingProperty =
        DependencyProperty.Register(nameof(Loading), typeof(bool), typeof(ModernButton),
            new PropertyMetadata(false, OnLoadingChanged));

    public static readonly DependencyProperty LoadingTextProperty =
        DependencyProperty.Register(nameof(LoadingText), typeof(string), typeof(ModernButton),
            new PropertyMetadata("Loading..."));

    // Properties
    public string Text
    {
        get => (string)GetValue(TextProperty);
        set => SetValue(TextProperty, value);
    }

    public ICommand? Command
    {
        get => (ICommand?)GetValue(CommandProperty);
        set => SetValue(CommandProperty, value);
    }

    public object? CommandParameter
    {
        get => GetValue(CommandParameterProperty);
        set => SetValue(CommandParameterProperty, value);
    }

    public PackIconKind Icon
    {
        get => (PackIconKind)GetValue(IconProperty);
        set => SetValue(IconProperty, value);
    }

    public double IconSize
    {
        get => (double)GetValue(IconSizeProperty);
        set => SetValue(IconSizeProperty, value);
    }

    public IconPosition IconPosition
    {
        get => (IconPosition)GetValue(IconPositionProperty);
        set => SetValue(IconPositionProperty, value);
    }

    public ButtonVariant Variant
    {
        get => (ButtonVariant)GetValue(VariantProperty);
        set => SetValue(VariantProperty, value);
    }

    public double CornerRadius
    {
        get => (double)GetValue(CornerRadiusProperty);
        set => SetValue(CornerRadiusProperty, value);
    }

    public Elevation Elevation
    {
        get => (Elevation)GetValue(ElevationProperty);
        set => SetValue(ElevationProperty, value);
    }

    public bool ShowIcon
    {
        get => (bool)GetValue(ShowIconProperty);
        set => SetValue(ShowIconProperty, value);
    }

    public bool ShowText
    {
        get => (bool)GetValue(ShowTextProperty);
        set => SetValue(ShowTextProperty, value);
    }

    public bool Loading
    {
        get => (bool)GetValue(LoadingProperty);
        set => SetValue(LoadingProperty, value);
    }

    public string LoadingText
    {
        get => (string)GetValue(LoadingTextProperty);
        set => SetValue(LoadingTextProperty, value);
    }

    // Events
    public static readonly RoutedEvent ClickEvent =
        EventManager.RegisterRoutedEvent(nameof(Click), RoutingStrategy.Bubble,
            typeof(RoutedEventHandler), typeof(ModernButton));

    public event RoutedEventHandler Click
    {
        add => AddHandler(ClickEvent, value);
        remove => RemoveHandler(ClickEvent, value);
    }

    public ModernButton()
    {
        InitializeComponent();
        UpdateButtonState();
    }

    private static void OnVariantChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is ModernButton button)
        {
            button.UpdateButtonStyle();
        }
    }

    private static void OnIconPositionChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is ModernButton button)
        {
            button.UpdateIconPosition();
        }
    }

    private static void OnShowIconChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is ModernButton button)
        {
            button.UpdateButtonState();
        }
    }

    private static void OnShowTextChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is ModernButton button)
        {
            button.UpdateButtonState();
        }
    }

    private static void OnLoadingChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is ModernButton button)
        {
            button.UpdateLoadingState();
        }
    }

    private void UpdateButtonStyle()
    {
        var styleName = Variant switch
        {
            ButtonVariant.Filled => "ModernButtonStyle",
            ButtonVariant.Outlined => "OutlinedButtonStyle",
            ButtonVariant.Text => "TextButtonStyle",
            ButtonVariant.Icon => "IconButtonStyle",
            _ => "ModernButtonStyle"
        };

        if (Resources[styleName] is Style style)
        {
            MainButton.Style = style;
        }
    }

    private void UpdateIconPosition()
    {
        // Update layout based on icon position
        // This would be implemented with the proper converters or direct manipulation
        UpdateButtonState();
    }

    private void UpdateButtonState()
    {
        // Determine what to show based on Icon and Text properties
        if (Icon != PackIconKind.None)
        {
            ShowIcon = true;
        }

        if (IconPosition == IconPosition.Only)
        {
            ShowText = false;
            ShowIcon = true;
        }
        else if (!string.IsNullOrEmpty(Text))
        {
            ShowText = true;
        }

        // If it's an icon-only button, ensure we have an icon
        if (Variant == ButtonVariant.Icon)
        {
            ShowIcon = true;
            ShowText = false;
        }
    }

    private void UpdateLoadingState()
    {
        if (Loading)
        {
            MainButton.IsEnabled = false;
            // You could add a loading spinner here
            if (!string.IsNullOrEmpty(LoadingText))
            {
                // Temporarily change the button text to loading text
                var originalText = Text;
                Text = LoadingText;
                
                // You might want to store the original text to restore it later
                MainButton.Tag = originalText;
            }
        }
        else
        {
            MainButton.IsEnabled = true;
            // Restore original text if it was changed
            if (MainButton.Tag is string originalText)
            {
                Text = originalText;
                MainButton.Tag = null;
            }
        }
    }

    private void MainButton_Click(object sender, RoutedEventArgs e)
    {
        if (!Loading)
        {
            RaiseEvent(new RoutedEventArgs(ClickEvent));
        }
    }

    // Public methods for easy configuration
    public static ModernButton CreatePrimaryButton(string text, ICommand? command = null)
    {
        return new ModernButton
        {
            Text = text,
            Command = command,
            Variant = ButtonVariant.Filled
        };
    }

    public static ModernButton CreateSecondaryButton(string text, ICommand? command = null)
    {
        return new ModernButton
        {
            Text = text,
            Command = command,
            Variant = ButtonVariant.Outlined
        };
    }

    public static ModernButton CreateTextButton(string text, ICommand? command = null)
    {
        return new ModernButton
        {
            Text = text,
            Command = command,
            Variant = ButtonVariant.Text
        };
    }

    public static ModernButton CreateIconButton(PackIconKind icon, ICommand? command = null, string? tooltip = null)
    {
        var button = new ModernButton
        {
            Icon = icon,
            Command = command,
            Variant = ButtonVariant.Icon,
            IconPosition = IconPosition.Only
        };

        if (!string.IsNullOrEmpty(tooltip))
        {
            button.ToolTip = tooltip;
        }

        return button;
    }

    public static ModernButton CreateIconTextButton(string text, PackIconKind icon, ICommand? command = null, IconPosition iconPosition = IconPosition.Left)
    {
        return new ModernButton
        {
            Text = text,
            Icon = icon,
            Command = command,
            IconPosition = iconPosition,
            Variant = ButtonVariant.Filled
        };
    }

    // Utility methods
    public void SetLoading(bool loading, string? loadingText = null)
    {
        Loading = loading;
        if (!string.IsNullOrEmpty(loadingText))
        {
            LoadingText = loadingText;
        }
    }

    public void SetEnabled(bool enabled)
    {
        IsEnabled = enabled;
        MainButton.IsEnabled = enabled;
    }

    public void SetStyle(ButtonVariant variant)
    {
        Variant = variant;
    }

    public void SetIcon(PackIconKind icon, double size = 16)
    {
        Icon = icon;
        IconSize = size;
        ShowIcon = icon != PackIconKind.None;
    }

    public void RemoveIcon()
    {
        Icon = PackIconKind.None;
        ShowIcon = false;
    }
}