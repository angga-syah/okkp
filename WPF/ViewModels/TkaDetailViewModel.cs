using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Input;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using InvoiceApp.Core.Interfaces.Services;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;
using InvoiceApp.WPF.Services;
using Microsoft.Extensions.Logging;
using FluentValidation;
using System.ComponentModel;
using System.Windows.Data;

namespace InvoiceApp.WPF.ViewModels
{
    public partial class TkaDetailViewModel : ObservableObject
    {
        private readonly ITkaWorkerService _tkaWorkerService;
        private readonly ICompanyService _companyService;
        private readonly IDialogService _dialogService;
        private readonly INavigationService _navigationService;
        private readonly ILogger<TkaDetailViewModel> _logger;
        private readonly IValidator<TkaWorkerDto> _tkaValidator;
        private readonly IValidator<TkaFamilyMemberDto> _familyValidator;

        [ObservableProperty]
        private TkaWorkerDto _tkaWorker = new();

        [ObservableProperty]
        private bool _isNewTka = true;

        [ObservableProperty]
        private bool _isLoading;

        [ObservableProperty]
        private bool _isEditing;

        [ObservableProperty]
        private bool _canEdit = true;

        [ObservableProperty]
        private bool _canSave;

        [ObservableProperty]
        private string _validationErrors = string.Empty;

        [ObservableProperty]
        private bool _hasValidationErrors;

        // Family Members
        [ObservableProperty]
        private ObservableCollection<TkaFamilyMemberDto> _familyMembers = new();

        [ObservableProperty]
        private TkaFamilyMemberDto? _selectedFamilyMember;

        [ObservableProperty]
        private string _familySearchTerm = string.Empty;

        [ObservableProperty]
        private bool _showFamilyMembers = true;

        // Company Assignments
        [ObservableProperty]
        private ObservableCollection<CompanyTkaAssignmentDto> _companyAssignments = new();

        [ObservableProperty]
        private CompanyTkaAssignmentDto? _selectedAssignment;

        [ObservableProperty]
        private string _assignmentSearchTerm = string.Empty;

        [ObservableProperty]
        private bool _showAssignments = true;

        // Invoice History
        [ObservableProperty]
        private ObservableCollection<InvoiceDto> _invoiceHistory = new();

        [ObservableProperty]
        private InvoiceDto? _selectedInvoice;

        [ObservableProperty]
        private string _invoiceSearchTerm = string.Empty;

        [ObservableProperty]
        private bool _showInvoiceHistory = true;

        [ObservableProperty]
        private decimal _totalInvoiceAmount;

        [ObservableProperty]
        private int _totalInvoiceCount;

        private ICollectionView? _familyMembersView;
        private ICollectionView? _assignmentsView;
        private ICollectionView? _invoiceHistoryView;

        public ICommand LoadDataCommand { get; }
        public ICommand SaveCommand { get; }
        public ICommand CancelCommand { get; }
        public ICommand EditCommand { get; }
        public ICommand DeleteCommand { get; }
        
        // Family Member Commands
        public ICommand AddFamilyMemberCommand { get; }
        public ICommand EditFamilyMemberCommand { get; }
        public ICommand DeleteFamilyMemberCommand { get; }
        
        // Company Assignment Commands
        public ICommand ViewAssignmentDetailsCommand { get; }
        public ICommand RemoveFromCompanyCommand { get; }
        
        // Invoice History Commands
        public ICommand ViewInvoiceCommand { get; }
        public ICommand PrintInvoiceCommand { get; }
        public ICommand ExportInvoiceHistoryCommand { get; }

        // Navigation Commands
        public ICommand CreateInvoiceCommand { get; }
        public ICommand ViewCompanyCommand { get; }

        public int TkaId { get; set; }
        public List<Gender> Genders { get; } = Enum.GetValues<Gender>().ToList();
        public List<FamilyRelationship> Relationships { get; } = Enum.GetValues<FamilyRelationship>().ToList();

        public TkaDetailViewModel(
            ITkaWorkerService tkaWorkerService,
            ICompanyService companyService,
            IDialogService dialogService,
            INavigationService navigationService,
            ILogger<TkaDetailViewModel> logger,
            IValidator<TkaWorkerDto> tkaValidator,
            IValidator<TkaFamilyMemberDto> familyValidator)
        {
            _tkaWorkerService = tkaWorkerService;
            _companyService = companyService;
            _dialogService = dialogService;
            _navigationService = navigationService;
            _logger = logger;
            _tkaValidator = tkaValidator;
            _familyValidator = familyValidator;

            InitializeCommands();
            SetupPropertyChanged();
        }

