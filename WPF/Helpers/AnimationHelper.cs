using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Animation;

namespace InvoiceApp.WPF.Helpers;

public static class AnimationHelper
{
    private static bool _animationsEnabled = true;
    
    public static bool AnimationsEnabled
    {
        get => _animationsEnabled;
        set => _animationsEnabled = value;
    }

    public static void SetAnimationsEnabled(bool enabled)
    {
        _animationsEnabled = enabled;
    }

    #region Fade Animations

    public static void FadeIn(FrameworkElement element, double duration = 300, Action? onCompleted = null)
    {
        if (!_animationsEnabled)
        {
            element.Opacity = 1;
            onCompleted?.Invoke();
            return;
        }

        var animation = new DoubleAnimation
        {
            From = element.Opacity,
            To = 1,
            Duration = TimeSpan.FromMilliseconds(duration),
            EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
        };

        if (onCompleted != null)
        {
            animation.Completed += (s, e) => onCompleted();
        }

        element.BeginAnimation(UIElement.OpacityProperty, animation);
    }

    public static void FadeOut(FrameworkElement element, double duration = 200, Action? onCompleted = null)
    {
        if (!_animationsEnabled)
        {
            element.Opacity = 0;
            onCompleted?.Invoke();
            return;
        }

        var animation = new DoubleAnimation
        {
            From = element.Opacity,
            To = 0,
            Duration = TimeSpan.FromMilliseconds(duration),
            EasingFunction = new CubicEase { EasingMode = EasingMode.EaseIn }
        };

        if (onCompleted != null)
        {
            animation.Completed += (s, e) => onCompleted();
        }

        element.BeginAnimation(UIElement.OpacityProperty, animation);
    }

    public static void FadeInOut(FrameworkElement element, double fadeInDuration = 300, double visibleDuration = 2000, double fadeOutDuration = 300, Action? onCompleted = null)
    {
        if (!_animationsEnabled)
        {
            onCompleted?.Invoke();
            return;
        }

        var storyboard = new Storyboard();

        // Fade in
        var fadeInAnimation = new DoubleAnimation
        {
            From = 0,
            To = 1,
            Duration = TimeSpan.FromMilliseconds(fadeInDuration),
            BeginTime = TimeSpan.Zero,
            EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
        };

        // Fade out
        var fadeOutAnimation = new DoubleAnimation
        {
            From = 1,
            To = 0,
            Duration = TimeSpan.FromMilliseconds(fadeOutDuration),
            BeginTime = TimeSpan.FromMilliseconds(fadeInDuration + visibleDuration),
            EasingFunction = new CubicEase { EasingMode = EasingMode.EaseIn }
        };

        Storyboard.SetTarget(fadeInAnimation, element);
        Storyboard.SetTargetProperty(fadeInAnimation, new PropertyPath(UIElement.OpacityProperty));
        
        Storyboard.SetTarget(fadeOutAnimation, element);
        Storyboard.SetTargetProperty(fadeOutAnimation, new PropertyPath(UIElement.OpacityProperty));

        storyboard.Children.Add(fadeInAnimation);
        storyboard.Children.Add(fadeOutAnimation);

        if (onCompleted != null)
        {
            storyboard.Completed += (s, e) => onCompleted();
        }

        storyboard.Begin();
    }

    #endregion

    #region Scale Animations

