using System.Collections.Specialized;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using Microsoft.Xaml.Behaviors;

namespace InvoiceApp.WPF.Behaviors;

public class ScrollIntoViewBehavior : Behavior<ItemsControl>
{
    public static readonly DependencyProperty ScrollIntoViewProperty =
        DependencyProperty.Register(nameof(ScrollIntoView), typeof(object), typeof(ScrollIntoViewBehavior),
            new PropertyMetadata(null, OnScrollIntoViewChanged));

    public static readonly DependencyProperty ScrollOnNewItemProperty =
        DependencyProperty.Register(nameof(ScrollOnNewItem), typeof(bool), typeof(ScrollIntoViewBehavior),
            new PropertyMetadata(false));

    public static readonly DependencyProperty ScrollToEndProperty =
        DependencyProperty.Register(nameof(ScrollToEnd), typeof(bool), typeof(ScrollIntoViewBehavior),
            new PropertyMetadata(false, OnScrollToEndChanged));

    public static readonly DependencyProperty AnimateScrollProperty =
        DependencyProperty.Register(nameof(AnimateScroll), typeof(bool), typeof(ScrollIntoViewBehavior),
            new PropertyMetadata(true));

    public static readonly DependencyProperty ScrollDelayProperty =
        DependencyProperty.Register(nameof(ScrollDelay), typeof(TimeSpan), typeof(ScrollIntoViewBehavior),
            new PropertyMetadata(TimeSpan.FromMilliseconds(100)));

    public object? ScrollIntoView
    {
        get => GetValue(ScrollIntoViewProperty);
        set => SetValue(ScrollIntoViewProperty, value);
    }

    public bool ScrollOnNewItem
    {
        get => (bool)GetValue(ScrollOnNewItemProperty);
        set => SetValue(ScrollOnNewItemProperty, value);
    }

    public bool ScrollToEnd
    {
        get => (bool)GetValue(ScrollToEndProperty);
        set => SetValue(ScrollToEndProperty, value);
    }

    public bool AnimateScroll
    {
        get => (bool)GetValue(AnimateScrollProperty);
        set => SetValue(AnimateScrollProperty, value);
    }

    public TimeSpan ScrollDelay
    {
        get => (TimeSpan)GetValue(ScrollDelayProperty);
        set => SetValue(ScrollDelayProperty, value);
    }

    private ScrollViewer? _scrollViewer;
    private INotifyCollectionChanged? _observableCollection;

    protected override void OnAttached()
    {
        base.OnAttached();

        if (AssociatedObject != null)
        {
            AssociatedObject.Loaded += OnLoaded;
            
            if (ScrollOnNewItem)
            {
                SetupCollectionChangedHandler();
            }
        }
    }

    protected override void OnDetaching()
    {
        base.OnDetaching();

        if (AssociatedObject != null)
        {
            AssociatedObject.Loaded -= OnLoaded;
        }

        CleanupCollectionChangedHandler();
    }

    private void OnLoaded(object sender, RoutedEventArgs e)
    {
        _scrollViewer = FindScrollViewer(AssociatedObject);
        
        if (ScrollToEnd)
        {
            PerformScrollToEnd();
        }
    }

    private void SetupCollectionChangedHandler()
    {
        CleanupCollectionChangedHandler();

        if (AssociatedObject?.ItemsSource is INotifyCollectionChanged collection)
        {
            _observableCollection = collection;
            _observableCollection.CollectionChanged += OnCollectionChanged;
        }
    }

    private void CleanupCollectionChangedHandler()
    {
        if (_observableCollection != null)
        {
            _observableCollection.CollectionChanged -= OnCollectionChanged;
            _observableCollection = null;
        }
    }

    private void OnCollectionChanged(object? sender, NotifyCollectionChangedEventArgs e)
    {
        if (e.Action == NotifyCollectionChangedAction.Add && e.NewItems?.Count > 0)
        {
            var newItem = e.NewItems[0];
            if (newItem != null)
            {
                // Delay scroll to allow UI to update
                Dispatcher.BeginInvoke(DispatcherPriority.Loaded, new Action(() =>
                {
                    PerformScrollIntoView(newItem);
                }));
            }
        }
    }

