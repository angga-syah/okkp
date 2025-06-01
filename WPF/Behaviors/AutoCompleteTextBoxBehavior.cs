using System.Collections;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Data;
using System.Windows.Input;
using Microsoft.Xaml.Behaviors;

namespace InvoiceApp.WPF.Behaviors;

public class AutoCompleteTextBoxBehavior : Behavior<TextBox>
{
    private ListBox? _suggestionListBox;
    private Popup? _popup;
    private bool _isUpdating;
    private string _lastText = string.Empty;

    public static readonly DependencyProperty ItemsSourceProperty =
        DependencyProperty.Register(nameof(ItemsSource), typeof(IEnumerable), typeof(AutoCompleteTextBoxBehavior));

    public static readonly DependencyProperty DisplayMemberPathProperty =
        DependencyProperty.Register(nameof(DisplayMemberPath), typeof(string), typeof(AutoCompleteTextBoxBehavior));

    public static readonly DependencyProperty SelectedValuePathProperty =
        DependencyProperty.Register(nameof(SelectedValuePath), typeof(string), typeof(AutoCompleteTextBoxBehavior));

    public static readonly DependencyProperty SelectedItemProperty =
        DependencyProperty.Register(nameof(SelectedItem), typeof(object), typeof(AutoCompleteTextBoxBehavior),
            new FrameworkPropertyMetadata(null, FrameworkPropertyMetadataOptions.BindsTwoWayByDefault));

    public static readonly DependencyProperty MinimumPrefixLengthProperty =
        DependencyProperty.Register(nameof(MinimumPrefixLength), typeof(int), typeof(AutoCompleteTextBoxBehavior),
            new PropertyMetadata(1));

    public static readonly DependencyProperty MaxSuggestionsProperty =
        DependencyProperty.Register(nameof(MaxSuggestions), typeof(int), typeof(AutoCompleteTextBoxBehavior),
            new PropertyMetadata(10));

    public static readonly DependencyProperty DelayProperty =
        DependencyProperty.Register(nameof(Delay), typeof(int), typeof(AutoCompleteTextBoxBehavior),
            new PropertyMetadata(300));

    public static readonly DependencyProperty IsOpenProperty =
        DependencyProperty.Register(nameof(IsOpen), typeof(bool), typeof(AutoCompleteTextBoxBehavior),
            new PropertyMetadata(false));

    public IEnumerable? ItemsSource
    {
        get => (IEnumerable?)GetValue(ItemsSourceProperty);
        set => SetValue(ItemsSourceProperty, value);
    }

    public string? DisplayMemberPath
    {
        get => (string?)GetValue(DisplayMemberPathProperty);
        set => SetValue(DisplayMemberPathProperty, value);
    }

    public string? SelectedValuePath
    {
        get => (string?)GetValue(SelectedValuePathProperty);
        set => SetValue(SelectedValuePathProperty, value);
    }

    public object? SelectedItem
    {
        get => GetValue(SelectedItemProperty);
        set => SetValue(SelectedItemProperty, value);
    }

    public int MinimumPrefixLength
    {
        get => (int)GetValue(MinimumPrefixLengthProperty);
        set => SetValue(MinimumPrefixLengthProperty, value);
    }

    public int MaxSuggestions
    {
        get => (int)GetValue(MaxSuggestionsProperty);
        set => SetValue(MaxSuggestionsProperty, value);
    }

    public int Delay
    {
        get => (int)GetValue(DelayProperty);
        set => SetValue(DelayProperty, value);
    }

    public bool IsOpen
    {
        get => (bool)GetValue(IsOpenProperty);
        private set => SetValue(IsOpenProperty, value);
    }

    protected override void OnAttached()
    {
        base.OnAttached();
        AssociatedObject.TextChanged += OnTextChanged;
        AssociatedObject.PreviewKeyDown += OnPreviewKeyDown;
        AssociatedObject.LostFocus += OnLostFocus;
        AssociatedObject.Loaded += OnTextBoxLoaded;
    }

    protected override void OnDetaching()
    {
        base.OnDetaching();
        if (AssociatedObject != null)
        {
            AssociatedObject.TextChanged -= OnTextChanged;
            AssociatedObject.PreviewKeyDown -= OnPreviewKeyDown;
            AssociatedObject.LostFocus -= OnLostFocus;
            AssociatedObject.Loaded -= OnTextBoxLoaded;
        }
        CleanupPopup();
    }

    private void OnTextBoxLoaded(object sender, RoutedEventArgs e)
    {
        CreatePopup();
    }

    private void CreatePopup()
    {
        if (_popup != null) return;

        _popup = new Popup
        {
            PlacementTarget = AssociatedObject,
            Placement = PlacementMode.Bottom,
            StaysOpen = false,
            AllowsTransparency = true,
            PopupAnimation = PopupAnimation.Slide
        };

        _suggestionListBox = new ListBox
        {
            MaxHeight = 150,
            MinWidth = 200,
            BorderThickness = new Thickness(1),
            Background = System.Windows.Media.Brushes.White,
            BorderBrush = System.Windows.Media.Brushes.Gray
        };

        // Apply modern styling
        _suggestionListBox.SetResourceReference(FrameworkElement.StyleProperty, "MaterialDesignListBox");

        if (!string.IsNullOrEmpty(DisplayMemberPath))
        {
            _suggestionListBox.DisplayMemberPath = DisplayMemberPath;
        }

        if (!string.IsNullOrEmpty(SelectedValuePath))
        {
            _suggestionListBox.SelectedValuePath = SelectedValuePath;
        }

        _suggestionListBox.SelectionChanged += OnSuggestionSelected;
        _suggestionListBox.MouseDoubleClick += OnSuggestionDoubleClick;

        _popup.Child = _suggestionListBox;
    }

