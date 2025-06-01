using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;
using InvoiceApp.Core.Interfaces.Services;
using InvoiceApp.WPF.Helpers;
using InvoiceApp.WPF.ViewModels;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.WPF.Views.TkaWorkers
{
    /// <summary>
    /// Modern TKA Workers List with card/table view and smart search
    /// </summary>
    public partial class TkaListView : UserControl
    {
        private readonly TkaListViewModel _viewModel;
        private readonly AnimationHelper _animationHelper;

        public TkaListView()
        {
            InitializeComponent();
            
            _viewModel = App.ServiceProvider.GetRequiredService<TkaListViewModel>();
            _animationHelper = new AnimationHelper();
            
            DataContext = _viewModel;
            
            InitializePerformanceFeatures();
            Loaded += OnViewLoaded;
        }

        private void InitializePerformanceFeatures()
        {
            // Enable hardware acceleration
            RenderOptions.SetBitmapScalingMode(this, BitmapScalingMode.HighQuality);
            
            // Optimize virtualization
            VirtualizingPanel.SetIsVirtualizing(this, true);
            VirtualizingPanel.SetVirtualizationMode(this, VirtualizationMode.Recycling);
            
            // Setup search with delay
            SearchBox.TextChanged += OnSearchTextChanged;
        }

        private async void OnViewLoaded(object sender, RoutedEventArgs e)
        {
            await _animationHelper.FadeInAsync(this);
            await _viewModel.LoadDataAsync();
        }

        private System.Windows.Threading.DispatcherTimer _searchTimer;
        private void OnSearchTextChanged(object sender, TextChangedEventArgs e)
        {
            // Debounce search for performance
            _searchTimer?.Stop();
            _searchTimer = new System.Windows.Threading.DispatcherTimer
            {
                Interval = TimeSpan.FromMilliseconds(300)
            };
            _searchTimer.Tick += (s, args) =>
            {
                _searchTimer.Stop();
                _viewModel.SearchCommand.Execute(null);
            };
            _searchTimer.Start();
        }

        public void Dispose()
        {
            _searchTimer?.Stop();
            _viewModel?.Dispose();
        }
    }
}

/// <summary>
/// ViewModel for TKA Workers List with advanced filtering and pagination
/// </summary>
public class TkaListViewModel : BaseViewModel, IDisposable
{
    private readonly ITkaWorkerService _tkaWorkerService;
    private readonly ICompanyService _companyService;
    private readonly INavigationService _navigationService;
    private readonly IDialogService _dialogService;
    private readonly INotificationService _notificationService;
    private readonly ICachingService _cachingService;
    private readonly ISearchService _searchService;

    // Collections
    private ObservableCollection<TkaWorkerDto> _tkaWorkers;
    private ObservableCollection<TkaWorkerDto> _filteredTkaWorkers;
    private ObservableCollection<string> _divisions;
    private ObservableCollection<string> _genders;
    private ObservableCollection<string> _statusOptions;

    // State properties
    private bool _isLoading;
    private string _loadingMessage;
    private bool _isEmpty;
    private bool _isCardView = true;
    private TkaWorkerDto _selectedTkaWorker;

    // Search and filters
    private string _searchTerm;
    private string _selectedDivision;
    private string _selectedGender;
    private string _selectedStatus;

    // Pagination
    private int _currentPage = 1;
    private int _pageSize = 20;
    private int _totalCount;
    private int _totalPages;

    // Statistics
    private int _activeCount;
    private int _inactiveCount;

    public TkaListViewModel(
        ITkaWorkerService tkaWorkerService,
        ICompanyService companyService,
        INavigationService navigationService,
        IDialogService dialogService,
        INotificationService notificationService,
        ICachingService cachingService,
        ISearchService searchService)
    {
        _tkaWorkerService = tkaWorkerService;
        _companyService = companyService;
        _navigationService = navigationService;
        _dialogService = dialogService;
        _notificationService = notificationService;
        _cachingService = cachingService;
        _searchService = searchService;

        InitializeCommands();
        InitializeCollections();
        LoadUserPreferences();
    }

