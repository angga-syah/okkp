using System.ComponentModel;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;

namespace InvoiceApp.WPF.Controls;

public enum TextBoxVariant
{
    Standard,
    Outlined,
    Filled
}

public partial class MultiLineTextBox : UserControl, INotifyPropertyChanged
{
    // Dependency Properties
    public static readonly DependencyProperty TextProperty =
        DependencyProperty.Register(nameof(Text), typeof(string), typeof(MultiLineTextBox),
            new FrameworkPropertyMetadata(string.Empty, FrameworkPropertyMetadataOptions.BindsTwoWayByDefault, OnTextChanged));

    public static readonly DependencyProperty PlaceholderTextProperty =
        DependencyProperty.Register(nameof(PlaceholderText), typeof(string), typeof(MultiLineTextBox),
            new PropertyMetadata("Enter text here..."));

    public static readonly DependencyProperty LabelProperty =
        DependencyProperty.Register(nameof(Label), typeof(string), typeof(MultiLineTextBox));

    public static readonly DependencyProperty HelperTextProperty =
        DependencyProperty.Register(nameof(HelperText), typeof(string), typeof(MultiLineTextBox));

    public static readonly DependencyProperty MaxLengthProperty =
        DependencyProperty.Register(nameof(MaxLength), typeof(int), typeof(MultiLineTextBox),
            new PropertyMetadata(0, OnMaxLengthChanged));

    public static readonly DependencyProperty MinLinesProperty =
        DependencyProperty.Register(nameof(MinLines), typeof(int), typeof(MultiLineTextBox),
            new PropertyMetadata(3));

    public static readonly DependencyProperty MaxLinesProperty =
        DependencyProperty.Register(nameof(MaxLines), typeof(int), typeof(MultiLineTextBox),
            new PropertyMetadata(10));

    public static readonly DependencyProperty IsReadOnlyProperty =
        DependencyProperty.Register(nameof(IsReadOnly), typeof(bool), typeof(MultiLineTextBox),
            new PropertyMetadata(false));

    public static readonly DependencyProperty VariantProperty =
        DependencyProperty.Register(nameof(Variant), typeof(TextBoxVariant), typeof(MultiLineTextBox),
            new PropertyMetadata(TextBoxVariant.Standard, OnVariantChanged));

    public static readonly DependencyProperty ShowLabelProperty =
        DependencyProperty.Register(nameof(ShowLabel), typeof(bool), typeof(MultiLineTextBox),
            new PropertyMetadata(false));

    public static readonly DependencyProperty ShowCountersProperty =
        DependencyProperty.Register(nameof(ShowCounters), typeof(bool), typeof(MultiLineTextBox),
            new PropertyMetadata(true));

    public static readonly DependencyProperty ShowCharacterCountProperty =
        DependencyProperty.Register(nameof(ShowCharacterCount), typeof(bool), typeof(MultiLineTextBox),
            new PropertyMetadata(true));

    public static readonly DependencyProperty ShowWordCountProperty =
        DependencyProperty.Register(nameof(ShowWordCount), typeof(bool), typeof(MultiLineTextBox),
            new PropertyMetadata(true));

    public static readonly DependencyProperty ShowActionButtonsProperty =
        DependencyProperty.Register(nameof(ShowActionButtons), typeof(bool), typeof(MultiLineTextBox),
            new PropertyMetadata(false));

    public static readonly DependencyProperty ShowClearButtonProperty =
        DependencyProperty.Register(nameof(ShowClearButton), typeof(bool), typeof(MultiLineTextBox),
            new PropertyMetadata(true));

    public static readonly DependencyProperty ShowFormatButtonProperty =
        DependencyProperty.Register(nameof(ShowFormatButton), typeof(bool), typeof(MultiLineTextBox),
            new PropertyMetadata(false));

