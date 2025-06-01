using System.Windows;
using System.Windows.Media.Animation;
using Microsoft.Xaml.Behaviors;

namespace InvoiceApp.WPF.Behaviors;

public class FadeInBehavior : Behavior<FrameworkElement>
{
    public static readonly DependencyProperty DurationProperty =
        DependencyProperty.Register(nameof(Duration), typeof(TimeSpan), typeof(FadeInBehavior),
            new PropertyMetadata(TimeSpan.FromMilliseconds(300)));

    public static readonly DependencyProperty DelayProperty =
        DependencyProperty.Register(nameof(Delay), typeof(TimeSpan), typeof(FadeInBehavior),
            new PropertyMetadata(TimeSpan.Zero));

    public static readonly DependencyProperty FromOpacityProperty =
        DependencyProperty.Register(nameof(FromOpacity), typeof(double), typeof(FadeInBehavior),
            new PropertyMetadata(0.0));

    public static readonly DependencyProperty ToOpacityProperty =
        DependencyProperty.Register(nameof(ToOpacity), typeof(double), typeof(FadeInBehavior),
            new PropertyMetadata(1.0));

    public static readonly DependencyProperty AutoStartProperty =
        DependencyProperty.Register(nameof(AutoStart), typeof(bool), typeof(FadeInBehavior),
            new PropertyMetadata(true));

    public static readonly DependencyProperty TriggerOnVisibilityChangeProperty =
        DependencyProperty.Register(nameof(TriggerOnVisibilityChange), typeof(bool), typeof(FadeInBehavior),
            new PropertyMetadata(false));

    public static readonly DependencyProperty EasingFunctionProperty =
        DependencyProperty.Register(nameof(EasingFunction), typeof(IEasingFunction), typeof(FadeInBehavior),
            new PropertyMetadata(new CubicEase { EasingMode = EasingMode.EaseOut }));

    public TimeSpan Duration
    {
        get => (TimeSpan)GetValue(DurationProperty);
        set => SetValue(DurationProperty, value);
    }

    public TimeSpan Delay
    {
        get => (TimeSpan)GetValue(DelayProperty);
        set => SetValue(DelayProperty, value);
    }

    public double FromOpacity
    {
        get => (double)GetValue(FromOpacityProperty);
        set => SetValue(FromOpacityProperty, value);
    }

    public double ToOpacity
    {
        get => (double)GetValue(ToOpacityProperty);
        set => SetValue(ToOpacityProperty, value);
    }

    public bool AutoStart
    {
        get => (bool)GetValue(AutoStartProperty);
        set => SetValue(AutoStartProperty, value);
    }

    public bool TriggerOnVisibilityChange
    {
        get => (bool)GetValue(TriggerOnVisibilityChangeProperty);
        set => SetValue(TriggerOnVisibilityChangeProperty, value);
    }

    public IEasingFunction EasingFunction
    {
        get => (IEasingFunction)GetValue(EasingFunctionProperty);
        set => SetValue(EasingFunctionProperty, value);
    }

    private Storyboard? _storyboard;
    private bool _hasTriggered;

    protected override void OnAttached()
    {
        base.OnAttached();

        if (AssociatedObject != null)
        {
            // Set initial opacity
            AssociatedObject.Opacity = FromOpacity;

            if (AutoStart)
            {
                if (AssociatedObject.IsLoaded)
                {
                    StartAnimation();
                }
                else
                {
                    AssociatedObject.Loaded += OnLoaded;
                }
            }

            if (TriggerOnVisibilityChange)
            {
                AssociatedObject.IsVisibleChanged += OnVisibilityChanged;
            }
        }
    }

    protected override void OnDetaching()
    {
        base.OnDetaching();

        if (AssociatedObject != null)
        {
            AssociatedObject.Loaded -= OnLoaded;
            AssociatedObject.IsVisibleChanged -= OnVisibilityChanged;
        }

        StopAnimation();
    }

    private void OnLoaded(object sender, RoutedEventArgs e)
    {
        AssociatedObject.Loaded -= OnLoaded;
        StartAnimation();
    }