    private static void OnScrollIntoViewChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is ScrollIntoViewBehavior behavior && e.NewValue != null)
        {
            behavior.PerformScrollIntoView(e.NewValue);
        }
    }

    private static void OnScrollToEndChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is ScrollIntoViewBehavior behavior && (bool)e.NewValue)
        {
            behavior.PerformScrollToEnd();
        }
    }

    private void PerformScrollIntoView(object item)
    {
        if (AssociatedObject == null || item == null) return;

        var delay = ScrollDelay.TotalMilliseconds > 0 ? ScrollDelay : TimeSpan.Zero;

        var timer = new DispatcherTimer { Interval = delay };
        timer.Tick += (s, e) =>
        {
            timer.Stop();
            ExecuteScrollIntoView(item);
        };
        timer.Start();
    }

    private void ExecuteScrollIntoView(object item)
    {
        try
        {
            if (AssociatedObject is ListBox listBox)
            {
                listBox.ScrollIntoView(item);
                
                // Additional smooth scrolling for ListBox
                if (AnimateScroll && _scrollViewer != null)
                {
                    var container = listBox.ItemContainerGenerator.ContainerFromItem(item) as ListBoxItem;
                    if (container != null)
                    {
                        container.BringIntoView();
                    }
                }
            }
            else if (AssociatedObject is ListView listView)
            {
                listView.ScrollIntoView(item);
            }
            else if (AssociatedObject is DataGrid dataGrid)
            {
                dataGrid.ScrollIntoView(item);
            }
            else
            {
                // Generic ItemsControl - try to find the container and bring into view
                var container = AssociatedObject.ItemContainerGenerator.ContainerFromItem(item) as FrameworkElement;
                container?.BringIntoView();
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"ScrollIntoView error: {ex.Message}");
        }
    }

    private void PerformScrollToEnd()
    {
        if (_scrollViewer == null) return;

        var delay = ScrollDelay.TotalMilliseconds > 0 ? ScrollDelay : TimeSpan.Zero;

        var timer = new DispatcherTimer { Interval = delay };
        timer.Tick += (s, e) =>
        {
            timer.Stop();
            ExecuteScrollToEnd();
        };
        timer.Start();
    }

    private void ExecuteScrollToEnd()
    {
        if (_scrollViewer == null) return;

        try
        {
            if (AnimateScroll)
            {
                // Smooth animated scroll to end
                AnimateScrollToEnd();
            }
            else
            {
                // Immediate scroll to end
                _scrollViewer.ScrollToEnd();
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"ScrollToEnd error: {ex.Message}");
        }
    }

    private void AnimateScrollToEnd()
    {
        if (_scrollViewer == null) return;

        var targetOffset = _scrollViewer.ScrollableHeight;
        var currentOffset = _scrollViewer.VerticalOffset;

        if (Math.Abs(targetOffset - currentOffset) < 1) return;

        var animation = new System.Windows.Media.Animation.DoubleAnimation
        {
            From = currentOffset,
            To = targetOffset,
            Duration = TimeSpan.FromMilliseconds(300),
            EasingFunction = new System.Windows.Media.Animation.CubicEase { EasingMode = System.Windows.Media.Animation.EasingMode.EaseOut }
        };

        var storyboard = new System.Windows.Media.Animation.Storyboard();
        storyboard.Children.Add(animation);

        System.Windows.Media.Animation.Storyboard.SetTarget(animation, _scrollViewer);
        System.Windows.Media.Animation.Storyboard.SetTargetProperty(animation, 
            new PropertyPath(ScrollViewer.VerticalOffsetProperty));

        storyboard.Begin();
    }

    private static ScrollViewer? FindScrollViewer(DependencyObject obj)
    {
        if (obj == null) return null;

        if (obj is ScrollViewer scrollViewer)
            return scrollViewer;

        for (int i = 0; i < System.Windows.Media.VisualTreeHelper.GetChildrenCount(obj); i++)
        {
            var child = System.Windows.Media.VisualTreeHelper.GetChild(obj, i);
            var result = FindScrollViewer(child);
            if (result != null) return result;
        }

        return null;
    }
}

// Extension for easier usage
public static class ScrollIntoViewBehaviorExtensions
{
    public static readonly DependencyProperty EnableAutoScrollProperty =
        DependencyProperty.RegisterAttached(
            "EnableAutoScroll",
            typeof(bool),
            typeof(ScrollIntoViewBehaviorExtensions),
            new PropertyMetadata(false, OnEnableAutoScrollChanged));

    public static readonly DependencyProperty AutoScrollItemProperty =
        DependencyProperty.RegisterAttached(
            "AutoScrollItem",
            typeof(object),
            typeof(ScrollIntoViewBehaviorExtensions),
            new PropertyMetadata(null, OnAutoScrollItemChanged));

    public static bool GetEnableAutoScroll(DependencyObject obj)
    {
        return (bool)obj.GetValue(EnableAutoScrollProperty);
    }

    public static void SetEnableAutoScroll(DependencyObject obj, bool value)
    {
        obj.SetValue(EnableAutoScrollProperty, value);
    }

    public static object GetAutoScrollItem(DependencyObject obj)
    {
        return obj.GetValue(AutoScrollItemProperty);
    }

    public static void SetAutoScrollItem(DependencyObject obj, object value)
    {
        obj.SetValue(AutoScrollItemProperty, value);
    }

    private static void OnEnableAutoScrollChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is ItemsControl itemsControl)
        {
            var behaviors = Interaction.GetBehaviors(itemsControl);
            var scrollBehavior = behaviors.OfType<ScrollIntoViewBehavior>().FirstOrDefault();

            if ((bool)e.NewValue)
            {
                if (scrollBehavior == null)
                {
                    scrollBehavior = new ScrollIntoViewBehavior
                    {
                        ScrollOnNewItem = true,
                        AnimateScroll = true
                    };
                    behaviors.Add(scrollBehavior);
                }
            }
            else
            {
                if (scrollBehavior != null)
                {
                    behaviors.Remove(scrollBehavior);
                }
            }
        }
    }

    private static void OnAutoScrollItemChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is ItemsControl itemsControl && e.NewValue != null)
        {
            var behaviors = Interaction.GetBehaviors(itemsControl);
            var scrollBehavior = behaviors.OfType<ScrollIntoViewBehavior>().FirstOrDefault();

            if (scrollBehavior != null)
            {
                scrollBehavior.ScrollIntoView = e.NewValue;
            }
        }
    }
}