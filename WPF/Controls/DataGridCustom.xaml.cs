// E:\kp\4 invoice\WPF\Controls\DataGridCustom.xaml.cs
using System.Collections;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.ComponentModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Input;
using MaterialDesignThemes.Wpf;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.WPF.Controls;

/// <summary>
/// Modern custom DataGrid with advanced features like auto-generation, 
/// filtering, sorting, export capabilities, and Material Design styling
/// </summary>
public partial class DataGridCustom : UserControl
{
    private readonly ILogger<DataGridCustom> _logger;
    private ObservableCollection<object> _selectedItemsInternal;

    public DataGridCustom()
    {
        InitializeComponent();
        
        _logger = App.GetService<ILogger<DataGridCustom>>();
        _selectedItemsInternal = new ObservableCollection<object>();
        
        // Wire up events
        MainDataGrid.SelectionChanged += OnSelectionChanged;
        MainDataGrid.Sorting += OnSorting;
        MainDataGrid.AutoGeneratingColumn += OnAutoGeneratingColumn;
        
        // Set default values
        LoadingText = "Loading...";
        EmptyStateIcon = PackIconKind.InboxArrowDown;
        EmptyStateTitle = "No Data Available";
        EmptyStateMessage = "There are no items to display.";
        EmptyStateActionText = "Refresh";
        
        DataContext = this;
    }

    #region Dependency Properties

    // Data Properties
    public static readonly DependencyProperty ItemsSourceProperty =
        DependencyProperty.Register(nameof(ItemsSource), typeof(IEnumerable), typeof(DataGridCustom),
            new PropertyMetadata(null, OnItemsSourceChanged));

    public static readonly DependencyProperty SelectedItemProperty =
        DependencyProperty.Register(nameof(SelectedItem), typeof(object), typeof(DataGridCustom),
            new PropertyMetadata(null, OnSelectedItemChanged));

    public static readonly DependencyProperty SelectedItemsProperty =
        DependencyProperty.Register(nameof(SelectedItems), typeof(IList), typeof(DataGridCustom),
            new PropertyMetadata(null));

    // Configuration Properties
    public static readonly DependencyProperty AutoGenerateColumnsProperty =
        DependencyProperty.Register(nameof(AutoGenerateColumns), typeof(bool), typeof(DataGridCustom),
            new PropertyMetadata(true));

    public static readonly DependencyProperty CanUserSortProperty =
        DependencyProperty.Register(nameof(CanUserSort), typeof(bool), typeof(DataGridCustom),
            new PropertyMetadata(true));

    public static readonly DependencyProperty CanUserReorderColumnsProperty =
        DependencyProperty.Register(nameof(CanUserReorderColumns), typeof(bool), typeof(DataGridCustom),
            new PropertyMetadata(true));

    public static readonly DependencyProperty CanUserResizeColumnsProperty =
        DependencyProperty.Register(nameof(CanUserResizeColumns), typeof(bool), typeof(DataGridCustom),
            new PropertyMetadata(true));

    // State Properties
    public static readonly DependencyProperty IsLoadingProperty =
        DependencyProperty.Register(nameof(IsLoading), typeof(bool), typeof(DataGridCustom),
            new PropertyMetadata(false));

    public static readonly DependencyProperty LoadingTextProperty =
        DependencyProperty.Register(nameof(LoadingText), typeof(string), typeof(DataGridCustom),
            new PropertyMetadata("Loading..."));

    public static readonly DependencyProperty HasErrorProperty =
        DependencyProperty.Register(nameof(HasError), typeof(bool), typeof(DataGridCustom),
            new PropertyMetadata(false));

    public static readonly DependencyProperty ErrorMessageProperty =
        DependencyProperty.Register(nameof(ErrorMessage), typeof(string), typeof(DataGridCustom),
            new PropertyMetadata(string.Empty));

    public static readonly DependencyProperty HasFilterProperty =
        DependencyProperty.Register(nameof(HasFilter), typeof(bool), typeof(DataGridCustom),
            new PropertyMetadata(false));

    // Empty State Properties
    public static readonly DependencyProperty ShowEmptyStateProperty =
        DependencyProperty.Register(nameof(ShowEmptyState), typeof(bool), typeof(DataGridCustom),
            new PropertyMetadata(false));

    public static readonly DependencyProperty EmptyStateIconProperty =
        DependencyProperty.Register(nameof(EmptyStateIcon), typeof(PackIconKind), typeof(DataGridCustom),
            new PropertyMetadata(PackIconKind.InboxArrowDown));

    public static readonly DependencyProperty EmptyStateTitleProperty =
        DependencyProperty.Register(nameof(EmptyStateTitle), typeof(string), typeof(DataGridCustom),
            new PropertyMetadata("No Data Available"));

