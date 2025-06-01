// E:\kp\4 invoice\WPF\Controls\SearchableComboBox.xaml.cs
using System.Collections;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Threading;
using Microsoft.Extensions.Logging;
using InvoiceApp.Core.Interfaces.Services;
using InvoiceApp.Core.DTOs;

namespace InvoiceApp.WPF.Controls;

/// <summary>
/// Smart searchable ComboBox with fuzzy search, performance optimization, and modern UX
/// Implements zero-loading experience with instant search results
/// </summary>
public partial class SearchableComboBox : UserControl, INotifyPropertyChanged
{
    private readonly ISearchService _searchService;
    private readonly ILogger<SearchableComboBox> _logger;
    private readonly DispatcherTimer _searchTimer;
    private readonly ObservableCollection<SearchResultDisplayItem> _searchResults;
    
    private bool _isLoading = false;
    private bool _isDropdownOpen = false;
    private bool _hasValidationError = false;
    private string _searchText = string.Empty;
    private string _validationError = string.Empty;
    private object _selectedItem;
    private int _selectedIndex = -1;

    public SearchableComboBox()
    {
        InitializeComponent();
        
        // Get services from DI container
        _searchService = App.GetService<ISearchService>();
        _logger = App.GetService<ILogger<SearchableComboBox>>();
        
        // Initialize collections
        _searchResults = new ObservableCollection<SearchResultDisplayItem>();
        
        // Configure search timer for debouncing (300ms delay for optimal UX)
        _searchTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromMilliseconds(300)
        };
        _searchTimer.Tick += OnSearchTimerTick;
        
        // Set DataContext
        DataContext = this;
        
        // Initialize commands
        InitializeCommands();
        