    public static readonly DependencyProperty AutoFormatProperty =
        DependencyProperty.Register(nameof(AutoFormat), typeof(bool), typeof(MultiLineTextBox),
            new PropertyMetadata(false));

    public static readonly DependencyProperty PreserveFormattingProperty =
        DependencyProperty.Register(nameof(PreserveFormatting), typeof(bool), typeof(MultiLineTextBox),
            new PropertyMetadata(true));

    // Properties
    public string Text
    {
        get => (string)GetValue(TextProperty);
        set => SetValue(TextProperty, value);
    }

    public string PlaceholderText
    {
        get => (string)GetValue(PlaceholderTextProperty);
        set => SetValue(PlaceholderTextProperty, value);
    }

    public string? Label
    {
        get => (string?)GetValue(LabelProperty);
        set => SetValue(LabelProperty, value);
    }

    public string? HelperText
    {
        get => (string?)GetValue(HelperTextProperty);
        set => SetValue(HelperTextProperty, value);
    }

    public int MaxLength
    {
        get => (int)GetValue(MaxLengthProperty);
        set => SetValue(MaxLengthProperty, value);
    }

    public int MinLines
    {
        get => (int)GetValue(MinLinesProperty);
        set => SetValue(MinLinesProperty, value);
    }

    public int MaxLines
    {
        get => (int)GetValue(MaxLinesProperty);
        set => SetValue(MaxLinesProperty, value);
    }

    public bool IsReadOnly
    {
        get => (bool)GetValue(IsReadOnlyProperty);
        set => SetValue(IsReadOnlyProperty, value);
    }

    public TextBoxVariant Variant
    {
        get => (TextBoxVariant)GetValue(VariantProperty);
        set => SetValue(VariantProperty, value);
    }

    public bool ShowLabel
    {
        get => (bool)GetValue(ShowLabelProperty);
        set => SetValue(ShowLabelProperty, value);
    }

    public bool ShowCounters
    {
        get => (bool)GetValue(ShowCountersProperty);
        set => SetValue(ShowCountersProperty, value);
    }

    public bool ShowCharacterCount
    {
        get => (bool)GetValue(ShowCharacterCountProperty);
        set => SetValue(ShowCharacterCountProperty, value);
    }

    public bool ShowWordCount
    {
        get => (bool)GetValue(ShowWordCountProperty);
        set => SetValue(ShowWordCountProperty, value);
    }

    public bool ShowActionButtons
    {
        get => (bool)GetValue(ShowActionButtonsProperty);
        set => SetValue(ShowActionButtonsProperty, value);
    }

    public bool ShowClearButton
    {
        get => (bool)GetValue(ShowClearButtonProperty);
        set => SetValue(ShowClearButtonProperty, value);
    }

    public bool ShowFormatButton
    {
        get => (bool)GetValue(ShowFormatButtonProperty);
        set => SetValue(ShowFormatButtonProperty, value);
    }

    public bool AutoFormat
    {
        get => (bool)GetValue(AutoFormatProperty);
        set => SetValue(AutoFormatProperty, value);
    }

    public bool PreserveFormatting
    {
        get => (bool)GetValue(PreserveFormattingProperty);
        set => SetValue(PreserveFormattingProperty, value);
    }

    // Bindable Properties
    private int _characterCount;
    public int CharacterCount
    {
        get => _characterCount;
        private set
        {
            _characterCount = value;
            OnPropertyChanged();
        }
    }

    private int _wordCount;
    public int WordCount
    {
        get => _wordCount;
        private set
        {
            _wordCount = value;
            OnPropertyChanged();
        }
    }