    public static readonly DependencyProperty EmptyStateMessageProperty =
        DependencyProperty.Register(nameof(EmptyStateMessage), typeof(string), typeof(DataGridCustom),
            new PropertyMetadata("There are no items to display."));

    public static readonly DependencyProperty EmptyStateActionTextProperty =
        DependencyProperty.Register(nameof(EmptyStateActionText), typeof(string), typeof(DataGridCustom),
            new PropertyMetadata("Refresh"));

    public static readonly DependencyProperty EmptyStateActionCommandProperty =
        DependencyProperty.Register(nameof(EmptyStateActionCommand), typeof(ICommand), typeof(DataGridCustom),
            new PropertyMetadata(null));

    // Selection Properties
    public static readonly DependencyProperty ShowSelectionInfoProperty =
        DependencyProperty.Register(nameof(ShowSelectionInfo), typeof(bool), typeof(DataGridCustom),
            new PropertyMetadata(false));

    public static readonly DependencyProperty SelectionInfoProperty =
        DependencyProperty.Register(nameof(SelectionInfo), typeof(string), typeof(DataGridCustom),
            new PropertyMetadata(string.Empty));

    // Row Details
    public static readonly DependencyProperty RowDetailsTemplateProperty =
        DependencyProperty.Register(nameof(RowDetailsTemplate), typeof(DataTemplate), typeof(DataGridCustom),
            new PropertyMetadata(null));

    // Command Properties
    public static readonly DependencyProperty RefreshCommandProperty =
        DependencyProperty.Register(nameof(RefreshCommand), typeof(ICommand), typeof(DataGridCustom),
            new PropertyMetadata(null));

    public static readonly DependencyProperty ExportCommandProperty =
        DependencyProperty.Register(nameof(ExportCommand), typeof(ICommand), typeof(DataGridCustom),
            new PropertyMetadata(null));

    public static readonly DependencyProperty RetryCommandProperty =
        DependencyProperty.Register(nameof(RetryCommand), typeof(ICommand), typeof(DataGridCustom),
            new PropertyMetadata(null));

    #endregion

    #region Properties

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

    public IList SelectedItems
    {
        get => (IList)GetValue(SelectedItemsProperty);
        set => SetValue(SelectedItemsProperty, value);
    }

    public bool AutoGenerateColumns
    {
        get => (bool)GetValue(AutoGenerateColumnsProperty);
        set => SetValue(AutoGenerateColumnsProperty, value);
    }

    public bool CanUserSort
    {
        get => (bool)GetValue(CanUserSortProperty);
        set => SetValue(CanUserSortProperty, value);
    }

    public bool CanUserReorderColumns
    {
        get => (bool)GetValue(CanUserReorderColumnsProperty);
        set => SetValue(CanUserReorderColumnsProperty, value);
    }