    private void OnVisibilityChanged(object sender, DependencyPropertyChangedEventArgs e)
    {
        if (AssociatedObject.Visibility == Visibility.Visible && !_hasTriggered)
        {
            StartAnimation();
        }
        else if (AssociatedObject.Visibility != Visibility.Visible)
        {
            _hasTriggered = false;
            AssociatedObject.Opacity = FromOpacity;
            StopAnimation();
        }
    }

    public void StartAnimation()
    {
        if (AssociatedObject == null || _hasTriggered) return;

        _hasTriggered = true;

        // Create the animation
        var animation = new DoubleAnimation
        {
            From = FromOpacity,
            To = ToOpacity,
            Duration = new Duration(Duration),
            BeginTime = Delay,
            EasingFunction = EasingFunction,
            FillBehavior = FillBehavior.HoldEnd
        };

        // Create storyboard
        _storyboard = new Storyboard();
        _storyboard.Children.Add(animation);

        // Set target
        Storyboard.SetTarget(animation, AssociatedObject);
        Storyboard.SetTargetProperty(animation, new PropertyPath(UIElement.OpacityProperty));

        // Start animation
        try
        {
            _storyboard.Begin();
        }
        catch (Exception ex)
        {
            // Log error if needed
            System.Diagnostics.Debug.WriteLine($"FadeInBehavior animation error: {ex.Message}");
        }
    }

    public void StopAnimation()
    {
        if (_storyboard != null)
        {
            try
            {
                _storyboard.Stop();
                _storyboard = null;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"FadeInBehavior stop error: {ex.Message}");
            }
        }
    }

    public void ResetAnimation()
    {
        _hasTriggered = false;
        if (AssociatedObject != null)
        {
            AssociatedObject.Opacity = FromOpacity;
        }
        StopAnimation();
    }
}

// Extension for easier usage
public static class FadeInBehaviorExtensions
{
    public static readonly DependencyProperty EnableFadeInProperty =
        DependencyProperty.RegisterAttached(
            "EnableFadeIn",
            typeof(bool),
            typeof(FadeInBehaviorExtensions),
            new PropertyMetadata(false, OnEnableFadeInChanged));

    public static readonly DependencyProperty FadeInDurationProperty =
        DependencyProperty.RegisterAttached(
            "FadeInDuration",
            typeof(TimeSpan),
            typeof(FadeInBehaviorExtensions),
            new PropertyMetadata(TimeSpan.FromMilliseconds(300)));

    public static readonly DependencyProperty FadeInDelayProperty =
        DependencyProperty.RegisterAttached(
            "FadeInDelay",
            typeof(TimeSpan),
            typeof(FadeInBehaviorExtensions),
            new PropertyMetadata(TimeSpan.Zero));

    public static bool GetEnableFadeIn(DependencyObject obj)
    {
        return (bool)obj.GetValue(EnableFadeInProperty);
    }

    public static void SetEnableFadeIn(DependencyObject obj, bool value)
    {
        obj.SetValue(EnableFadeInProperty, value);
    }

    public static TimeSpan GetFadeInDuration(DependencyObject obj)
    {
        return (TimeSpan)obj.GetValue(FadeInDurationProperty);
    }

    public static void SetFadeInDuration(DependencyObject obj, TimeSpan value)
    {
        obj.SetValue(FadeInDurationProperty, value);
    }

    public static TimeSpan GetFadeInDelay(DependencyObject obj)
    {
        return (TimeSpan)obj.GetValue(FadeInDelayProperty);
    }

    public static void SetFadeInDelay(DependencyObject obj, TimeSpan value)
    {
        obj.SetValue(FadeInDelayProperty, value);
    }

    private static void OnEnableFadeInChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is FrameworkElement element)
        {
            var behaviors = Interaction.GetBehaviors(element);
            var fadeInBehavior = behaviors.OfType<FadeInBehavior>().FirstOrDefault();

            if ((bool)e.NewValue)
            {
                if (fadeInBehavior == null)
                {
                    fadeInBehavior = new FadeInBehavior
                    {
                        Duration = GetFadeInDuration(element),
                        Delay = GetFadeInDelay(element)
                    };
                    behaviors.Add(fadeInBehavior);
                }
            }
            else
            {
                if (fadeInBehavior != null)
                {
                    behaviors.Remove(fadeInBehavior);
                }
            }
        }
    }
}