    #region Properties

    public ObservableCollection<TkaWorkerDto> TkaWorkers
    {
        get => _filteredTkaWorkers ?? _tkaWorkers;
        set => SetProperty(ref _tkaWorkers, value);
    }

    public TkaWorkerDto SelectedTkaWorker
    {
        get => _selectedTkaWorker;
        set => SetProperty(ref _selectedTkaWorker, value);
    }

    public ObservableCollection<string> Divisions
    {
        get => _divisions;
        set => SetProperty(ref _divisions, value);
    }

    public ObservableCollection<string> Genders
    {
        get => _genders;
        set => SetProperty(ref _genders, value);
    }

    public ObservableCollection<string> StatusOptions
    {
        get => _statusOptions;
        set => SetProperty(ref _statusOptions, value);
    }

    public bool IsLoading
    {
        get => _isLoading;
        set => SetProperty(ref _isLoading, value);
    }

    public string LoadingMessage
    {
        get => _loadingMessage;
        set => SetProperty(ref _loadingMessage, value);
    }

    public bool IsEmpty
    {
        get => _isEmpty;
        set => SetProperty(ref _isEmpty, value);
    }

    public bool IsCardView
    {
        get => _isCardView;
        set => SetProperty(ref _isCardView, value);
    }

    public bool IsTableView => !IsCardView;

    // Search and Filter Properties
    public string SearchTerm
    {
        get => _searchTerm;
        set => SetProperty(ref _searchTerm, value);
    }

    public string SelectedDivision
    {
        get => _selectedDivision;
        set
        {
            SetProperty(ref _selectedDivision, value);
            ApplyFilters();
        }
    }

    public string SelectedGender
    {
        get => _selectedGender;
        set
        {
            SetProperty(ref _selectedGender, value);
            ApplyFilters();
        }
    }

    public string SelectedStatus
    {
        get => _selectedStatus;
        set
        {
            SetProperty(ref _selectedStatus, value);
            ApplyFilters();
        }
    }

    // Pagination Properties
    public int CurrentPage
    {
        get => _currentPage;
        set => SetProperty(ref _currentPage, value);
    }

    public int TotalCount
    {
        get => _totalCount;
        set => SetProperty(ref _totalCount, value);
    }

    public int TotalPages
    {
        get => _totalPages;
        set => SetProperty(ref _totalPages, value);
    }

    public string PageDisplay => $"Page {CurrentPage} of {TotalPages}";

    // Statistics Properties
    public int ActiveCount
    {
        get => _activeCount;
        set => SetProperty(ref _activeCount, value);
    }

    public int InactiveCount
    {
        get => _inactiveCount;
        set => SetProperty(ref _inactiveCount, value);
    }

    // UI Helper Properties
    public string ViewModeIcon => IsCardView ? "ViewList" : "ViewGrid";
    public string ViewModeTooltip => IsCardView ? "Switch to Table View" : "Switch to Card View";
    public bool HasPagination => TotalPages > 1;
    public bool CanGoPrevious => CurrentPage > 1;
    public bool CanGoNext => CurrentPage < TotalPages;

    #endregion

    #region Commands

    public ICommand AddTkaCommand { get; private set; }
    public ICommand EditTkaCommand { get; private set; }
    public ICommand ViewTkaCommand { get; private set; }
    public ICommand DeleteTkaCommand { get; private set; }
    public ICommand DeactivateTkaCommand { get; private set; }
    public ICommand AssignCompanyCommand { get; private set; }
    public ICommand AddFamilyCommand { get; private set; }
    public ICommand ImportTkaCommand { get; private set; }
    public ICommand SearchCommand { get; private set; }
    public ICommand ClearFiltersCommand { get; private set; }
    public ICommand RefreshCommand { get; private set; }
    public ICommand ToggleViewModeCommand { get; private set; }
    public ICommand PreviousPageCommand { get; private set; }
    public ICommand NextPageCommand { get; private set; }

