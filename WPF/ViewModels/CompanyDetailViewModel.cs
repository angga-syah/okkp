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
    public partial class CompanyDetailViewModel : ObservableObject
    {
        private readonly ICompanyService _companyService;
        private readonly ITkaWorkerService _tkaWorkerService;
        private readonly IDialogService _dialogService;
        private readonly INavigationService _navigationService;
        private readonly ILogger<CompanyDetailViewModel> _logger;
        private readonly IValidator<CompanyDto> _companyValidator;

        [ObservableProperty]
        private CompanyDto _company = new();

        [ObservableProperty]
        private bool _isNewCompany = true;

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

        // Job Descriptions
        [ObservableProperty]
        private ObservableCollection<JobDescriptionDto> _jobDescriptions = new();

        [ObservableProperty]
        private JobDescriptionDto? _selectedJobDescription;

        [ObservableProperty]
        private string _jobSearchTerm = string.Empty;

        [ObservableProperty]
        private bool _showJobDescriptions = true;

        // TKA Assignments
        [ObservableProperty]
        private ObservableCollection<CompanyTkaAssignmentDto> _tkaAssignments = new();

        [ObservableProperty]
        private CompanyTkaAssignmentDto? _selectedTkaAssignment;

        [ObservableProperty]
        private ObservableCollection<TkaWorkerDto> _availableTkaWorkers = new();

        [ObservableProperty]
        private string _tkaSearchTerm = string.Empty;

        [ObservableProperty]
        private bool _showTkaAssignments = true;

        private ICollectionView? _jobDescriptionsView;
        private ICollectionView? _tkaAssignmentsView;
        private ICollectionView? _availableTkaWorkersView;

        public ICommand LoadDataCommand { get; }
        public ICommand SaveCommand { get; }
        public ICommand CancelCommand { get; }
        public ICommand EditCommand { get; }
        public ICommand DeleteCommand { get; }
        
        // Job Description Commands
        public ICommand AddJobDescriptionCommand { get; }
        public ICommand EditJobDescriptionCommand { get; }
        public ICommand DeleteJobDescriptionCommand { get; }
        public ICommand MoveJobUpCommand { get; }
        public ICommand MoveJobDownCommand { get; }
        public ICommand DuplicateJobCommand { get; }
        
        // TKA Assignment Commands
        public ICommand AddTkaAssignmentCommand { get; }
        public ICommand EditTkaAssignmentCommand { get; }
        public ICommand RemoveTkaAssignmentCommand { get; }
        public ICommand ViewTkaDetailsCommand { get; }

        public int CompanyId { get; set; }

        public CompanyDetailViewModel(
            ICompanyService companyService,
            ITkaWorkerService tkaWorkerService,
            IDialogService dialogService,
            INavigationService navigationService,
            ILogger<CompanyDetailViewModel> logger,
            IValidator<CompanyDto> companyValidator)
        {
            _companyService = companyService;
            _tkaWorkerService = tkaWorkerService;
            _dialogService = dialogService;
            _navigationService = navigationService;
            _logger = logger;
            _companyValidator = companyValidator;

            InitializeCommands();
            SetupPropertyChanged();
        }

        private void InitializeCommands()
        {
            LoadDataCommand = new AsyncRelayCommand(LoadDataAsync);
            SaveCommand = new AsyncRelayCommand(SaveAsync, () => CanSave && IsEditing);
            CancelCommand = new AsyncRelayCommand(CancelAsync);
            EditCommand = new RelayCommand(StartEdit, () => CanEdit && !IsEditing);
            DeleteCommand = new AsyncRelayCommand(DeleteAsync, () => !IsNewCompany && CanEdit);
            
            // Job Description Commands
            AddJobDescriptionCommand = new AsyncRelayCommand(AddJobDescriptionAsync, () => !IsNewCompany);
            EditJobDescriptionCommand = new AsyncRelayCommand<JobDescriptionDto>(EditJobDescriptionAsync);
            DeleteJobDescriptionCommand = new AsyncRelayCommand<JobDescriptionDto>(DeleteJobDescriptionAsync);
            MoveJobUpCommand = new RelayCommand<JobDescriptionDto>(MoveJobUp);
            MoveJobDownCommand = new RelayCommand<JobDescriptionDto>(MoveJobDown);
            DuplicateJobCommand = new AsyncRelayCommand<JobDescriptionDto>(DuplicateJobAsync);
            
            // TKA Assignment Commands
            AddTkaAssignmentCommand = new AsyncRelayCommand(AddTkaAssignmentAsync, () => !IsNewCompany);
            EditTkaAssignmentCommand = new AsyncRelayCommand<CompanyTkaAssignmentDto>(EditTkaAssignmentAsync);
            RemoveTkaAssignmentCommand = new AsyncRelayCommand<CompanyTkaAssignmentDto>(RemoveTkaAssignmentAsync);
            ViewTkaDetailsCommand = new RelayCommand<CompanyTkaAssignmentDto>(ViewTkaDetails);
        }

        private void SetupPropertyChanged()
        {
            PropertyChanged += OnPropertyChanged;
        }

        private void OnPropertyChanged(object? sender, PropertyChangedEventArgs e)
        {
            if (e.PropertyName == nameof(Company))
            {
                ValidateCompany();
            }
        }

        public async Task InitializeAsync(int companyId = 0)
        {
            CompanyId = companyId;
            IsNewCompany = companyId == 0;
            IsEditing = IsNewCompany;

            if (IsNewCompany)
            {
                Company = new CompanyDto
                {
                    IsActive = true
                };
            }

            await LoadDataAsync();
        }

        private async Task LoadDataAsync()
        {
            try
            {
                IsLoading = true;

                if (!IsNewCompany)
                {
                    // Load company details
                    var company = await _companyService.GetByIdAsync(CompanyId);
                    if (company != null)
                    {
                        Company = company;
                    }

                    // Load job descriptions
                    await LoadJobDescriptionsAsync();

                    // Load TKA assignments
                    await LoadTkaAssignmentsAsync();
                }

                // Load available TKA workers
                await LoadAvailableTkaWorkersAsync();

                SetupCollectionViews();
                UpdateCommandStates();

                _logger.LogInformation("Company detail data loaded for company ID: {CompanyId}", CompanyId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading company detail data for ID: {CompanyId}", CompanyId);
                await _dialogService.ShowErrorAsync("Error loading company data.", "Load Error");
            }
            finally
            {
                IsLoading = false;
            }
        }

        private async Task LoadJobDescriptionsAsync()
        {
            try
            {
                var jobs = await _companyService.GetJobDescriptionsAsync(CompanyId);
                
                JobDescriptions.Clear();
                foreach (var job in jobs.OrderBy(j => j.SortOrder))
                {
                    JobDescriptions.Add(job);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading job descriptions for company {CompanyId}", CompanyId);
            }
        }

        private async Task LoadTkaAssignmentsAsync()
        {
            try
            {
                var assignments = await _companyService.GetTkaAssignmentsAsync(CompanyId);
                
                TkaAssignments.Clear();
                foreach (var assignment in assignments)
                {
                    TkaAssignments.Add(assignment);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading TKA assignments for company {CompanyId}", CompanyId);
            }
        }

        private async Task LoadAvailableTkaWorkersAsync()
        {
            try
            {
                var workers = await _tkaWorkerService.GetAllActiveAsync();
                
                AvailableTkaWorkers.Clear();
                foreach (var worker in workers)
                {
                    AvailableTkaWorkers.Add(worker);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading available TKA workers");
            }
        }

        private void SetupCollectionViews()
        {
            _jobDescriptionsView = CollectionViewSource.GetDefaultView(JobDescriptions);
            _jobDescriptionsView.Filter = FilterJobDescriptions;

            _tkaAssignmentsView = CollectionViewSource.GetDefaultView(TkaAssignments);
            _tkaAssignmentsView.Filter = FilterTkaAssignments;

            _availableTkaWorkersView = CollectionViewSource.GetDefaultView(AvailableTkaWorkers);
            _availableTkaWorkersView.Filter = FilterAvailableTkaWorkers;
        }

        private bool FilterJobDescriptions(object obj)
        {
            if (obj is not JobDescriptionDto job || string.IsNullOrWhiteSpace(JobSearchTerm))
                return true;

            var searchLower = JobSearchTerm.ToLowerInvariant();
            return job.JobName.ToLowerInvariant().Contains(searchLower) ||
                   (job.JobDescription?.ToLowerInvariant().Contains(searchLower) ?? false);
        }

        private bool FilterTkaAssignments(object obj)
        {
            if (obj is not CompanyTkaAssignmentDto assignment || string.IsNullOrWhiteSpace(TkaSearchTerm))
                return true;

            var searchLower = TkaSearchTerm.ToLowerInvariant();
            return assignment.TkaWorkerName.ToLowerInvariant().Contains(searchLower) ||
                   assignment.TkaPassport.ToLowerInvariant().Contains(searchLower) ||
                   (assignment.TkaDivisi?.ToLowerInvariant().Contains(searchLower) ?? false);
        }

        private bool FilterAvailableTkaWorkers(object obj)
        {
            if (obj is not TkaWorkerDto worker || string.IsNullOrWhiteSpace(TkaSearchTerm))
                return true;

            var searchLower = TkaSearchTerm.ToLowerInvariant();
            return worker.Nama.ToLowerInvariant().Contains(searchLower) ||
                   worker.Passport.ToLowerInvariant().Contains(searchLower) ||
                   (worker.Divisi?.ToLowerInvariant().Contains(searchLower) ?? false);
        }

        private void ValidateCompany()
        {
            try
            {
                var validationResult = _companyValidator.Validate(Company);
                HasValidationErrors = !validationResult.IsValid;
                ValidationErrors = string.Join("\n", validationResult.Errors.Select(e => e.ErrorMessage));
                CanSave = validationResult.IsValid;
                
                UpdateCommandStates();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating company");
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
            ((AsyncRelayCommand)AddJobDescriptionCommand).NotifyCanExecuteChanged();
            ((AsyncRelayCommand)AddTkaAssignmentCommand).NotifyCanExecuteChanged();
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

                if (IsNewCompany)
                {
                    var createdCompany = await _companyService.CreateAsync(Company);
                    Company = createdCompany;
                    CompanyId = createdCompany.Id;
                    IsNewCompany = false;
                    
                    _logger.LogInformation("Created new company: {CompanyName}", Company.CompanyName);
                }
                else
                {
                    await _companyService.UpdateAsync(Company);
                    _logger.LogInformation("Updated company: {CompanyName}", Company.CompanyName);
                }

                IsEditing = false;
                await _dialogService.ShowInfoAsync("Company saved successfully!", "Save Success");
                UpdateCommandStates();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving company");
                await _dialogService.ShowErrorAsync("Error saving company. Please try again.", "Save Error");
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
                var hasChanges = IsNewCompany || HasChanges();
                
                if (hasChanges)
                {
                    var result = await _dialogService.ShowConfirmationAsync(
                        "You have unsaved changes. Are you sure you want to cancel?",
                        "Confirm Cancel");

                    if (!result) return;
                }

                if (IsNewCompany)
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
                $"Are you sure you want to delete the company '{Company.CompanyName}'?\n\nThis action cannot be undone and will affect related invoices.",
                "Confirm Delete");

            if (!result) return;

            try
            {
                IsLoading = true;
                await _companyService.DeleteAsync(CompanyId);
                
                _logger.LogInformation("Deleted company: {CompanyName}", Company.CompanyName);
                await _dialogService.ShowInfoAsync("Company deleted successfully.", "Delete Success");
                
                _navigationService.NavigateBack();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting company {CompanyId}", CompanyId);
                await _dialogService.ShowErrorAsync("Error deleting company. It may be referenced by existing invoices.", "Delete Error");
            }
            finally
            {
                IsLoading = false;
            }
        }

        // Job Description Methods
        private async Task AddJobDescriptionAsync()
        {
            var jobDialog = new JobDescriptionDialogViewModel(_dialogService)
            {
                CompanyId = CompanyId,
                SortOrder = JobDescriptions.Any() ? JobDescriptions.Max(j => j.SortOrder) + 1 : 1
            };

            var result = await _dialogService.ShowDialogAsync(jobDialog);
            
            if (result == true && jobDialog.JobDescription != null)
            {
                try
                {
                    var createdJob = await _companyService.CreateJobDescriptionAsync(jobDialog.JobDescription);
                    JobDescriptions.Add(createdJob);
                    
                    _logger.LogInformation("Added job description: {JobName}", createdJob.JobName);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error adding job description");
                    await _dialogService.ShowErrorAsync("Error adding job description.", "Add Error");
                }
            }
        }

        private async Task EditJobDescriptionAsync(JobDescriptionDto? job)
        {
            if (job == null) return;

            var jobDialog = new JobDescriptionDialogViewModel(_dialogService)
            {
                JobDescription = job.Clone(),
                IsEdit = true
            };

            var result = await _dialogService.ShowDialogAsync(jobDialog);
            
            if (result == true && jobDialog.JobDescription != null)
            {
                try
                {
                    await _companyService.UpdateJobDescriptionAsync(jobDialog.JobDescription);
                    
                    var index = JobDescriptions.IndexOf(job);
                    if (index >= 0)
                    {
                        JobDescriptions[index] = jobDialog.JobDescription;
                    }
                    
                    _logger.LogInformation("Updated job description: {JobName}", jobDialog.JobDescription.JobName);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error updating job description");
                    await _dialogService.ShowErrorAsync("Error updating job description.", "Update Error");
                }
            }
        }

        private async Task DeleteJobDescriptionAsync(JobDescriptionDto? job)
        {
            if (job == null) return;

            var result = await _dialogService.ShowConfirmationAsync(
                $"Are you sure you want to delete the job description '{job.JobName}'?",
                "Confirm Delete");

            if (!result) return;

            try
            {
                await _companyService.DeleteJobDescriptionAsync(job.Id);
                JobDescriptions.Remove(job);
                
                _logger.LogInformation("Deleted job description: {JobName}", job.JobName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting job description {JobId}", job.Id);
                await _dialogService.ShowErrorAsync("Error deleting job description.", "Delete Error");
            }
        }

        private void MoveJobUp(JobDescriptionDto? job)
        {
            if (job == null) return;

            var index = JobDescriptions.IndexOf(job);
            if (index > 0)
            {
                var previousJob = JobDescriptions[index - 1];
                (job.SortOrder, previousJob.SortOrder) = (previousJob.SortOrder, job.SortOrder);
                
                JobDescriptions.Move(index, index - 1);
                
                // Save sort order changes
                _ = Task.Run(async () =>
                {
                    await _companyService.UpdateJobDescriptionAsync(job);
                    await _companyService.UpdateJobDescriptionAsync(previousJob);
                });
            }
        }

        private void MoveJobDown(JobDescriptionDto? job)
        {
            if (job == null) return;

            var index = JobDescriptions.IndexOf(job);
            if (index < JobDescriptions.Count - 1)
            {
                var nextJob = JobDescriptions[index + 1];
                (job.SortOrder, nextJob.SortOrder) = (nextJob.SortOrder, job.SortOrder);
                
                JobDescriptions.Move(index, index + 1);
                
                // Save sort order changes
                _ = Task.Run(async () =>
                {
                    await _companyService.UpdateJobDescriptionAsync(job);
                    await _companyService.UpdateJobDescriptionAsync(nextJob);
                });
            }
        }

        private async Task DuplicateJobAsync(JobDescriptionDto? job)
        {
            if (job == null) return;

            var duplicatedJob = job.Clone();
            duplicatedJob.Id = 0;
            duplicatedJob.JobName += " (Copy)";
            duplicatedJob.SortOrder = JobDescriptions.Max(j => j.SortOrder) + 1;

            try
            {
                var createdJob = await _companyService.CreateJobDescriptionAsync(duplicatedJob);
                JobDescriptions.Add(createdJob);
                
                _logger.LogInformation("Duplicated job description: {JobName}", createdJob.JobName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error duplicating job description");
                await _dialogService.ShowErrorAsync("Error duplicating job description.", "Duplicate Error");
            }
        }

        // TKA Assignment Methods
        private async Task AddTkaAssignmentAsync()
        {
            var assignmentDialog = new TkaAssignmentDialogViewModel(
                AvailableTkaWorkers.ToList(),
                _dialogService)
            {
                CompanyId = CompanyId
            };

            var result = await _dialogService.ShowDialogAsync(assignmentDialog);
            
            if (result == true && assignmentDialog.Assignment != null)
            {
                try
                {
                    var createdAssignment = await _companyService.CreateTkaAssignmentAsync(assignmentDialog.Assignment);
                    TkaAssignments.Add(createdAssignment);
                    
                    _logger.LogInformation("Added TKA assignment: {TkaName}", createdAssignment.TkaWorkerName);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error adding TKA assignment");
                    await _dialogService.ShowErrorAsync("Error adding TKA assignment.", "Add Error");
                }
            }
        }

        private async Task EditTkaAssignmentAsync(CompanyTkaAssignmentDto? assignment)
        {
            if (assignment == null) return;

            var assignmentDialog = new TkaAssignmentDialogViewModel(
                AvailableTkaWorkers.ToList(),
                _dialogService)
            {
                Assignment = assignment.Clone(),
                IsEdit = true
            };

            var result = await _dialogService.ShowDialogAsync(assignmentDialog);
            
            if (result == true && assignmentDialog.Assignment != null)
            {
                try
                {
                    await _companyService.UpdateTkaAssignmentAsync(assignmentDialog.Assignment);
                    
                    var index = TkaAssignments.IndexOf(assignment);
                    if (index >= 0)
                    {
                        TkaAssignments[index] = assignmentDialog.Assignment;
                    }
                    
                    _logger.LogInformation("Updated TKA assignment: {TkaName}", assignmentDialog.Assignment.TkaWorkerName);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error updating TKA assignment");
                    await _dialogService.ShowErrorAsync("Error updating TKA assignment.", "Update Error");
                }
            }
        }

        private async Task RemoveTkaAssignmentAsync(CompanyTkaAssignmentDto? assignment)
        {
            if (assignment == null) return;

            var result = await _dialogService.ShowConfirmationAsync(
                $"Are you sure you want to remove TKA assignment for '{assignment.TkaWorkerName}'?",
                "Confirm Remove");

            if (!result) return;

            try
            {
                await _companyService.DeleteTkaAssignmentAsync(assignment.Id);
                TkaAssignments.Remove(assignment);
                
                _logger.LogInformation("Removed TKA assignment: {TkaName}", assignment.TkaWorkerName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing TKA assignment {AssignmentId}", assignment.Id);
                await _dialogService.ShowErrorAsync("Error removing TKA assignment.", "Remove Error");
            }
        }

        private void ViewTkaDetails(CompanyTkaAssignmentDto? assignment)
        {
            if (assignment == null) return;

            _navigationService.NavigateToTkaDetails(assignment.TkaId);
        }

        private bool HasChanges()
        {
            // Simple change detection - in a real application, you might want more sophisticated tracking
            return IsEditing;
        }

        partial void OnJobSearchTermChanged(string value)
        {
            _jobDescriptionsView?.Refresh();
        }

        partial void OnTkaSearchTermChanged(string value)
        {
            _tkaAssignmentsView?.Refresh();
            _availableTkaWorkersView?.Refresh();
        }
    }

    // Helper classes for dialogs
    public class JobDescriptionDialogViewModel : ObservableObject
    {
        public JobDescriptionDto? JobDescription { get; set; }
        public int CompanyId { get; set; }
        public int SortOrder { get; set; }
        public bool IsEdit { get; set; }
        
        private readonly IDialogService _dialogService;

        public JobDescriptionDialogViewModel(IDialogService dialogService)
        {
            _dialogService = dialogService;
        }
    }

    public class TkaAssignmentDialogViewModel : ObservableObject
    {
        public List<TkaWorkerDto> AvailableTkaWorkers { get; }
        public CompanyTkaAssignmentDto? Assignment { get; set; }
        public int CompanyId { get; set; }
        public bool IsEdit { get; set; }
        
        private readonly IDialogService _dialogService;

        public TkaAssignmentDialogViewModel(
            List<TkaWorkerDto> availableTkaWorkers,
            IDialogService dialogService)
        {
            AvailableTkaWorkers = availableTkaWorkers;
            _dialogService = dialogService;
        }
    }
}