    public static void ScaleIn(FrameworkElement element, double duration = 300, Action? onCompleted = null)
    {
        if (!_animationsEnabled)
        {
            SetScaleTransform(element, 1, 1);
            onCompleted?.Invoke();
            return;
        }

        EnsureScaleTransform(element);

        var storyboard = new Storyboard();

        var scaleXAnimation = new DoubleAnimation
        {
            From = 0,
            To = 1,
            Duration = TimeSpan.FromMilliseconds(duration),
            EasingFunction = new BackEase { EasingMode = EasingMode.EaseOut, Amplitude = 0.3 }
        };

        var scaleYAnimation = new DoubleAnimation
        {
            From = 0,
            To = 1,
            Duration = TimeSpan.FromMilliseconds(duration),
            EasingFunction = new BackEase { EasingMode = EasingMode.EaseOut, Amplitude = 0.3 }
        };

        var opacityAnimation = new DoubleAnimation
        {
            From = 0,
            To = 1,
            Duration = TimeSpan.FromMilliseconds(duration * 0.7)
        };

        Storyboard.SetTarget(scaleXAnimation, element);
        Storyboard.SetTargetProperty(scaleXAnimation, new PropertyPath("RenderTransform.ScaleX"));
        
        Storyboard.SetTarget(scaleYAnimation, element);
        Storyboard.SetTargetProperty(scaleYAnimation, new PropertyPath("RenderTransform.ScaleY"));
        
        Storyboard.SetTarget(opacityAnimation, element);
        Storyboard.SetTargetProperty(opacityAnimation, new PropertyPath(UIElement.OpacityProperty));

        storyboard.Children.Add(scaleXAnimation);
        storyboard.Children.Add(scaleYAnimation);
        storyboard.Children.Add(opacityAnimation);

        if (onCompleted != null)
        {
            storyboard.Completed += (s, e) => onCompleted();
        }

        storyboard.Begin();
    }

    public static void ScaleOut(FrameworkElement element, double duration = 200, Action? onCompleted = null)
    {
        if (!_animationsEnabled)
        {
            SetScaleTransform(element, 0, 0);
            onCompleted?.Invoke();
            return;
        }

        EnsureScaleTransform(element);

        var storyboard = new Storyboard();

        var scaleXAnimation = new DoubleAnimation
        {
            To = 0,
            Duration = TimeSpan.FromMilliseconds(duration),
            EasingFunction = new BackEase { EasingMode = EasingMode.EaseIn, Amplitude = 0.3 }
        };

        var scaleYAnimation = new DoubleAnimation
        {
            To = 0,
            Duration = TimeSpan.FromMilliseconds(duration),
            EasingFunction = new BackEase { EasingMode = EasingMode.EaseIn, Amplitude = 0.3 }
        };

        var opacityAnimation = new DoubleAnimation
        {
            To = 0,
            Duration = TimeSpan.FromMilliseconds(duration)
        };

        Storyboard.SetTarget(scaleXAnimation, element);
        Storyboard.SetTargetProperty(scaleXAnimation, new PropertyPath("RenderTransform.ScaleX"));
        
        Storyboard.SetTarget(scaleYAnimation, element);
        Storyboard.SetTargetProperty(scaleYAnimation, new PropertyPath("RenderTransform.ScaleY"));
        
        Storyboard.SetTarget(opacityAnimation, element);
        Storyboard.SetTargetProperty(opacityAnimation, new PropertyPath(UIElement.OpacityProperty));

        storyboard.Children.Add(scaleXAnimation);
        storyboard.Children.Add(scaleYAnimation);
        storyboard.Children.Add(opacityAnimation);

        if (onCompleted != null)
        {
            storyboard.Completed += (s, e) => onCompleted();
        }

        storyboard.Begin();
    }

    public static void ScaleHover(FrameworkElement element, double scale = 1.05, double duration = 150)
    {
        if (!_animationsEnabled)
        {
            SetScaleTransform(element, scale, scale);
            return;
        }

        EnsureScaleTransform(element);

        var storyboard = new Storyboard();

        var scaleXAnimation = new DoubleAnimation
        {
            To = scale,
            Duration = TimeSpan.FromMilliseconds(duration),
            EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseOut }
        };