    public bool CanUserResizeColumns
    {
        get => (bool)GetValue(CanUserResizeColumnsProperty);
        set => SetValue(CanUserResizeColumnsProperty, value);
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

    public bool HasError
    {
        get => (bool)GetValue(HasErrorProperty);
        set => SetValue(HasErrorProperty, value);
    }

    public string ErrorMessage
    {
        get => (string)GetValue(ErrorMessageProperty);
        set => SetValue(ErrorMessageProperty, value);
    }

    public bool HasFilter
    {
        get => (bool)GetValue(HasFilterProperty);
        set => SetValue(HasFilterProperty, value);
    }

    public bool ShowEmptyState
    {
        get => (bool)GetValue(ShowEmptyStateProperty);
        set => SetValue(ShowEmptyStateProperty, value);
    }

    public PackIconKind EmptyStateIcon
    {
        get => (PackIconKind)GetValue(EmptyStateIconProperty);
        set => SetValue(EmptyStateIconProperty, value);
    }

    public string EmptyStateTitle
    {
        get => (string)GetValue(EmptyStateTitleProperty);
        set => SetValue(EmptyStateTitleProperty, value);
    }

    public string EmptyStateMessage
    {
        get => (string)GetValue(EmptyStateMessageProperty);
        set => SetValue(EmptyStateMessageProperty, value);
    }

    public string EmptyStateActionText
    {
        get => (string)GetValue(EmptyStateActionTextProperty);
        set => SetValue(EmptyStateActionTextProperty, value);
    }

    public ICommand EmptyStateActionCommand
    {
        get => (ICommand)GetValue(EmptyStateActionCommandProperty);
        set => SetValue(EmptyStateActionCommandProperty, value);
    }

    public bool ShowSelectionInfo
    {
        get => (bool)GetValue(ShowSelectionInfoProperty);
        set => SetValue(ShowSelectionInfoProperty, value);
    }

    public string SelectionInfo
    {
        get => (string)GetValue(SelectionInfoProperty);
        set => SetValue(SelectionInfoProperty, value);
    }

    public DataTemplate RowDetailsTemplate
    {
        get => (DataTemplate)GetValue(RowDetailsTemplateProperty);
        set => SetValue(RowDetailsTemplateProperty, value);
    }

    public ICommand RefreshCommand
    {
        get => (ICommand)GetValue(RefreshCommandProperty);
        set => SetValue(RefreshCommandProperty, value);
    }

    public ICommand ExportCommand
    {
        get => (ICommand)GetValue(ExportCommandProperty);
        set => SetValue(ExportCommandProperty, value);
    }

    public ICommand RetryCommand
    {
        get => (ICommand)GetValue(RetryCommandProperty);
        set => SetValue(RetryCommandProperty, value);
    }

    // Command implementations
    public ICommand CopyCommand { get; private set; }
    public ICommand SelectAllCommand { get; private set; }
    public ICommand ClearSelectionCommand { get; private set; }

    #endregion

    #region Initialization

    private void InitializeCommands()
    {
        CopyCommand = new RelayCommand(ExecuteCopy, CanExecuteCopy);
        SelectAllCommand = new RelayCommand(ExecuteSelectAll, CanExecuteSelectAll);
        ClearSelectionCommand = new RelayCommand(ExecuteClearSelection, CanExecuteClearSelection);
    }

    #endregion

    #region Event Handlers

    private static void OnItemsSourceChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is DataGridCustom control)
        {
            control.UpdateEmptyState();
            control.UpdateItemsSource();
        }
    }

    private static void OnSelectedItemChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is DataGridCustom control && control.MainDataGrid.SelectedItem != e.NewValue)
        {
            control.MainDataGrid.SelectedItem = e.NewValue;
        }
    }

    private void OnSelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        try
        {
            // Update SelectedItem
            SelectedItem = MainDataGrid.SelectedItem;

            // Update SelectedItems
            _selectedItemsInternal.Clear();
            foreach (var item in MainDataGrid.SelectedItems)
            {
                _selectedItemsInternal.Add(item);
            }

            // Update selection info
            UpdateSelectionInfo();

            // Raise SelectionChanged event
            SelectionChanged?.Invoke(this, e);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error handling selection change");
        }
    }

    private void OnSorting(object sender, DataGridSortingEventArgs e)
    {
        try
        {
            // Custom sorting logic can be implemented here
            Sorting?.Invoke(this, e);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error handling sorting");
        }
    }

    private void OnAutoGeneratingColumn(object sender, DataGridAutoGeneratingColumnEventArgs e)
    {
        try
        {
            if (e.PropertyType == typeof(bool) || e.PropertyType == typeof(bool?))
            {
                // Use checkbox for boolean columns
                var checkboxColumn = new DataGridCheckBoxColumn
                {
                    Header = e.Column.Header,
                    Binding = e.Column.Binding,
                    IsReadOnly = true
                };
                e.Column = checkboxColumn;
            }
            else if (e.PropertyType == typeof(DateTime) || e.PropertyType == typeof(DateTime?))
            {
                // Format date columns
                if (e.Column is DataGridTextColumn textColumn)
                {
                    var binding = textColumn.Binding as Binding;
                    if (binding != null)
                    {
                        binding.StringFormat = "dd/MM/yyyy";
                    }
                }
            }
            else if (e.PropertyType == typeof(decimal) || e.PropertyType == typeof(decimal?) ||
                     e.PropertyType == typeof(double) || e.PropertyType == typeof(double?) ||
                     e.PropertyType == typeof(float) || e.PropertyType == typeof(float?))
            {
                // Format numeric columns
                if (e.Column is DataGridTextColumn textColumn)
                {
                    var binding = textColumn.Binding as Binding;
                    if (binding != null)
                    {
                        if (e.PropertyName.ToLower().Contains("amount") || 
                            e.PropertyName.ToLower().Contains("price") || 
                            e.PropertyName.ToLower().Contains("total"))
                        {
                            binding.StringFormat = "C2"; // Currency format
                        }
                        else
                        {
                            binding.StringFormat = "N2"; // Number format
                        }
                    }
                }
            }

            // Apply consistent styling
            e.Column.HeaderStyle = FindResource("ModernDataGridColumnHeaderStyle") as Style;
            if (e.Column is DataGridBoundColumn boundColumn)
            {
                boundColumn.ElementStyle = FindResource("ModernDataGridCellStyle") as Style;
            }

            // Raise event for custom handling
            AutoGeneratingColumn?.Invoke(this, e);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error auto-generating column: {PropertyName}", e.PropertyName);
        }
    }

    #endregion

    #region Public Methods

    /// <summary>
    /// Set loading state with optional text
    /// </summary>
    public void SetLoading(bool isLoading, string loadingText = null)
    {
        IsLoading = isLoading;
        if (!string.IsNullOrEmpty(loadingText))
        {
            LoadingText = loadingText;
        }
        
        if (!isLoading)
        {
            UpdateEmptyState();
        }
    }

    /// <summary>
    /// Set error state
    /// </summary>
    public void SetError(bool hasError, string errorMessage = null)
    {
        HasError = hasError;
        if (!string.IsNullOrEmpty(errorMessage))
        {
            ErrorMessage = errorMessage;
        }
    }

    /// <summary>
    /// Clear error state
    /// </summary>
    public void ClearError()
    {
        HasError = false;
        ErrorMessage = string.Empty;
    }

    /// <summary>
    /// Refresh the data grid
    /// </summary>
    public void Refresh()
    {
        MainDataGrid.Items.Refresh();
        UpdateEmptyState();
    }

    /// <summary>
    /// Export to clipboard as tab-separated values
    /// </summary>
    public void ExportToClipboard()
    {
        try
        {
            if (MainDataGrid.SelectedItems.Count == 0) return;

            var data = new List<string>();
            
            // Add headers
            var headers = MainDataGrid.Columns.Select(c => c.Header?.ToString() ?? "").ToList();
            data.Add(string.Join("\t", headers));

            // Add selected rows
            foreach (var item in MainDataGrid.SelectedItems)
            {
                var values = new List<string>();
                foreach (var column in MainDataGrid.Columns)
                {
                    if (column is DataGridBoundColumn boundColumn && boundColumn.Binding is Binding binding)
                    {
                        var value = GetPropertyValue(item, binding.Path.Path);
                        values.Add(value?.ToString() ?? "");
                    }
                    else
                    {
                        values.Add("");
                    }
                }
                data.Add(string.Join("\t", values));
            }

            Clipboard.SetText(string.Join(Environment.NewLine, data));
            
            _logger.LogInformation("Exported {Count} rows to clipboard", MainDataGrid.SelectedItems.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export to clipboard");
        }
    }

    #endregion

    #region Private Methods

    private void UpdateItemsSource()
    {
        try
        {
            MainDataGrid.AutoGenerateColumns = AutoGenerateColumns;
            
            if (ItemsSource != null && ItemsSource is INotifyCollectionChanged notifyCollection)
            {
                notifyCollection.CollectionChanged += OnItemsSourceCollectionChanged;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error updating items source");
        }
    }

    private void OnItemsSourceCollectionChanged(object sender, NotifyCollectionChangedEventArgs e)
    {
        UpdateEmptyState();
    }

    private void UpdateEmptyState()
    {
        var hasItems = ItemsSource?.Cast<object>().Any() == true;
        ShowEmptyState = !IsLoading && !HasError && !hasItems;
    }

    private void UpdateSelectionInfo()
    {
        var selectedCount = MainDataGrid.SelectedItems.Count;
        var totalCount = MainDataGrid.Items.Count;

        if (selectedCount > 0)
        {
            SelectionInfo = $"{selectedCount} of {totalCount} items selected";
            ShowSelectionInfo = true;
        }
        else
        {
            SelectionInfo = string.Empty;
            ShowSelectionInfo = false;
        }
    }

    private object GetPropertyValue(object obj, string propertyPath)
    {
        try
        {
            var properties = propertyPath.Split('.');
            var current = obj;

            foreach (var property in properties)
            {
                if (current == null) return null;
                
                var propertyInfo = current.GetType().GetProperty(property);
                current = propertyInfo?.GetValue(current);
            }

            return current;
        }
        catch
        {
            return null;
        }
    }

    #endregion

    #region Command Implementations

    private void ExecuteCopy()
    {
        ExportToClipboard();
    }

    private bool CanExecuteCopy()
    {
        return MainDataGrid.SelectedItems.Count > 0;
    }

    private void ExecuteSelectAll()
    {
        MainDataGrid.SelectAll();
    }

    private bool CanExecuteSelectAll()
    {
        return MainDataGrid.Items.Count > 0;
    }

    private void ExecuteClearSelection()
    {
        MainDataGrid.UnselectAll();
    }

    private bool CanExecuteClearSelection()
    {
        return MainDataGrid.SelectedItems.Count > 0;
    }

    #endregion

    #region Events

    public event EventHandler<SelectionChangedEventArgs> SelectionChanged;
    public event EventHandler<DataGridSortingEventArgs> Sorting;
    public event EventHandler<DataGridAutoGeneratingColumnEventArgs> AutoGeneratingColumn;

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