    private int _lineCount;
    public int LineCount
    {
        get => _lineCount;
        private set
        {
            _lineCount = value;
            OnPropertyChanged();
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

    // Events
    public static readonly RoutedEvent TextChangedEvent =
        EventManager.RegisterRoutedEvent(nameof(TextChanged), RoutingStrategy.Bubble,
            typeof(RoutedEventHandler), typeof(MultiLineTextBox));

    public static readonly RoutedEvent LineCountChangedEvent =
        EventManager.RegisterRoutedEvent(nameof(LineCountChanged), RoutingStrategy.Bubble,
            typeof(RoutedEventHandler), typeof(MultiLineTextBox));

    public event RoutedEventHandler TextChanged
    {
        add => AddHandler(TextChangedEvent, value);
        remove => RemoveHandler(TextChangedEvent, value);
    }

    public event RoutedEventHandler LineCountChanged
    {
        add => AddHandler(LineCountChangedEvent, value);
        remove => RemoveHandler(LineCountChangedEvent, value);
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public MultiLineTextBox()
    {
        InitializeComponent();
        UpdateCounters();
        UpdateVariant();
    }

    private static void OnTextChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is MultiLineTextBox control)
        {
            control.UpdateCounters();
            control.ValidateText();
            control.RaiseEvent(new RoutedEventArgs(TextChangedEvent));
        }
    }

    private static void OnMaxLengthChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is MultiLineTextBox control)
        {
            control.ValidateText();
        }
    }

    private static void OnVariantChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is MultiLineTextBox control)
        {
            control.UpdateVariant();
        }
    }

    private void UpdateCounters()
    {
        var text = Text ?? string.Empty;
        
        CharacterCount = text.Length;
        WordCount = CountWords(text);
        
        var newLineCount = text.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries).Length;
        if (newLineCount != LineCount)
        {
            LineCount = newLineCount;
            RaiseEvent(new RoutedEventArgs(LineCountChangedEvent));
        }
    }

    private int CountWords(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return 0;

        // Split by whitespace and filter out empty entries
        var words = text.Split(new char[] { ' ', '\t', '\r', '\n' }, 
            StringSplitOptions.RemoveEmptyEntries);
        
        return words.Length;
    }

    private void ValidateText()
    {
        ErrorMessage = string.Empty;

        if (MaxLength > 0 && CharacterCount > MaxLength)
        {
            ErrorMessage = $"Text exceeds maximum length of {MaxLength} characters";
        }
    }

    private void UpdateVariant()
    {
        var styleName = Variant switch
        {
            TextBoxVariant.Outlined => "OutlinedMultiLineTextBoxStyle",
            TextBoxVariant.Filled => "MultiLineTextBoxStyle", // Add filled style if needed
            _ => "MultiLineTextBoxStyle"
        };

        if (Resources[styleName] is Style style)
        {
            MainTextBox.Style = style;
        }
    }

    // Event Handlers
    private void MainTextBox_TextChanged(object sender, TextChangedEventArgs e)
    {
        UpdateCounters();
        ValidateText();
    }

    private void MainTextBox_PreviewKeyDown(object sender, KeyEventArgs e)
    {
        // Handle special key combinations
        if (e.Key == Key.Enter)
        {
            // Allow Enter for new lines (default behavior)
            // You can add custom logic here if needed
            return;
        }
        
        if (e.Key == Key.Tab)
        {
            // Allow Tab for indentation (default behavior)
            return;
        }
        
        // Handle Ctrl combinations
        if (Keyboard.Modifiers == ModifierKeys.Control)
        {
            switch (e.Key)
            {
                case Key.A: // Select All
                    MainTextBox.SelectAll();
                    e.Handled = true;
                    break;
                    
                case Key.Z: // Undo
                    if (MainTextBox.CanUndo)
                        MainTextBox.Undo();
                    e.Handled = true;
                    break;
                    
                case Key.Y: // Redo
                    if (MainTextBox.CanRedo)
                        MainTextBox.Redo();
                    e.Handled = true;
                    break;
                    
                case Key.K: // Clear
                    ClearText();
                    e.Handled = true;
                    break;
                    
                case Key.F: // Format (if auto-format is enabled)
                    if (AutoFormat)
                    {
                        FormatText();
                        e.Handled = true;
                    }
                    break;
            }
        }
    }

    private void MainTextBox_GotFocus(object sender, RoutedEventArgs e)
    {
        // Handle focus behavior if needed
    }

    private void MainTextBox_LostFocus(object sender, RoutedEventArgs e)
    {
        if (AutoFormat)
        {
            FormatText();
        }
    }

    private void ClearButton_Click(object sender, RoutedEventArgs e)
    {
        ClearText();
    }

    private void FormatButton_Click(object sender, RoutedEventArgs e)
    {
        FormatText();
    }

    // Public Methods
    public void ClearText()
    {
        Text = string.Empty;
        MainTextBox.Focus();
    }

    public void FormatText()
    {
        if (string.IsNullOrWhiteSpace(Text)) return;

        var formattedText = Text;

        if (PreserveFormatting)
        {
            // Basic formatting while preserving intentional line breaks
            formattedText = FormatWithPreservation(formattedText);
        }
        else
        {
            // More aggressive formatting
            formattedText = FormatAggressively(formattedText);
        }

        Text = formattedText;
    }

    private string FormatWithPreservation(string text)
    {
        // Remove extra spaces but preserve line breaks
        var lines = text.Split(new[] { '\r', '\n' }, StringSplitOptions.None);
        var formattedLines = lines.Select(line => Regex.Replace(line.Trim(), @"\s+", " "));
        
        return string.Join(Environment.NewLine, formattedLines);
    }

    private string FormatAggressively(string text)
    {
        // Remove all extra whitespace and format as paragraph
        text = Regex.Replace(text, @"\s+", " ").Trim();
        
        // Split into sentences and format
        var sentences = text.Split(new[] { '.', '!', '?' }, StringSplitOptions.RemoveEmptyEntries);
        var formattedSentences = sentences.Select(s => s.Trim()).Where(s => !string.IsNullOrEmpty(s));
        
        return string.Join(". ", formattedSentences) + ".";
    }

    public void AppendText(string textToAppend)
    {
        if (string.IsNullOrEmpty(textToAppend)) return;
        
        var currentText = Text ?? string.Empty;
        Text = currentText + textToAppend;
        
        // Move cursor to end
        MainTextBox.CaretIndex = Text.Length;
        MainTextBox.ScrollToEnd();
    }

    public void InsertText(string textToInsert, int position = -1)
    {
        if (string.IsNullOrEmpty(textToInsert)) return;
        
        var currentText = Text ?? string.Empty;
        var insertPosition = position >= 0 ? Math.Min(position, currentText.Length) : MainTextBox.CaretIndex;
        
        Text = currentText.Insert(insertPosition, textToInsert);
        
        // Move cursor after inserted text
        MainTextBox.CaretIndex = insertPosition + textToInsert.Length;
    }

    public void SelectText(int start, int length)
    {
        MainTextBox.Focus();
        MainTextBox.Select(start, length);
    }

    public void SelectAll()
    {
        MainTextBox.Focus();
        MainTextBox.SelectAll();
    }

    public string GetSelectedText()
    {
        return MainTextBox.SelectedText;
    }

    public void ReplaceSelectedText(string replacement)
    {
        if (MainTextBox.SelectionLength > 0)
        {
            var start = MainTextBox.SelectionStart;
            var currentText = Text ?? string.Empty;
            
            Text = currentText.Remove(start, MainTextBox.SelectionLength).Insert(start, replacement);
            MainTextBox.CaretIndex = start + replacement.Length;
        }
    }

    public void Focus()
    {
        MainTextBox.Focus();
    }

    public bool IsValid()
    {
        ValidateText();
        return !HasError;
    }

    public void SetError(string errorMessage)
    {
        ErrorMessage = errorMessage;
    }

    public void ClearError()
    {
        ErrorMessage = string.Empty;
    }

    protected virtual void OnPropertyChanged([System.Runtime.CompilerServices.CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}