    private void InitializeCommands()
    {
        AddTkaCommand = new AsyncRelayCommand(AddTkaAsync);
        EditTkaCommand = new AsyncRelayCommand<TkaWorkerDto>(EditTkaAsync);
        ViewTkaCommand = new AsyncRelayCommand<TkaWorkerDto>(ViewTkaAsync);
        DeleteTkaCommand = new AsyncRelayCommand<TkaWorkerDto>(DeleteTkaAsync);
        DeactivateTkaCommand = new AsyncRelayCommand<TkaWorkerDto>(DeactivateTkaAsync);
        AssignCompanyCommand = new AsyncRelayCommand<TkaWorkerDto>(AssignCompanyAsync);
        AddFamilyCommand = new AsyncRelayCommand<TkaWorkerDto>(AddFamilyAsync);
        ImportTkaCommand = new AsyncRelayCommand(ImportTkaAsync);
        SearchCommand = new AsyncRelayCommand(SearchAsync);
        ClearFiltersCommand = new RelayCommand(ClearFilters);
        RefreshCommand = new AsyncRelayCommand(RefreshAsync);
        ToggleViewModeCommand = new RelayCommand(ToggleViewMode);
        PreviousPageCommand = new AsyncRelayCommand(PreviousPageAsync, () => CanGoPrevious);
        NextPageCommand = new AsyncRelayCommand(NextPageAsync, () => CanGoNext);
    }

    #endregion

    #region Initialization

    private void InitializeCollections()
    {
        TkaWorkers = new ObservableCollection<TkaWorkerDto>();
        Divisions = new ObservableCollection<string>();
        Genders = new ObservableCollection<string> { "All", "Laki-laki", "Perempuan" };
        StatusOptions = new ObservableCollection<string> { "All", "Active", "Inactive" };
    }

    private void LoadUserPreferences()
    {
        var preferences = _cachingService.Get<UserPreferences>("tka_list_preferences");
        if (preferences != null)
        {
            IsCardView = preferences.IsCardView;
            _pageSize = preferences.PageSize;
            SelectedDivision = preferences.SelectedDivision;
            SelectedGender = preferences.SelectedGender;
            SelectedStatus = preferences.SelectedStatus;
        }
    }