    private async void OnTextChanged(object sender, TextChangedEventArgs e)
    {
        if (_isUpdating) return;

        var textBox = (TextBox)sender;
        var text = textBox.Text;

        if (text == _lastText) return;
        _lastText = text;

        if (string.IsNullOrEmpty(text) || text.Length < MinimumPrefixLength)
        {
            ClosePopup();
            return;
        }

        // Delay before showing suggestions
        await Task.Delay(Delay);

        // Check if text is still the same after delay
        if (textBox.Text != text) return;

        ShowSuggestions(text);
    }

    private void ShowSuggestions(string filterText)
    {
        if (ItemsSource == null || _suggestionListBox == null) return;

        var suggestions = FilterSuggestions(filterText).Take(MaxSuggestions).ToList();

        if (!suggestions.Any())
        {
            ClosePopup();
            return;
        }

        _suggestionListBox.ItemsSource = suggestions;
        
        if (_popup != null)
        {
            _popup.Width = Math.Max(AssociatedObject.ActualWidth, 200);
            _popup.IsOpen = true;
            IsOpen = true;
        }
    }

    private IEnumerable<object> FilterSuggestions(string filterText)
    {
        if (ItemsSource == null) yield break;

        var filter = filterText.ToLowerInvariant();

        foreach (var item in ItemsSource)
        {
            if (item == null) continue;

            var displayText = GetDisplayText(item).ToLowerInvariant();
            
            // Prioritize items that start with the filter text
            if (displayText.StartsWith(filter))
            {
                yield return item;
            }
            // Then items that contain the filter text
            else if (displayText.Contains(filter))
            {
                yield return item;
            }
        }
    }

    private string GetDisplayText(object item)
    {
        if (item == null) return string.Empty;

        if (!string.IsNullOrEmpty(DisplayMemberPath))
        {
            var property = item.GetType().GetProperty(DisplayMemberPath);
            return property?.GetValue(item)?.ToString() ?? string.Empty;
        }

        return item.ToString() ?? string.Empty;
    }

    private void OnPreviewKeyDown(object sender, KeyEventArgs e)
    {
        if (_popup?.IsOpen != true || _suggestionListBox == null) return;

        switch (e.Key)
        {
            case Key.Down:
                if (_suggestionListBox.SelectedIndex < _suggestionListBox.Items.Count - 1)
                {
                    _suggestionListBox.SelectedIndex++;
                }
                e.Handled = true;
                break;

            case Key.Up:
                if (_suggestionListBox.SelectedIndex > 0)
                {
                    _suggestionListBox.SelectedIndex--;
                }
                else if (_suggestionListBox.SelectedIndex == 0)
                {
                    _suggestionListBox.SelectedIndex = -1;
                    AssociatedObject.Focus();
                }
                e.Handled = true;
                break;

            case Key.Enter:
                if (_suggestionListBox.SelectedItem != null)
                {
                    SelectItem(_suggestionListBox.SelectedItem);
                }
                ClosePopup();
                e.Handled = true;
                break;

            case Key.Escape:
                ClosePopup();
                e.Handled = true;
                break;

            case Key.Tab:
                if (_suggestionListBox.SelectedItem != null)
                {
                    SelectItem(_suggestionListBox.SelectedItem);
                }
                ClosePopup();
                break;
        }
    }

    private void OnSuggestionSelected(object sender, SelectionChangedEventArgs e)
    {
        // Don't auto-select on selection change, wait for double-click or Enter
    }

    private void OnSuggestionDoubleClick(object sender, MouseButtonEventArgs e)
    {
        if (_suggestionListBox?.SelectedItem != null)
        {
            SelectItem(_suggestionListBox.SelectedItem);
            ClosePopup();
        }
    }

    private void SelectItem(object item)
    {
        if (item == null) return;

        _isUpdating = true;
        try
        {
            SelectedItem = item;
            
            var displayText = GetDisplayText(item);
            AssociatedObject.Text = displayText;
            AssociatedObject.CaretIndex = displayText.Length;
            
            _lastText = displayText;
        }
        finally
        {
            _isUpdating = false;
        }
    }

    private void OnLostFocus(object sender, RoutedEventArgs e)
    {
        // Delay closing to allow for selection
        Task.Delay(150).ContinueWith(_ =>
        {
            Dispatcher.Invoke(() =>
            {
                if (!IsKeyboardFocusWithin(_popup))
                {
                    ClosePopup();
                }
            });
        });
    }

    private static bool IsKeyboardFocusWithin(DependencyObject? element)
    {
        if (element == null) return false;
        
        var focusedElement = Keyboard.FocusedElement as DependencyObject;
        if (focusedElement == null) return false;

        return focusedElement == element || focusedElement.IsDescendantOf(element);
    }

    private void ClosePopup()
    {
        if (_popup != null)
        {
            _popup.IsOpen = false;
            IsOpen = false;
        }
    }

    private void CleanupPopup()
    {
        if (_suggestionListBox != null)
        {
            _suggestionListBox.SelectionChanged -= OnSuggestionSelected;
            _suggestionListBox.MouseDoubleClick -= OnSuggestionDoubleClick;
        }

        _popup?.Child?.ClearValue(FrameworkElement.DataContextProperty);
        _popup = null;
        _suggestionListBox = null;
    }
}