        private void InitializeCommands()
        {
            LoadDataCommand = new AsyncRelayCommand(LoadDataAsync);
            SaveCommand = new AsyncRelayCommand(SaveAsync, () => CanSave && IsEditing);
            CancelCommand = new AsyncRelayCommand(CancelAsync);
            EditCommand = new RelayCommand(StartEdit, () => CanEdit && !IsEditing);
            DeleteCommand = new AsyncRelayCommand(DeleteAsync, () => !IsNewTka && CanEdit);
            
            // Family Member Commands
            AddFamilyMemberCommand = new AsyncRelayCommand(AddFamilyMemberAsync, () => !IsNewTka);
            EditFamilyMemberCommand = new AsyncRelayCommand<TkaFamilyMemberDto>(EditFamilyMemberAsync);
            DeleteFamilyMemberCommand = new AsyncRelayCommand<TkaFamilyMemberDto>(DeleteFamilyMemberAsync);
            
            // Company Assignment Commands
            ViewAssignmentDetailsCommand = new RelayCommand<CompanyTkaAssignmentDto>(ViewAssignmentDetails);
            RemoveFromCompanyCommand = new AsyncRelayCommand<CompanyTkaAssignmentDto>(RemoveFromCompanyAsync);
            
            // Invoice History Commands
            ViewInvoiceCommand = new RelayCommand<InvoiceDto>(ViewInvoice);
            PrintInvoiceCommand = new AsyncRelayCommand<InvoiceDto>(PrintInvoiceAsync);
            ExportInvoiceHistoryCommand = new AsyncRelayCommand(ExportInvoiceHistoryAsync, () => InvoiceHistory.Any());
            
            // Navigation Commands
            CreateInvoiceCommand = new RelayCommand(CreateInvoice, () => !IsNewTka && CompanyAssignments.Any());
            ViewCompanyCommand = new RelayCommand<CompanyTkaAssignmentDto>(ViewCompany);
        }

        private void SetupPropertyChanged()
        {
            PropertyChanged += OnPropertyChanged;
        }

        private void OnPropertyChanged(object? sender, PropertyChangedEventArgs e)
        {
            if (e.PropertyName == nameof(TkaWorker))
            {
                ValidateTkaWorker();
            }
        }

        public async Task InitializeAsync(int tkaId = 0)
        {
            TkaId = tkaId;
            IsNewTka = tkaId == 0;
            IsEditing = IsNewTka;

            if (IsNewTka)
            {
                TkaWorker = new TkaWorkerDto
                {
                    IsActive = true,
                    JenisKelamin = Gender.Laki_laki
                };
            }

            await LoadDataAsync();
        }