    public async Task LoadDataAsync()
    {
        IsLoading = true;
        LoadingMessage = "Loading TKA workers...";

        try
        {
            // Load data with caching for performance
            var cacheKey = $"tka_workers_page_{CurrentPage}_{_pageSize}";
            var cachedData = await _cachingService.GetAsync<PagedResult<TkaWorkerDto>>(cacheKey);

            PagedResult<TkaWorkerDto> result;
            if (cachedData != null && !ShouldRefreshCache())
            {
                result = cachedData;
            }
            else
            {
                result = await _tkaWorkerService.GetPagedAsync(CurrentPage, _pageSize);
                await _cachingService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(10));
            }

            TkaWorkers.Clear();
            foreach (var tka in result.Items)
            {
                // Enhance TKA data with additional properties
                EnhanceTkaData(tka);
                TkaWorkers.Add(tka);
            }

            TotalCount = result.TotalCount;
            TotalPages = result.TotalPages;
            
            // Load divisions for filter
            await LoadDivisionsAsync();
            
            // Update statistics
            UpdateStatistics();
            
            // Apply any existing filters
            ApplyFilters();

            IsEmpty = !TkaWorkers.Any();
        }
        catch (Exception ex)
        {
            await _notificationService.ShowErrorAsync("Error", $"Failed to load TKA workers: {ex.Message}");
        }
        finally
        {
            IsLoading = false;
        }
    }

    private void EnhanceTkaData(TkaWorkerDto tka)
    {
        // Add computed properties
        tka.InitialName = GetInitials(tka.Nama);
        tka.StatusText = tka.IsActive ? "Active" : "Inactive";
        tka.HasCompanyAssignments = tka.CompanyAssignments?.Any() == true;
        tka.HasFamilyMembers = tka.FamilyMemberCount > 0;
    }

    private string GetInitials(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "??";
        
        var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length >= 2 
            ? $"{parts[0][0]}{parts[1][0]}".ToUpper()
            : $"{parts[0][0]}".ToUpper();
    }

    private async Task LoadDivisionsAsync()
    {
        var divisions = await _tkaWorkerService.GetDistinctDivisionsAsync();
        Divisions.Clear();
        Divisions.Add("All");
        foreach (var division in divisions)
        {
            Divisions.Add(division);
        }
    }

    private bool ShouldRefreshCache()
    {
        var lastRefresh = _cachingService.Get<DateTime>("tka_last_refresh");
        return lastRefresh == default || DateTime.Now - lastRefresh > TimeSpan.FromMinutes(5);
    }

    #endregion

    #region Search and Filtering

    private async Task SearchAsync()
    {
        if (string.IsNullOrWhiteSpace(SearchTerm))
        {
            ApplyFilters();
            return;
        }

        IsLoading = true;
        LoadingMessage = "Searching...";

        try
        {
            // Use smart search service for intelligent matching
            var searchResults = await _searchService.SearchTkaWorkersAsync(SearchTerm);
            
            _filteredTkaWorkers = new ObservableCollection<TkaWorkerDto>(searchResults);
            OnPropertyChanged(nameof(TkaWorkers));
            
            UpdateStatistics();
            IsEmpty = !_filteredTkaWorkers.Any();
        }
        catch (Exception ex)
        {
            await _notificationService.ShowErrorAsync("Search Error", $"Search failed: {ex.Message}");
        }
        finally
        {
            IsLoading = false;
        }
    }

    private void ApplyFilters()
    {
        var filtered = _tkaWorkers.AsEnumerable();

        // Apply division filter
        if (!string.IsNullOrEmpty(SelectedDivision) && SelectedDivision != "All")
        {
            filtered = filtered.Where(t => t.Divisi == SelectedDivision);
        }

        // Apply gender filter
        if (!string.IsNullOrEmpty(SelectedGender) && SelectedGender != "All")
        {
            filtered = filtered.Where(t => t.JenisKelamin == SelectedGender);
        }

        // Apply status filter
        if (!string.IsNullOrEmpty(SelectedStatus) && SelectedStatus != "All")
        {
            var isActive = SelectedStatus == "Active";
            filtered = filtered.Where(t => t.IsActive == isActive);
        }

        _filteredTkaWorkers = new ObservableCollection<TkaWorkerDto>(filtered);
        OnPropertyChanged(nameof(TkaWorkers));
        
        UpdateStatistics();
        IsEmpty = !_filteredTkaWorkers.Any();
    }

    private void ClearFilters()
    {
        SearchTerm = string.Empty;
        SelectedDivision = "All";
        SelectedGender = "All";
        SelectedStatus = "All";
        
        _filteredTkaWorkers = null;
        OnPropertyChanged(nameof(TkaWorkers));
        
        UpdateStatistics();
        IsEmpty = !_tkaWorkers.Any();
    }

    #endregion

    #region Actions

    private async Task AddTkaAsync()
    {
        await _navigationService.NavigateToAsync("TkaCreate");
    }

    private async Task EditTkaAsync(TkaWorkerDto tka)
    {
        if (tka == null) return;
        await _navigationService.NavigateToAsync("TkaEdit", tka.Id);
    }

    private async Task ViewTkaAsync(TkaWorkerDto tka)
    {
        if (tka == null) return;
        await _navigationService.NavigateToAsync("TkaDetail", tka.Id);
    }

    private async Task DeleteTkaAsync(TkaWorkerDto tka)
    {
        if (tka == null) return;

        var result = await _dialogService.ShowConfirmationAsync(
            "Delete TKA Worker",
            $"Are you sure you want to delete {tka.Nama}? This action cannot be undone.",
            "Delete");

        if (result)
        {
            try
            {
                await _tkaWorkerService.DeleteAsync(tka.Id);
                TkaWorkers.Remove(tka);
                
                await _notificationService.ShowSuccessAsync("Success", "TKA worker deleted successfully.");
                await RefreshAsync();
            }
            catch (Exception ex)
            {
                await _notificationService.ShowErrorAsync("Error", $"Failed to delete TKA worker: {ex.Message}");
            }
        }
    }

    private async Task DeactivateTkaAsync(TkaWorkerDto tka)
    {
        if (tka == null) return;

        var action = tka.IsActive ? "deactivate" : "activate";
        var result = await _dialogService.ShowConfirmationAsync(
            $"{action.Substring(0, 1).ToUpper()}{action.Substring(1)} TKA Worker",
            $"Are you sure you want to {action} {tka.Nama}?",
            action.Substring(0, 1).ToUpper() + action.Substring(1));

        if (result)
        {
            try
            {
                tka.IsActive = !tka.IsActive;
                await _tkaWorkerService.UpdateAsync(tka);
                
                EnhanceTkaData(tka);
                UpdateStatistics();
                
                await _notificationService.ShowSuccessAsync("Success", $"TKA worker {action}d successfully.");
            }
            catch (Exception ex)
            {
                tka.IsActive = !tka.IsActive; // Revert on error
                await _notificationService.ShowErrorAsync("Error", $"Failed to {action} TKA worker: {ex.Message}");
            }
        }
    }

    private async Task AssignCompanyAsync(TkaWorkerDto tka)
    {
        if (tka == null) return;
        await _dialogService.ShowTkaCompanyAssignmentDialogAsync(tka.Id);
    }

    private async Task AddFamilyAsync(TkaWorkerDto tka)
    {
        if (tka == null) return;
        await _navigationService.NavigateToAsync("FamilyMemberCreate", tka.Id);
    }

    private async Task ImportTkaAsync()
    {
        await _navigationService.NavigateToAsync("TkaImport");
    }

    #endregion

    #region Pagination

    private async Task PreviousPageAsync()
    {
        if (CanGoPrevious)
        {
            CurrentPage--;
            await LoadDataAsync();
        }
    }

    private async Task NextPageAsync()
    {
        if (CanGoNext)
        {
            CurrentPage++;
            await LoadDataAsync();
        }
    }

    #endregion

    #region Helpers

    private async Task RefreshAsync()
    {
        // Clear cache and reload
        await _cachingService.RemoveByPatternAsync("tka_workers_*");
        await LoadDataAsync();
    }

    private void ToggleViewMode()
    {
        IsCardView = !IsCardView;
        OnPropertyChanged(nameof(IsTableView));
        OnPropertyChanged(nameof(ViewModeIcon));
        OnPropertyChanged(nameof(ViewModeTooltip));
        
        SaveUserPreferences();
    }

    private void UpdateStatistics()
    {
        var currentTkaWorkers = TkaWorkers;
        TotalCount = currentTkaWorkers.Count;
        ActiveCount = currentTkaWorkers.Count(t => t.IsActive);
        InactiveCount = currentTkaWorkers.Count(t => !t.IsActive);
    }

    private void SaveUserPreferences()
    {
        var preferences = new UserPreferences
        {
            IsCardView = IsCardView,
            PageSize = _pageSize,
            SelectedDivision = SelectedDivision,
            SelectedGender = SelectedGender,
            SelectedStatus = SelectedStatus
        };

        _cachingService.Set("tka_list_preferences", preferences);
    }

    #endregion

    public void Dispose()
    {
        SaveUserPreferences();
        TkaWorkers?.Clear();
        _filteredTkaWorkers?.Clear();
    }
}

/// <summary>
/// Enhanced TKA Worker DTO with UI-specific properties
/// </summary>
public class TkaWorkerDto : BaseTkaWorkerDto
{
    public string InitialName { get; set; }
    public string StatusText { get; set; }
    public bool HasCompanyAssignments { get; set; }
    public bool HasFamilyMembers { get; set; }
    public ObservableCollection<CompanyAssignmentDto> CompanyAssignments { get; set; }
    public int FamilyMemberCount { get; set; }
}

/// <summary>
/// User preferences for TKA list view
/// </summary>
public class UserPreferences
{
    public bool IsCardView { get; set; } = true;
    public int PageSize { get; set; } = 20;
    public string SelectedDivision { get; set; } = "All";
    public string SelectedGender { get; set; } = "All";
    public string SelectedStatus { get; set; } = "All";
}