        var scaleYAnimation = new DoubleAnimation
        {
            To = scale,
            Duration = TimeSpan.FromMilliseconds(duration),
            EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseOut }
        };

        Storyboard.SetTarget(scaleXAnimation, element);
        Storyboard.SetTargetProperty(scaleXAnimation, new PropertyPath("RenderTransform.ScaleX"));
        
        Storyboard.SetTarget(scaleYAnimation, element);
        Storyboard.SetTargetProperty(scaleYAnimation, new PropertyPath("RenderTransform.ScaleY"));

        storyboard.Children.Add(scaleXAnimation);
        storyboard.Children.Add(scaleYAnimation);

        storyboard.Begin();
    }

    public static void ScaleRevert(FrameworkElement element, double duration = 150)
    {
        if (!_animationsEnabled)
        {
            SetScaleTransform(element, 1, 1);
            return;
        }

        EnsureScaleTransform(element);

        var storyboard = new Storyboard();

        var scaleXAnimation = new DoubleAnimation
        {
            To = 1,
            Duration = TimeSpan.FromMilliseconds(duration),
            EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseOut }
        };

        var scaleYAnimation = new DoubleAnimation
        {
            To = 1,
            Duration = TimeSpan.FromMilliseconds(duration),
            EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseOut }
        };

        Storyboard.SetTarget(scaleXAnimation, element);
        Storyboard.SetTargetProperty(scaleXAnimation, new PropertyPath("RenderTransform.ScaleX"));
        
        Storyboard.SetTarget(scaleYAnimation, element);
        Storyboard.SetTargetProperty(scaleYAnimation, new PropertyPath("RenderTransform.ScaleY"));

        storyboard.Children.Add(scaleXAnimation);
        storyboard.Children.Add(scaleYAnimation);

        storyboard.Begin();
    }

    #endregion

    #region Slide Animations

    public static void SlideInFromRight(FrameworkElement element, double distance = 100, double duration = 400, Action? onCompleted = null)
    {
        if (!_animationsEnabled)
        {
            SetTranslateTransform(element, 0, 0);
            element.Opacity = 1;
            onCompleted?.Invoke();
            return;
        }

        EnsureTranslateTransform(element);

        var storyboard = new Storyboard();

        var slideAnimation = new DoubleAnimation
        {
            From = distance,
            To = 0,
            Duration = TimeSpan.FromMilliseconds(duration),
            EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
        };

        var fadeAnimation = new DoubleAnimation
        {
            From = 0,
            To = 1,
            Duration = TimeSpan.FromMilliseconds(duration * 0.8)
        };

        Storyboard.SetTarget(slideAnimation, element);
        Storyboard.SetTargetProperty(slideAnimation, new PropertyPath("RenderTransform.X"));
        
        Storyboard.SetTarget(fadeAnimation, element);
        Storyboard.SetTargetProperty(fadeAnimation, new PropertyPath(UIElement.OpacityProperty));

        storyboard.Children.Add(slideAnimation);
        storyboard.Children.Add(fadeAnimation);

        if (onCompleted != null)
        {
            storyboard.Completed += (s, e) => onCompleted();
        }

        storyboard.Begin();
    }

    public static void SlideInFromLeft(FrameworkElement element, double distance = 100, double duration = 400, Action? onCompleted = null)
    {
        if (!_animationsEnabled)
        {
            SetTranslateTransform(element, 0, 0);
            element.Opacity = 1;
            onCompleted?.Invoke();
            return;
        }

        EnsureTranslateTransform(element);

        var storyboard = new Storyboard();

        var slideAnimation = new DoubleAnimation
        {
            From = -distance,
            To = 0,
            Duration = TimeSpan.FromMilliseconds(duration),
            EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
        };

        var fadeAnimation = new DoubleAnimation
        {
            From = 0,
            To = 1,
            Duration = TimeSpan.FromMilliseconds(duration * 0.8)
        };

        Storyboard.SetTarget(slideAnimation, element);
        Storyboard.SetTargetProperty(slideAnimation, new PropertyPath("RenderTransform.X"));
        
        Storyboard.SetTarget(fadeAnimation, element);
        Storyboard.SetTargetProperty(fadeAnimation, new PropertyPath(UIElement.OpacityProperty));

        storyboard.Children.Add(slideAnimation);
        storyboard.Children.Add(fadeAnimation);

        if (onCompleted != null)
        {
            storyboard.Completed += (s, e) => onCompleted();
        }

        storyboard.Begin();
    }

    public static void SlideInFromBottom(FrameworkElement element, double distance = 50, double duration = 400, Action? onCompleted = null)
    {
        if (!_animationsEnabled)
        {
            SetTranslateTransform(element, 0, 0);
            element.Opacity = 1;
            onCompleted?.Invoke();
            return;
        }

        EnsureTranslateTransform(element);

        var storyboard = new Storyboard();

        var slideAnimation = new DoubleAnimation
        {
            From = distance,
            To = 0,
            Duration = TimeSpan.FromMilliseconds(duration),
            EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
        };

        var fadeAnimation = new DoubleAnimation
        {
            From = 0,
            To = 1,
            Duration = TimeSpan.FromMilliseconds(duration * 0.8)
        };

        Storyboard.SetTarget(slideAnimation, element);
        Storyboard.SetTargetProperty(slideAnimation, new PropertyPath("RenderTransform.Y"));
        
        Storyboard.SetTarget(fadeAnimation, element);
        Storyboard.SetTargetProperty(fadeAnimation, new PropertyPath(UIElement.OpacityProperty));

        storyboard.Children.Add(slideAnimation);
        storyboard.Children.Add(fadeAnimation);

        if (onCompleted != null)
        {
            storyboard.Completed += (s, e) => onCompleted();
        }

        storyboard.Begin();
    }

    #endregion

    #region Utility Methods

    private static void EnsureScaleTransform(FrameworkElement element)
    {
        if (element.RenderTransform is not ScaleTransform)
        {
            element.RenderTransform = new ScaleTransform(1, 1);
            element.RenderTransformOrigin = new Point(0.5, 0.5);
        }
    }

    private static void EnsureTranslateTransform(FrameworkElement element)
    {
        if (element.RenderTransform is not TranslateTransform)
        {
            element.RenderTransform = new TranslateTransform(0, 0);
        }
    }

    private static void SetScaleTransform(FrameworkElement element, double scaleX, double scaleY)
    {
        element.RenderTransform = new ScaleTransform(scaleX, scaleY);
        element.RenderTransformOrigin = new Point(0.5, 0.5);
    }

    private static void SetTranslateTransform(FrameworkElement element, double x, double y)
    {
        element.RenderTransform = new TranslateTransform(x, y);
    }

    #endregion

    #region Staggered Animations

    public static void StaggeredFadeIn(IEnumerable<FrameworkElement> elements, double staggerDelay = 100, double duration = 300)
    {
        if (!_animationsEnabled)
        {
            foreach (var element in elements)
            {
                element.Opacity = 1;
            }
            return;
        }

        var delay = 0.0;
        foreach (var element in elements)
        {
            var currentDelay = delay;
            Task.Delay(TimeSpan.FromMilliseconds(currentDelay)).ContinueWith(_ =>
            {
                element.Dispatcher.Invoke(() => FadeIn(element, duration));
            });
            delay += staggerDelay;
        }
    }

    public static void StaggeredSlideIn(IEnumerable<FrameworkElement> elements, double staggerDelay = 100, double duration = 400, double distance = 30)
    {
        if (!_animationsEnabled)
        {
            foreach (var element in elements)
            {
                SetTranslateTransform(element, 0, 0);
                element.Opacity = 1;
            }
            return;
        }

        var delay = 0.0;
        foreach (var element in elements)
        {
            var currentDelay = delay;
            Task.Delay(TimeSpan.FromMilliseconds(currentDelay)).ContinueWith(_ =>
            {
                element.Dispatcher.Invoke(() => SlideInFromBottom(element, distance, duration));
            });
            delay += staggerDelay;
        }
    }

    #endregion

    #region Color Animations

    public static void AnimateBackgroundColor(FrameworkElement element, Color fromColor, Color toColor, double duration = 300, Action? onCompleted = null)
    {
        if (!_animationsEnabled)
        {
            if (element.GetType().GetProperty("Background") is var prop && prop != null)
            {
                prop.SetValue(element, new SolidColorBrush(toColor));
            }
            onCompleted?.Invoke();
            return;
        }

        var animation = new ColorAnimation
        {
            From = fromColor,
            To = toColor,
            Duration = TimeSpan.FromMilliseconds(duration),
            EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseInOut }
        };

        if (onCompleted != null)
        {
            animation.Completed += (s, e) => onCompleted();
        }

        var brush = new SolidColorBrush(fromColor);
        
        // Set the background property based on element type
        if (element is System.Windows.Controls.Control control)
        {
            control.Background = brush;
            brush.BeginAnimation(SolidColorBrush.ColorProperty, animation);
        }
        else if (element is System.Windows.Controls.Panel panel)
        {
            panel.Background = brush;
            brush.BeginAnimation(SolidColorBrush.ColorProperty, animation);
        }
    }

    #endregion

    #region Attention Animations

    public static void Pulse(FrameworkElement element, double scale = 1.1, double duration = 600, int repeatCount = 2)
    {
        if (!_animationsEnabled) return;

        EnsureScaleTransform(element);

        var storyboard = new Storyboard();

        var scaleXAnimation = new DoubleAnimation
        {
            From = 1,
            To = scale,
            Duration = TimeSpan.FromMilliseconds(duration / 2),
            AutoReverse = true,
            RepeatBehavior = new RepeatBehavior(repeatCount),
            EasingFunction = new SineEase { EasingMode = EasingMode.EaseInOut }
        };

        var scaleYAnimation = new DoubleAnimation
        {
            From = 1,
            To = scale,
            Duration = TimeSpan.FromMilliseconds(duration / 2),
            AutoReverse = true,
            RepeatBehavior = new RepeatBehavior(repeatCount),
            EasingFunction = new SineEase { EasingMode = EasingMode.EaseInOut }
        };

        Storyboard.SetTarget(scaleXAnimation, element);
        Storyboard.SetTargetProperty(scaleXAnimation, new PropertyPath("RenderTransform.ScaleX"));
        
        Storyboard.SetTarget(scaleYAnimation, element);
        Storyboard.SetTargetProperty(scaleYAnimation, new PropertyPath("RenderTransform.ScaleY"));

        storyboard.Children.Add(scaleXAnimation);
        storyboard.Children.Add(scaleYAnimation);

        storyboard.Begin();
    }

    public static void Shake(FrameworkElement element, double intensity = 10, double duration = 500)
    {
        if (!_animationsEnabled) return;

        EnsureTranslateTransform(element);

        var storyboard = new Storyboard();

        var keyFrames = new DoubleAnimationUsingKeyFrames
        {
            Duration = TimeSpan.FromMilliseconds(duration)
        };

        var frameCount = 8;
        var frameDuration = duration / frameCount;

        for (int i = 0; i < frameCount; i++)
        {
            var offset = i % 2 == 0 ? intensity : -intensity;
            if (i == frameCount - 1) offset = 0; // End at original position

            keyFrames.KeyFrames.Add(new LinearDoubleKeyFrame
            {
                KeyTime = TimeSpan.FromMilliseconds(i * frameDuration),
                Value = offset
            });
        }

        Storyboard.SetTarget(keyFrames, element);
        Storyboard.SetTargetProperty(keyFrames, new PropertyPath("RenderTransform.X"));

        storyboard.Children.Add(keyFrames);
        storyboard.Begin();
    }

    #endregion
}