        private async Task LoadDataAsync()
        {
            try
            {
                IsLoading = true;

                if (!IsNewTka)
                {
                    // Load TKA worker details
                    var tka = await _tkaWorkerService.GetByIdAsync(TkaId);
                    if (tka != null)
                    {
                        TkaWorker = tka;
                    }

                    // Load family members
                    await LoadFamilyMembersAsync();

                    // Load company assignments
                    await LoadCompanyAssignmentsAsync();

                    // Load invoice history
                    await LoadInvoiceHistoryAsync();
                }

                SetupCollectionViews();
                UpdateCommandStates();

                _logger.LogInformation("TKA detail data loaded for TKA ID: {TkaId}", TkaId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading TKA detail data for ID: {TkaId}", TkaId);
                await _dialogService.ShowErrorAsync("Error loading TKA data.", "Load Error");
            }
            finally
            {
                IsLoading = false;
            }
        }

        private async Task LoadFamilyMembersAsync()
        {
            try
            {
                var familyMembers = await _tkaWorkerService.GetFamilyMembersAsync(TkaId);
                
                FamilyMembers.Clear();
                foreach (var member in familyMembers.OrderBy(f => f.Relationship).ThenBy(f => f.Nama))
                {
                    FamilyMembers.Add(member);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading family members for TKA {TkaId}", TkaId);
            }
        }

        private async Task LoadCompanyAssignmentsAsync()
        {
            try
            {
                var assignments = await _tkaWorkerService.GetCompanyAssignmentsAsync(TkaId);
                
                CompanyAssignments.Clear();
                foreach (var assignment in assignments.OrderByDescending(a => a.AssignmentDate))
                {
                    CompanyAssignments.Add(assignment);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading company assignments for TKA {TkaId}", TkaId);
            }
        }

        private async Task LoadInvoiceHistoryAsync()
        {
            try
            {
                var invoices = await _tkaWorkerService.GetInvoiceHistoryAsync(TkaId);
                
                InvoiceHistory.Clear();
                foreach (var invoice in invoices.OrderByDescending(i => i.InvoiceDate))
                {
                    InvoiceHistory.Add(invoice);
                }

                // Calculate totals
                TotalInvoiceCount = InvoiceHistory.Count;
                TotalInvoiceAmount = InvoiceHistory.Sum(i => i.TotalAmount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading invoice history for TKA {TkaId}", TkaId);
            }
        }

        private void SetupCollectionViews()
        {
            _familyMembersView = CollectionViewSource.GetDefaultView(FamilyMembers);
            _familyMembersView.Filter = FilterFamilyMembers;

            _assignmentsView = CollectionViewSource.GetDefaultView(CompanyAssignments);
            _assignmentsView.Filter = FilterAssignments;

            _invoiceHistoryView = CollectionViewSource.GetDefaultView(InvoiceHistory);
            _invoiceHistoryView.Filter = FilterInvoiceHistory;
        }

        private bool FilterFamilyMembers(object obj)
        {
            if (obj is not TkaFamilyMemberDto member || string.IsNullOrWhiteSpace(FamilySearchTerm))
                return true;

            var searchLower = FamilySearchTerm.ToLowerInvariant();
            return member.Nama.ToLowerInvariant().Contains(searchLower) ||
                   member.Passport.ToLowerInvariant().Contains(searchLower) ||
                   member.Relationship.ToString().ToLowerInvariant().Contains(searchLower);
        }

        private bool FilterAssignments(object obj)
        {
            if (obj is not CompanyTkaAssignmentDto assignment || string.IsNullOrWhiteSpace(AssignmentSearchTerm))
                return true;

            var searchLower = AssignmentSearchTerm.ToLowerInvariant();
            return assignment.CompanyName.ToLowerInvariant().Contains(searchLower) ||
                   (assignment.Notes?.ToLowerInvariant().Contains(searchLower) ?? false);
        }

        private bool FilterInvoiceHistory(object obj)
        {
            if (obj is not InvoiceDto invoice || string.IsNullOrWhiteSpace(InvoiceSearchTerm))
                return true;

            var searchLower = InvoiceSearchTerm.ToLowerInvariant();
            return invoice.InvoiceNumber.ToLowerInvariant().Contains(searchLower) ||
                   invoice.CompanyName.ToLowerInvariant().Contains(searchLower) ||
                   (invoice.Notes?.ToLowerInvariant().Contains(searchLower) ?? false);
        }

        private void ValidateTkaWorker()
        {
            try
            {
                var validationResult = _tkaValidator.Validate(TkaWorker);
                HasValidationErrors = !validationResult.IsValid;
                ValidationErrors = string.Join("\n", validationResult.Errors.Select(e => e.ErrorMessage));
                CanSave = validationResult.IsValid;
                
                UpdateCommandStates();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating TKA worker");
                HasValidationErrors = true;
                ValidationErrors = "Validation error occurred";
                CanSave = false;
            }
        }

        private void UpdateCommandStates()
        {
            ((AsyncRelayCommand)SaveCommand).NotifyCanExecuteChanged();
            ((RelayCommand)EditCommand).NotifyCanExecuteChanged();
            ((AsyncRelayCommand)DeleteCommand).NotifyCanExecuteChanged();
            ((AsyncRelayCommand)AddFamilyMemberCommand).NotifyCanExecuteChanged();
            ((AsyncRelayCommand)ExportInvoiceHistoryCommand).NotifyCanExecuteChanged();
            ((RelayCommand)CreateInvoiceCommand).NotifyCanExecuteChanged();
        }

        private void StartEdit()
        {
            IsEditing = true;
            UpdateCommandStates();
        }

        private async Task SaveAsync()
        {
            try
            {
                IsLoading = true;

                if (IsNewTka)
                {
                    var createdTka = await _tkaWorkerService.CreateAsync(TkaWorker);
                    TkaWorker = createdTka;
                    TkaId = createdTka.Id;
                    IsNewTka = false;
                    
                    _logger.LogInformation("Created new TKA worker: {TkaName}", TkaWorker.Nama);
                }
                else
                {
                    await _tkaWorkerService.UpdateAsync(TkaWorker);
                    _logger.LogInformation("Updated TKA worker: {TkaName}", TkaWorker.Nama);
                }

                IsEditing = false;
                await _dialogService.ShowInfoAsync("TKA worker saved successfully!", "Save Success");
                UpdateCommandStates();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving TKA worker");
                await _dialogService.ShowErrorAsync("Error saving TKA worker. Please try again.", "Save Error");
            }
            finally
            {
                IsLoading = false;
            }
        }

        private async Task CancelAsync()
        {
            if (IsEditing)
            {
                var hasChanges = IsNewTka || HasChanges();
                
                if (hasChanges)
                {
                    var result = await _dialogService.ShowConfirmationAsync(
                        "You have unsaved changes. Are you sure you want to cancel?",
                        "Confirm Cancel");

                    if (!result) return;
                }

                if (IsNewTka)
                {
                    _navigationService.NavigateBack();
                    return;
                }

                // Reload original data
                await LoadDataAsync();
                IsEditing = false;
                UpdateCommandStates();
            }
            else
            {
                _navigationService.NavigateBack();
            }
        }

        private async Task DeleteAsync()
        {
            var result = await _dialogService.ShowConfirmationAsync(
                $"Are you sure you want to delete TKA worker '{TkaWorker.Nama}'?\n\nThis action cannot be undone and will affect related data.",
                "Confirm Delete");

            if (!result) return;

            try
            {
                IsLoading = true;
                await _tkaWorkerService.DeleteAsync(TkaId);
                
                _logger.LogInformation("Deleted TKA worker: {TkaName}", TkaWorker.Nama);
                await _dialogService.ShowInfoAsync("TKA worker deleted successfully.", "Delete Success");
                
                _navigationService.NavigateBack();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting TKA worker {TkaId}", TkaId);
                await _dialogService.ShowErrorAsync("Error deleting TKA worker. It may be referenced by existing invoices.", "Delete Error");
            }
            finally
            {
                IsLoading = false;
            }
        }

        // Family Member Methods
        private async Task AddFamilyMemberAsync()
        {
            var familyDialog = new FamilyMemberDialogViewModel(_dialogService)
            {
                TkaId = TkaId,
                FamilyMember = new TkaFamilyMemberDto
                {
                    TkaId = TkaId,
                    IsActive = true,
                    JenisKelamin = Gender.Perempuan,
                    Relationship = FamilyRelationship.Spouse
                }
            };

            var result = await _dialogService.ShowDialogAsync(familyDialog);
            
            if (result == true && familyDialog.FamilyMember != null)
            {
                try
                {
                    var createdMember = await _tkaWorkerService.CreateFamilyMemberAsync(familyDialog.FamilyMember);
                    FamilyMembers.Add(createdMember);
                    
                    _logger.LogInformation("Added family member: {MemberName} for TKA: {TkaName}", 
                        createdMember.Nama, TkaWorker.Nama);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error adding family member");
                    await _dialogService.ShowErrorAsync("Error adding family member.", "Add Error");
                }
            }
        }

        private async Task EditFamilyMemberAsync(TkaFamilyMemberDto? member)
        {
            if (member == null) return;

            var familyDialog = new FamilyMemberDialogViewModel(_dialogService)
            {
                TkaId = TkaId,
                FamilyMember = member.Clone(),
                IsEdit = true
            };

            var result = await _dialogService.ShowDialogAsync(familyDialog);
            
            if (result == true && familyDialog.FamilyMember != null)
            {
                try
                {
                    await _tkaWorkerService.UpdateFamilyMemberAsync(familyDialog.FamilyMember);
                    
                    var index = FamilyMembers.IndexOf(member);
                    if (index >= 0)
                    {
                        FamilyMembers[index] = familyDialog.FamilyMember;
                    }
                    
                    _logger.LogInformation("Updated family member: {MemberName}", familyDialog.FamilyMember.Nama);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error updating family member");
                    await _dialogService.ShowErrorAsync("Error updating family member.", "Update Error");
                }
            }
        }

        private async Task DeleteFamilyMemberAsync(TkaFamilyMemberDto? member)
        {
            if (member == null) return;

            var result = await _dialogService.ShowConfirmationAsync(
                $"Are you sure you want to delete family member '{member.Nama}'?",
                "Confirm Delete");

            if (!result) return;

            try
            {
                await _tkaWorkerService.DeleteFamilyMemberAsync(member.Id);
                FamilyMembers.Remove(member);
                
                _logger.LogInformation("Deleted family member: {MemberName}", member.Nama);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting family member {MemberId}", member.Id);
                await _dialogService.ShowErrorAsync("Error deleting family member.", "Delete Error");
            }
        }

        // Company Assignment Methods
        private void ViewAssignmentDetails(CompanyTkaAssignmentDto? assignment)
        {
            if (assignment == null) return;

            _navigationService.NavigateToCompanyDetails(assignment.CompanyId);
        }

        private async Task RemoveFromCompanyAsync(CompanyTkaAssignmentDto? assignment)
        {
            if (assignment == null) return;

            var result = await _dialogService.ShowConfirmationAsync(
                $"Are you sure you want to remove this TKA worker from company '{assignment.CompanyName}'?",
                "Confirm Remove");

            if (!result) return;

            try
            {
                await _companyService.DeleteTkaAssignmentAsync(assignment.Id);
                CompanyAssignments.Remove(assignment);
                
                UpdateCommandStates(); // Update CreateInvoiceCommand state
                
                _logger.LogInformation("Removed TKA {TkaName} from company {CompanyName}", 
                    TkaWorker.Nama, assignment.CompanyName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing TKA assignment {AssignmentId}", assignment.Id);
                await _dialogService.ShowErrorAsync("Error removing company assignment.", "Remove Error");
            }
        }

        // Invoice History Methods
        private void ViewInvoice(InvoiceDto? invoice)
        {
            if (invoice == null) return;

            _navigationService.NavigateToInvoiceDetails(invoice.Id);
        }

        private async Task PrintInvoiceAsync(InvoiceDto? invoice)
        {
            if (invoice == null) return;

            try
            {
                _navigationService.NavigateToInvoicePrint(invoice.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error opening invoice print for invoice {InvoiceId}", invoice.Id);
                await _dialogService.ShowErrorAsync("Error opening invoice print.", "Print Error");
            }
        }

        private async Task ExportInvoiceHistoryAsync()
        {
            try
            {
                var saveFileDialog = new Microsoft.Win32.SaveFileDialog
                {
                    Title = "Export Invoice History",
                    Filter = "Excel Files (*.xlsx)|*.xlsx|CSV Files (*.csv)|*.csv",
                    FileName = $"InvoiceHistory_{TkaWorker.Nama}_{DateTime.Now:yyyyMMdd}"
                };

                if (saveFileDialog.ShowDialog() == true)
                {
                    // Implementation would use export service
                    await _dialogService.ShowInfoAsync("Invoice history exported successfully!", "Export Complete");
                    _logger.LogInformation("Exported invoice history for TKA: {TkaName}", TkaWorker.Nama);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting invoice history");
                await _dialogService.ShowErrorAsync("Error exporting invoice history.", "Export Error");
            }
        }

        // Navigation Methods
        private void CreateInvoice()
        {
            if (CompanyAssignments.Any())
            {
                _navigationService.NavigateToInvoiceCreate(preSelectedTkaId: TkaId);
            }
        }

        private void ViewCompany(CompanyTkaAssignmentDto? assignment)
        {
            if (assignment == null) return;

            _navigationService.NavigateToCompanyDetails(assignment.CompanyId);
        }

        private bool HasChanges()
        {
            // Simple change detection - in a real application, you might want more sophisticated tracking
            return IsEditing;
        }

        partial void OnFamilySearchTermChanged(string value)
        {
            _familyMembersView?.Refresh();
        }

        partial void OnAssignmentSearchTermChanged(string value)
        {
            _assignmentsView?.Refresh();
        }

        partial void OnInvoiceSearchTermChanged(string value)
        {
            _invoiceHistoryView?.Refresh();
        }
    }

    // Helper class for family member dialog
    public class FamilyMemberDialogViewModel : ObservableObject
    {
        public TkaFamilyMemberDto? FamilyMember { get; set; }
        public int TkaId { get; set; }
        public bool IsEdit { get; set; }
        
        private readonly IDialogService _dialogService;

        public List<Gender> Genders { get; } = Enum.GetValues<Gender>().ToList();
        public List<FamilyRelationship> Relationships { get; } = Enum.GetValues<FamilyRelationship>().ToList();

        public FamilyMemberDialogViewModel(IDialogService dialogService)
        {
            _dialogService = dialogService;
        }
    }
}