        _logger.LogDebug("SearchableComboBox initialized");
    }

    #region Dependency Properties

    public static readonly DependencyProperty ItemsSourceProperty =
        DependencyProperty.Register(nameof(ItemsSource), typeof(IEnumerable), typeof(SearchableComboBox),
            new PropertyMetadata(null, OnItemsSourceChanged));

    public static readonly DependencyProperty SelectedItemProperty =
        DependencyProperty.Register(nameof(SelectedItem), typeof(object), typeof(SearchableComboBox),
            new PropertyMetadata(null, OnSelectedItemChanged));

    public static readonly DependencyProperty DisplayMemberPathProperty =
        DependencyProperty.Register(nameof(DisplayMemberPath), typeof(string), typeof(SearchableComboBox),
            new PropertyMetadata("DisplayName"));

    public static readonly DependencyProperty SearchMemberPathProperty =
        DependencyProperty.Register(nameof(SearchMemberPath), typeof(string), typeof(SearchableComboBox),
            new PropertyMetadata("SearchText"));

    public static readonly DependencyProperty PlaceholderTextProperty =
        DependencyProperty.Register(nameof(PlaceholderText), typeof(string), typeof(SearchableComboBox),
            new PropertyMetadata("Search..."));

    public static readonly DependencyProperty MinimumSearchLengthProperty =
        DependencyProperty.Register(nameof(MinimumSearchLength), typeof(int), typeof(SearchableComboBox),
            new PropertyMetadata(2));

    public static readonly DependencyProperty MaxResultsProperty =
        DependencyProperty.Register(nameof(MaxResults), typeof(int), typeof(SearchableComboBox),
            new PropertyMetadata(50));

    public static readonly DependencyProperty ShowQuickActionsProperty =
        DependencyProperty.Register(nameof(ShowQuickActions), typeof(bool), typeof(SearchableComboBox),
            new PropertyMetadata(true));

    public static readonly DependencyProperty IsReadOnlyProperty =
        DependencyProperty.Register(nameof(IsReadOnly), typeof(bool), typeof(SearchableComboBox),
            new PropertyMetadata(false));

    #endregion

    #region Public Properties

    public IEnumerable ItemsSource
    {
        get => (IEnumerable)GetValue(ItemsSourceProperty);
        set => SetValue(ItemsSourceProperty, value);
    }

    public object SelectedItem
    {
        get => GetValue(SelectedItemProperty);
        set => SetValue(SelectedItemProperty, value);
    }

    public string DisplayMemberPath
    {
        get => (string)GetValue(DisplayMemberPathProperty);
        set => SetValue(DisplayMemberPathProperty, value);
    }

    public string SearchMemberPath
    {
        get => (string)GetValue(SearchMemberPathProperty);
        set => SetValue(SearchMemberPathProperty, value);
    }

    public string PlaceholderText
    {
        get => (string)GetValue(PlaceholderTextProperty);
        set => SetValue(PlaceholderTextProperty, value);
    }

    public int MinimumSearchLength
    {
        get => (int)GetValue(MinimumSearchLengthProperty);
        set => SetValue(MinimumSearchLengthProperty, value);
    }

    public int MaxResults
    {
        get => (int)GetValue(MaxResultsProperty);
        set => SetValue(MaxResultsProperty, value);
    }

    public bool ShowQuickActions
    {
        get => (bool)GetValue(ShowQuickActionsProperty);
        set => SetValue(ShowQuickActionsProperty, value);
    }

    public bool IsReadOnly
    {
        get => (bool)GetValue(IsReadOnlyProperty);
        set => SetValue(IsReadOnlyProperty, value);
    }

    public string SearchText
    {
        get => _searchText;
        set
        {
            if (_searchText != value)
            {
                _searchText = value;
                OnPropertyChanged();
                OnPropertyChanged(nameof(CanClear));
                
                if (!IsReadOnly)
                {
                    TriggerSearch();
                }
            }
        }
    }

    public bool IsLoading
    {
        get => _isLoading;
        private set
        {
            if (_isLoading != value)
            {
                _isLoading = value;
                OnPropertyChanged();
            }
        }
    }

    public bool IsDropdownOpen
    {
        get => _isDropdownOpen;
        private set
        {
            if (_isDropdownOpen != value)
            {
                _isDropdownOpen = value;
                OnPropertyChanged();
            }
        }
    }

    public ObservableCollection<SearchResultDisplayItem> SearchResults => _searchResults;

    public bool HasResults => _searchResults.Count > 0;

    public bool CanClear => !string.IsNullOrEmpty(SearchText);

    public bool HasValidationError
    {
        get => _hasValidationError;
        private set
        {
            if (_hasValidationError != value)
            {
                _hasValidationError = value;
                OnPropertyChanged();
            }
        }
    }

    public string ValidationError
    {
        get => _validationError;
        private set
        {
            if (_validationError != value)
            {
                _validationError = value;
                OnPropertyChanged();
                HasValidationError = !string.IsNullOrEmpty(value);
            }
        }
    }

    #endregion

    #region Commands

    public ICommand ClearCommand { get; private set; }
    public ICommand AddNewCommand { get; private set; }
    public ICommand ShowAllCommand { get; private set; }

    private void InitializeCommands()
    {
        ClearCommand = new RelayCommand(ClearSearch, () => CanClear);
        AddNewCommand = new RelayCommand(ExecuteAddNew, () => AddNewRequested != null);
        ShowAllCommand = new RelayCommand(ExecuteShowAll, () => ShowAllRequested != null);
    }

    #endregion

    #region Events

    public event EventHandler<object> ItemSelected;
    public event EventHandler AddNewRequested;
    public event EventHandler ShowAllRequested;
    public event PropertyChangedEventHandler PropertyChanged;

    protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }

    #endregion

    #region Public Methods

    /// <summary>
    /// Set validation error
    /// </summary>
    public void SetValidationError(string error)
    {
        ValidationError = error;
    }

    /// <summary>
    /// Clear validation error
    /// </summary>
    public void ClearValidationError()
    {
        ValidationError = string.Empty;
    }

    /// <summary>
    /// Focus the search textbox
    /// </summary>
    public new void Focus()
    {
        SearchTextBox?.Focus();
    }

    /// <summary>
    /// Select item programmatically
    /// </summary>
    public void SelectItem(object item)
    {
        if (item != null)
        {
            SelectedItem = item;
            UpdateSearchTextFromSelectedItem();
            IsDropdownOpen = false;
        }
    }

    #endregion

    #region Event Handlers

    public void OnSearchTextChanged()
    {
        TriggerSearch();
    }

    public void OnKeyDown(KeyEventArgs e)
    {
        switch (e.Key)
        {
            case Key.Down:
                NavigateResults(1);
                e.Handled = true;
                break;
            case Key.Up:
                NavigateResults(-1);
                e.Handled = true;
                break;
            case Key.Enter:
                SelectCurrentResult();
                e.Handled = true;
                break;
            case Key.Escape:
                IsDropdownOpen = false;
                e.Handled = true;
                break;
        }
    }

    public void OnTextBoxGotFocus()
    {
        if (!string.IsNullOrEmpty(SearchText) && _searchResults.Count > 0)
        {
            IsDropdownOpen = true;
        }
        else
        {
            TriggerSearch();
        }
    }

    public void OnTextBoxLostFocus()
    {
        // Delay closing to allow for item selection
        Dispatcher.BeginInvoke(new Action(() =>
        {
            if (!SearchResultsPopup.IsMouseOver)
            {
                IsDropdownOpen = false;
            }
        }), DispatcherPriority.Background);
    }

    private void OnResultItemClick(object sender, MouseButtonEventArgs e)
    {
        if (sender is FrameworkElement element && element.DataContext is SearchResultDisplayItem item)
        {
            SelectSearchResult(item);
        }
    }

    #endregion

    #region Private Methods

    private static void OnItemsSourceChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is SearchableComboBox control)
        {
            control.OnItemsSourceChanged();
        }
    }

    private static void OnSelectedItemChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is SearchableComboBox control)
        {
            control.OnSelectedItemChanged(e.NewValue);
        }
    }

    private void OnItemsSourceChanged()
    {
        // Clear current search when items change
        ClearSearch();
        _logger.LogDebug("ItemsSource changed, search cleared");
    }

    private void OnSelectedItemChanged(object newValue)
    {
        _selectedItem = newValue;
        UpdateSearchTextFromSelectedItem();
        ItemSelected?.Invoke(this, newValue);
    }

    private void UpdateSearchTextFromSelectedItem()
    {
        if (_selectedItem != null)
        {
            var displayText = GetDisplayText(_selectedItem);
            if (SearchText != displayText)
            {
                SearchText = displayText;
            }
        }
    }

    private string GetDisplayText(object item)
    {
        if (item == null) return string.Empty;

        try
        {
            var property = item.GetType().GetProperty(DisplayMemberPath);
            return property?.GetValue(item)?.ToString() ?? item.ToString();
        }
        catch
        {
            return item.ToString();
        }
    }

    private string GetSearchText(object item)
    {
        if (item == null) return string.Empty;

        try
        {
            var property = item.GetType().GetProperty(SearchMemberPath);
            return property?.GetValue(item)?.ToString() ?? GetDisplayText(item);
        }
        catch
        {
            return GetDisplayText(item);
        }
    }

    private void TriggerSearch()
    {
        // Stop existing timer
        _searchTimer.Stop();
        
        // Clear validation error when user starts typing
        ClearValidationError();

        // Start timer for debounced search
        if (!string.IsNullOrEmpty(SearchText) && SearchText.Length >= MinimumSearchLength)
        {
            _searchTimer.Start();
        }
        else if (string.IsNullOrEmpty(SearchText))
        {
            // Clear results if search is empty
            ClearSearchResults();
        }
        else
        {
            // Show message for minimum length
            IsDropdownOpen = false;
        }
    }

    private async void OnSearchTimerTick(object sender, EventArgs e)
    {
        _searchTimer.Stop();
        await PerformSearchAsync();
    }

    private async Task PerformSearchAsync()
    {
        if (ItemsSource == null || string.IsNullOrEmpty(SearchText))
        {
            return;
        }

        try
        {
            IsLoading = true;
            
            // Convert ItemsSource to list for searching
            var items = ItemsSource.Cast<object>().ToList();
            
            // Perform smart search
            var searchResults = await Task.Run(() =>
                _searchService.Search(items, SearchText, GetSearchText, GetAdditionalSearchFields));

            // Convert to display items
            var displayItems = searchResults
                .Take(MaxResults)
                .Select(r => new SearchResultDisplayItem
                {
                    Item = r.Item,
                    DisplayName = GetDisplayText(r.Item),
                    SecondaryText = GetSecondaryText(r.Item),
                    MatchTypeText = GetMatchTypeText(r.MatchType),
                    ShowMatchType = r.MatchType != Core.Enums.SearchMatchType.ExactFullMatch,
                    SearchRank = r.SearchRank
                })
                .ToList();

            // Update UI
            await Dispatcher.InvokeAsync(() =>
            {
                _searchResults.Clear();
                foreach (var item in displayItems)
                {
                    _searchResults.Add(item);
                }

                OnPropertyChanged(nameof(HasResults));
                IsDropdownOpen = _searchResults.Count > 0;
            });

            _logger.LogDebug("Search completed: {ResultCount} results for '{SearchTerm}'", 
                displayItems.Count, SearchText);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing search for term: {SearchTerm}", SearchText);
            ClearSearchResults();
            SetValidationError("Search failed. Please try again.");
        }
        finally
        {
            IsLoading = false;
        }
    }

    private string[] GetAdditionalSearchFields(object item)
    {
        // Override this method to provide additional search fields
        // For TKA items: passport, divisi, etc.
        if (item is TkaSelectionItem tka)
        {
            return new[] { tka.Passport, tka.Divisi, tka.Relationship };
        }

        return new string[0];
    }

    private string GetSecondaryText(object item)
    {
        // Override to provide secondary text (e.g., passport for TKA)
        if (item is TkaSelectionItem tka)
        {
            return $"{tka.Relationship} - {tka.Passport}";
        }

        return string.Empty;
    }

    private string GetMatchTypeText(Core.Enums.SearchMatchType matchType)
    {
        return matchType switch
        {
            Core.Enums.SearchMatchType.ExactFullMatch => "Exact",
            Core.Enums.SearchMatchType.ExactWordMatch => "Word",
            Core.Enums.SearchMatchType.StartsWith => "Prefix",
            Core.Enums.SearchMatchType.Contains => "Contains",
            Core.Enums.SearchMatchType.FuzzyMatch => "Fuzzy",
            Core.Enums.SearchMatchType.PartialMatch => "Partial",
            _ => "Match"
        };
    }

    private void ClearSearchResults()
    {
        _searchResults.Clear();
        OnPropertyChanged(nameof(HasResults));
        IsDropdownOpen = false;
    }

    private void NavigateResults(int direction)
    {
        if (_searchResults.Count == 0) return;

        _selectedIndex = Math.Max(0, Math.Min(_searchResults.Count - 1, _selectedIndex + direction));
        
        // TODO: Implement visual selection highlight
        // This would require updating the UI to show selected item
    }

    private void SelectCurrentResult()
    {
        if (_selectedIndex >= 0 && _selectedIndex < _searchResults.Count)
        {
            var selectedResult = _searchResults[_selectedIndex];
            SelectSearchResult(selectedResult);
        }
    }

    private void SelectSearchResult(SearchResultDisplayItem result)
    {
        if (result?.Item != null)
        {
            SelectedItem = result.Item;
            IsDropdownOpen = false;
            SearchTextBox?.Focus(); // Keep focus for next input
        }
    }

    private void ClearSearch()
    {
        SearchText = string.Empty;
        SelectedItem = null;
        ClearSearchResults();
        ClearValidationError();
    }

    private void ExecuteAddNew()
    {
        IsDropdownOpen = false;
        AddNewRequested?.Invoke(this, EventArgs.Empty);
    }

    private void ExecuteShowAll()
    {
        IsDropdownOpen = false;
        ShowAllRequested?.Invoke(this, EventArgs.Empty);
    }

    #endregion

    #region RelayCommand Implementation

    private class RelayCommand : ICommand
    {
        private readonly Action _execute;
        private readonly Func<bool> _canExecute;

        public RelayCommand(Action execute, Func<bool> canExecute = null)
        {
            _execute = execute ?? throw new ArgumentNullException(nameof(execute));
            _canExecute = canExecute;
        }

        public event EventHandler CanExecuteChanged
        {
            add => CommandManager.RequerySuggested += value;
            remove => CommandManager.RequerySuggested -= value;
        }

        public bool CanExecute(object parameter) => _canExecute?.Invoke() ?? true;

        public void Execute(object parameter) => _execute();
    }

    #endregion
}

/// <summary>
/// Display item for search results
/// </summary>
public class SearchResultDisplayItem
{
    public object Item { get; set; }
    public string DisplayName { get; set; }
    public string SecondaryText { get; set; }
    public string MatchTypeText { get; set; }
    public bool ShowMatchType { get; set; }
    public double SearchRank { get; set; }
}