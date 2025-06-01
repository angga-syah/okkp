# Setup Desktop Invoice Management Project Structure
# Run this script in VS Code terminal: .\setup-desktop-project.ps1

param(
    [string]$ProjectPath = ".\InvoiceManagement"
)

Write-Host "🚀 Creating Invoice Management Desktop Project Structure..." -ForegroundColor Green
Write-Host "📁 Target Path: $ProjectPath" -ForegroundColor Cyan

# Create root directory
New-Item -ItemType Directory -Path $ProjectPath -Force | Out-Null
Set-Location $ProjectPath

# Create main Desktop directory
New-Item -ItemType Directory -Path "Desktop" -Force | Out-Null
Set-Location "Desktop"

Write-Host "📦 Creating Core Business Logic Layer..." -ForegroundColor Yellow

# Core Business Logic Layer
$coreFolders = @(
    "Core\Entities",
    "Core\Interfaces\Services",
    "Core\DTOs",
    "Core\Enums", 
    "Core\Constants"
)

foreach ($folder in $coreFolders) {
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
}

# Create Core Entity Files
$entityFiles = @(
    "Core\Entities\User.cs",
    "Core\Entities\Company.cs", 
    "Core\Entities\TkaWorker.cs",
    "Core\Entities\CompanyTkaAssignment.cs",
    "Core\Entities\TkaFamilyMember.cs",
    "Core\Entities\Invoice.cs",
    "Core\Entities\InvoiceLine.cs",
    "Core\Entities\JobDescription.cs",
    "Core\Entities\BankAccount.cs",
    "Core\Entities\ImportLog.cs",
    "Core\Entities\Setting.cs",
    "Core\Entities\UserPreference.cs",
    "Core\Entities\InvoiceAuditLog.cs",
    "Core\Entities\InvoiceNumberSequence.cs"
)

foreach ($file in $entityFiles) {
    New-Item -ItemType File -Path $file -Force | Out-Null
}

# Create Interface Files
$interfaceFiles = @(
    "Core\Interfaces\IUserRepository.cs",
    "Core\Interfaces\ICompanyRepository.cs",
    "Core\Interfaces\ITkaWorkerRepository.cs", 
    "Core\Interfaces\IInvoiceRepository.cs",
    "Core\Interfaces\IImportRepository.cs",
    "Core\Interfaces\IUnitOfWork.cs",
    "Core\Interfaces\Services\IInvoiceService.cs",
    "Core\Interfaces\Services\IPdfService.cs",
    "Core\Interfaces\Services\IExcelService.cs",
    "Core\Interfaces\Services\IPrintService.cs",
    "Core\Interfaces\Services\ISearchService.cs",
    "Core\Interfaces\Services\IImportService.cs",
    "Core\Interfaces\Services\IInvoiceFormatService.cs",
    "Core\Interfaces\Services\ICachingService.cs",
    "Core\Interfaces\Services\IPerformanceService.cs"
)

foreach ($file in $interfaceFiles) {
    New-Item -ItemType File -Path $file -Force | Out-Null
}

# Create DTO Files
$dtoFiles = @(
    "Core\DTOs\InvoiceDto.cs",
    "Core\DTOs\CompanyDto.cs",
    "Core\DTOs\TkaWorkerDto.cs",
    "Core\DTOs\TkaSelectionItem.cs",
    "Core\DTOs\SearchResultDto.cs",
    "Core\DTOs\ImportResultDto.cs",
    "Core\DTOs\InvoiceLineDto.cs",
    "Core\DTOs\InvoiceFormatDto.cs",
    "Core\DTOs\DashboardDto.cs",
    "Core\DTOs\PerformanceMetricsDto.cs"
)

foreach ($file in $dtoFiles) {
    New-Item -ItemType File -Path $file -Force | Out-Null
}

# Create Enum Files
$enumFiles = @(
    "Core\Enums\UserRole.cs",
    "Core\Enums\InvoiceStatus.cs",
    "Core\Enums\Gender.cs",
    "Core\Enums\FamilyRelationship.cs",
    "Core\Enums\SearchMatchType.cs",
    "Core\Enums\ImportFileType.cs",
    "Core\Enums\ThemeMode.cs",
    "Core\Enums\AnimationType.cs"
)

foreach ($file in $enumFiles) {
    New-Item -ItemType File -Path $file -Force | Out-Null
}

# Create Constants Files
$constantFiles = @(
    "Core\Constants\AppConstants.cs",
    "Core\Constants\DatabaseConstants.cs",
    "Core\Constants\UIConstants.cs",
    "Core\Constants\PerformanceConstants.cs"
)

foreach ($file in $constantFiles) {
    New-Item -ItemType File -Path $file -Force | Out-Null
}

Write-Host "🏗️ Creating Infrastructure Data Access Layer..." -ForegroundColor Yellow

# Infrastructure Layer
$infraFolders = @(
    "Infrastructure\Data\Configurations",
    "Infrastructure\Repositories", 
    "Infrastructure\Services\Core",
    "Infrastructure\Services\Caching",
    "Infrastructure\Services\Performance",
    "Infrastructure\Migrations",
    "Infrastructure\Seed"
)

foreach ($folder in $infraFolders) {
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
}

# Create Infrastructure Files
$infraFiles = @(
    "Infrastructure\Data\InvoiceDbContext.cs",
    "Infrastructure\Data\DbContextFactory.cs",
    "Infrastructure\Data\Configurations\UserConfiguration.cs",
    "Infrastructure\Data\Configurations\CompanyConfiguration.cs",
    "Infrastructure\Data\Configurations\InvoiceConfiguration.cs",
    "Infrastructure\Data\Configurations\TkaWorkerConfiguration.cs",
    "Infrastructure\Data\Configurations\ImportLogConfiguration.cs",
    "Infrastructure\Repositories\BaseRepository.cs",
    "Infrastructure\Repositories\UserRepository.cs",
    "Infrastructure\Repositories\CompanyRepository.cs",
    "Infrastructure\Repositories\InvoiceRepository.cs",
    "Infrastructure\Repositories\TkaWorkerRepository.cs",
    "Infrastructure\Repositories\ImportRepository.cs",
    "Infrastructure\Repositories\UnitOfWork.cs",
    "Infrastructure\Services\Core\PdfService.cs",
    "Infrastructure\Services\Core\ExcelService.cs",
    "Infrastructure\Services\Core\PrintService.cs",
    "Infrastructure\Services\Core\InvoiceNumberService.cs",
    "Infrastructure\Services\Core\SmartSearchService.cs",
    "Infrastructure\Services\Core\ImportService.cs",
    "Infrastructure\Services\Core\InvoiceFormatService.cs",
    "Infrastructure\Services\Core\BackupService.cs",
    "Infrastructure\Services\Caching\MemoryCacheService.cs",
    "Infrastructure\Services\Caching\DistributedCacheService.cs",
    "Infrastructure\Services\Performance\ConnectionPoolService.cs",
    "Infrastructure\Services\Performance\QueryOptimizationService.cs",
    "Infrastructure\Services\Performance\BackgroundTaskService.cs",
    "Infrastructure\Seed\SeedData.cs",
    "Infrastructure\Seed\DefaultSettings.cs"
)

foreach ($file in $infraFiles) {
    New-Item -ItemType File -Path $file -Force | Out-Null
}

Write-Host "⚙️ Creating Application Services Layer..." -ForegroundColor Yellow

# Application Layer
$appFolders = @(
    "Application\Services",
    "Application\Validators",
    "Application\Mappers", 
    "Application\Commands",
    "Application\Queries",
    "Application\Handlers"
)

foreach ($folder in $appFolders) {
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
}

# Create Application Files
$appFiles = @(
    "Application\Services\InvoiceService.cs",
    "Application\Services\CompanyService.cs",
    "Application\Services\TkaWorkerService.cs",
    "Application\Services\UserService.cs",
    "Application\Services\SettingsService.cs",
    "Application\Services\ReportService.cs",
    "Application\Services\ImportExportService.cs",
    "Application\Services\DashboardService.cs",
    "Application\Validators\InvoiceValidator.cs",
    "Application\Validators\CompanyValidator.cs",
    "Application\Validators\TkaWorkerValidator.cs",
    "Application\Validators\ImportDataValidator.cs",
    "Application\Mappers\InvoiceMapper.cs",
    "Application\Mappers\CompanyMapper.cs",
    "Application\Mappers\TkaWorkerMapper.cs",
    "Application\Mappers\AutoMapperProfile.cs",
    "Application\Commands\CreateInvoiceCommand.cs",
    "Application\Commands\UpdateInvoiceCommand.cs",
    "Application\Commands\DeleteInvoiceCommand.cs",
    "Application\Commands\ImportInvoiceCommand.cs",
    "Application\Queries\GetInvoicesQuery.cs",
    "Application\Queries\GetCompaniesQuery.cs",
    "Application\Queries\GetTkaWorkersQuery.cs",
    "Application\Handlers\InvoiceCommandHandler.cs",
    "Application\Handlers\InvoiceQueryHandler.cs"
)

foreach ($file in $appFiles) {
    New-Item -ItemType File -Path $file -Force | Out-Null
}

Write-Host "🎨 Creating WPF Presentation Layer..." -ForegroundColor Yellow

# WPF Presentation Layer
$wpfFolders = @(
    "WPF\Views\Authentication",
    "WPF\Views\Dashboard", 
    "WPF\Views\Companies",
    "WPF\Views\TkaWorkers",
    "WPF\Views\Invoices",
    "WPF\Views\Reports",
    "WPF\Views\Settings",
    "WPF\Views\Shared",
    "WPF\ViewModels",
    "WPF\Controls",
    "WPF\Converters",
    "WPF\Helpers",
    "WPF\Behaviors",
    "WPF\Resources\Styles",
    "WPF\Resources\Templates", 
    "WPF\Resources\Images\icons",
    "WPF\Resources\Fonts",
    "WPF\Themes\Modern",
    "WPF\Themes\Dark",
    "WPF\Themes\Light",
    "WPF\Animations",
    "WPF\Performance",
    "WPF\Services"
)

foreach ($folder in $wpfFolders) {
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
}

# Create WPF Main Files
$wpfMainFiles = @(
    "WPF\App.xaml",
    "WPF\App.xaml.cs",
    "WPF\MainWindow.xaml",
    "WPF\MainWindow.xaml.cs"
)

foreach ($file in $wpfMainFiles) {
    New-Item -ItemType File -Path $file -Force | Out-Null
}

# Create View Files
$viewFiles = @(
    "WPF\Views\Authentication\LoginWindow.xaml",
    "WPF\Views\Authentication\LoginWindow.xaml.cs",
    "WPF\Views\Dashboard\DashboardView.xaml",
    "WPF\Views\Dashboard\DashboardView.xaml.cs",
    "WPF\Views\Companies\CompanyListView.xaml",
    "WPF\Views\Companies\CompanyListView.xaml.cs",
    "WPF\Views\Companies\CompanyDetailView.xaml",
    "WPF\Views\Companies\CompanyDetailView.xaml.cs",
    "WPF\Views\Companies\CompanyCreateView.xaml",
    "WPF\Views\Companies\CompanyCreateView.xaml.cs",
    "WPF\Views\Companies\JobDescriptionView.xaml",
    "WPF\Views\Companies\JobDescriptionView.xaml.cs",
    "WPF\Views\Companies\TkaAssignmentView.xaml",
    "WPF\Views\Companies\TkaAssignmentView.xaml.cs",
    "WPF\Views\TkaWorkers\TkaListView.xaml",
    "WPF\Views\TkaWorkers\TkaListView.xaml.cs",
    "WPF\Views\TkaWorkers\TkaDetailView.xaml",
    "WPF\Views\TkaWorkers\TkaDetailView.xaml.cs",
    "WPF\Views\TkaWorkers\TkaCreateView.xaml",
    "WPF\Views\TkaWorkers\TkaCreateView.xaml.cs",
    "WPF\Views\TkaWorkers\FamilyMemberView.xaml",
    "WPF\Views\TkaWorkers\FamilyMemberView.xaml.cs",
    "WPF\Views\Invoices\InvoiceListView.xaml",
    "WPF\Views\Invoices\InvoiceListView.xaml.cs",
    "WPF\Views\Invoices\InvoiceCreateView.xaml",
    "WPF\Views\Invoices\InvoiceCreateView.xaml.cs",
    "WPF\Views\Invoices\InvoiceEditView.xaml",
    "WPF\Views\Invoices\InvoiceEditView.xaml.cs",
    "WPF\Views\Invoices\InvoicePreviewView.xaml",
    "WPF\Views\Invoices\InvoicePreviewView.xaml.cs",
    "WPF\Views\Invoices\InvoicePrintView.xaml",
    "WPF\Views\Invoices\InvoicePrintView.xaml.cs",
    "WPF\Views\Invoices\InvoiceImportView.xaml",
    "WPF\Views\Invoices\InvoiceImportView.xaml.cs",
    "WPF\Views\Reports\ReportsView.xaml",
    "WPF\Views\Reports\ReportsView.xaml.cs",
    "WPF\Views\Reports\InvoiceReportView.xaml",
    "WPF\Views\Reports\InvoiceReportView.xaml.cs",
    "WPF\Views\Reports\ExportView.xaml",
    "WPF\Views\Reports\ExportView.xaml.cs",
    "WPF\Views\Settings\SettingsView.xaml",
    "WPF\Views\Settings\SettingsView.xaml.cs",
    "WPF\Views\Settings\DatabaseSettingsView.xaml",
    "WPF\Views\Settings\DatabaseSettingsView.xaml.cs",
    "WPF\Views\Settings\BankAccountsView.xaml",
    "WPF\Views\Settings\BankAccountsView.xaml.cs",
    "WPF\Views\Settings\InvoiceFormatView.xaml",
    "WPF\Views\Settings\InvoiceFormatView.xaml.cs",
    "WPF\Views\Settings\UserManagementView.xaml",
    "WPF\Views\Settings\UserManagementView.xaml.cs",
    "WPF\Views\Shared\LoadingView.xaml",
    "WPF\Views\Shared\LoadingView.xaml.cs",
    "WPF\Views\Shared\MessageBoxView.xaml",
    "WPF\Views\Shared\MessageBoxView.xaml.cs",
    "WPF\Views\Shared\ConfirmationView.xaml",
    "WPF\Views\Shared\ConfirmationView.xaml.cs"
)

foreach ($file in $viewFiles) {
    New-Item -ItemType File -Path $file -Force | Out-Null
}

# Create ViewModel Files
$viewModelFiles = @(
    "WPF\ViewModels\BaseViewModel.cs",
    "WPF\ViewModels\MainViewModel.cs",
    "WPF\ViewModels\LoginViewModel.cs",
    "WPF\ViewModels\DashboardViewModel.cs",
    "WPF\ViewModels\CompanyListViewModel.cs",
    "WPF\ViewModels\CompanyDetailViewModel.cs",
    "WPF\ViewModels\TkaListViewModel.cs",
    "WPF\ViewModels\TkaDetailViewModel.cs",
    "WPF\ViewModels\InvoiceListViewModel.cs",
    "WPF\ViewModels\InvoiceCreateViewModel.cs",
    "WPF\ViewModels\InvoiceEditViewModel.cs",
    "WPF\ViewModels\InvoiceImportViewModel.cs",
    "WPF\ViewModels\ReportsViewModel.cs",
    "WPF\ViewModels\SettingsViewModel.cs"
)

foreach ($file in $viewModelFiles) {
    New-Item -ItemType File -Path $file -Force | Out-Null
}

# Create Control Files
$controlFiles = @(
    "WPF\Controls\SearchableComboBox.xaml",
    "WPF\Controls\SearchableComboBox.xaml.cs",
    "WPF\Controls\MultiLineTextBox.xaml",
    "WPF\Controls\MultiLineTextBox.xaml.cs",
    "WPF\Controls\NumericTextBox.xaml",
    "WPF\Controls\NumericTextBox.xaml.cs",
    "WPF\Controls\DatePickerCustom.xaml",
    "WPF\Controls\DatePickerCustom.xaml.cs",
    "WPF\Controls\DataGridCustom.xaml",
    "WPF\Controls\DataGridCustom.xaml.cs",
    "WPF\Controls\FileUploadControl.xaml",
    "WPF\Controls\FileUploadControl.xaml.cs",
    "WPF\Controls\LoadingSpinner.xaml",
    "WPF\Controls\LoadingSpinner.xaml.cs",
    "WPF\Controls\ModernButton.xaml",
    "WPF\Controls\ModernButton.xaml.cs",
    "WPF\Controls\AnimatedCard.xaml",
    "WPF\Controls\AnimatedCard.xaml.cs"
)

foreach ($file in $controlFiles) {
    New-Item -ItemType File -Path $file -Force | Out-Null
}

# Create Helper and Support Files
$supportFiles = @(
    "WPF\Converters\BoolToVisibilityConverter.cs",
    "WPF\Converters\StatusToColorConverter.cs",
    "WPF\Converters\CurrencyConverter.cs",
    "WPF\Converters\DateFormatConverter.cs",
    "WPF\Helpers\RelayCommand.cs",
    "WPF\Helpers\WindowHelper.cs",
    "WPF\Helpers\PrintHelper.cs",
    "WPF\Helpers\ExcelHelper.cs",
    "WPF\Helpers\ValidationHelper.cs",
    "WPF\Helpers\ImportHelper.cs",
    "WPF\Helpers\AnimationHelper.cs",
    "WPF\Helpers\ThemeHelper.cs",
    "WPF\Behaviors\ScrollIntoViewBehavior.cs",
    "WPF\Behaviors\FadeInBehavior.cs",
    "WPF\Behaviors\AutoCompleteTextBoxBehavior.cs",
    "WPF\Services\DialogService.cs",
    "WPF\Services\NavigationService.cs",
    "WPF\Services\NotificationService.cs",
    "WPF\Services\ThemeService.cs",
    "WPF\Services\PerformanceMonitorService.cs",
    "WPF\Performance\VirtualizationHelper.cs",
    "WPF\Performance\LazyLoadingHelper.cs",
    "WPF\Performance\MemoryOptimizer.cs"
)

foreach ($file in $supportFiles) {
    New-Item -ItemType File -Path $file -Force | Out-Null
}

# Create Resource Files
$resourceFiles = @(
    "WPF\Resources\Styles\ButtonStyles.xaml",
    "WPF\Resources\Styles\TextBoxStyles.xaml",
    "WPF\Resources\Styles\DataGridStyles.xaml",
    "WPF\Resources\Styles\WindowStyles.xaml",
    "WPF\Resources\Styles\ModernStyles.xaml",
    "WPF\Resources\Templates\InvoiceTemplate.xaml",
    "WPF\Resources\Templates\ReportTemplate.xaml",
    "WPF\Resources\Templates\ImportTemplate.xaml",
    "WPF\Resources\Templates\CardTemplate.xaml",
    "WPF\Themes\Modern\ModernTheme.xaml",
    "WPF\Themes\Modern\Colors.xaml",
    "WPF\Themes\Modern\Brushes.xaml",
    "WPF\Themes\Dark\DarkTheme.xaml",
    "WPF\Themes\Light\LightTheme.xaml",
    "WPF\Animations\FadeAnimations.xaml",
    "WPF\Animations\SlideAnimations.xaml",
    "WPF\Animations\ScaleAnimations.xaml"
)

foreach ($file in $resourceFiles) {
    New-Item -ItemType File -Path $file -Force | Out-Null
}

# Create project and configuration files
Write-Host "📄 Creating Project Files..." -ForegroundColor Yellow

# Create solution file
$solutionContent = @"
Microsoft Visual Studio Solution File, Format Version 12.00
# Visual Studio Version 17
VisualStudioVersion = 17.0.31903.59
MinimumVisualStudioVersion = 10.0.40219.1
Project("{9A19103F-16F7-4668-BE54-9A1E7A4F7556}") = "InvoiceApp.Core", "Core\InvoiceApp.Core.csproj", "{$(New-Guid)}"
EndProject
Project("{9A19103F-16F7-4668-BE54-9A1E7A4F7556}") = "InvoiceApp.Infrastructure", "Infrastructure\InvoiceApp.Infrastructure.csproj", "{$(New-Guid)}"
EndProject
Project("{9A19103F-16F7-4668-BE54-9A1E7A4F7556}") = "InvoiceApp.Application", "Application\InvoiceApp.Application.csproj", "{$(New-Guid)}"
EndProject
Project("{9A19103F-16F7-4668-BE54-9A1E7A4F7556}") = "InvoiceApp.WPF", "WPF\InvoiceApp.WPF.csproj", "{$(New-Guid)}"
EndProject
Global
	GlobalSection(SolutionConfigurationPlatforms) = preSolution
		Debug|Any CPU = Debug|Any CPU
		Release|Any CPU = Release|Any CPU
	EndGlobalSection
	GlobalSection(ProjectConfigurationPlatforms) = postSolution
	EndGlobalSection
	GlobalSection(SolutionProperties) = preSolution
		HideSolutionNode = FALSE
	EndGlobalSection
EndGlobal
"@

$solutionContent | Out-File -FilePath "InvoiceApp.sln" -Encoding UTF8

# Create project files for each layer
$coreProject = @"
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  
  <ItemGroup>
    <PackageReference Include="FluentValidation" Version="11.8.0" />
    <PackageReference Include="AutoMapper" Version="12.0.1" />
  </ItemGroup>
</Project>
"@

$infrastructureProject = @"
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  
  <ItemGroup>
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.0" />
    <PackageReference Include="Microsoft.AspNetCore.SignalR.Client" Version="8.0.0" />
    <PackageReference Include="iText7" Version="8.0.2" />
    <PackageReference Include="EPPlus" Version="7.0.0" />
    <PackageReference Include="Serilog" Version="3.1.1" />
    <PackageReference Include="Microsoft.Extensions.Caching.Memory" Version="8.0.0" />
    <PackageReference Include="Microsoft.Extensions.Caching.StackExchangeRedis" Version="8.0.0" />
  </ItemGroup>
  
  <ItemGroup>
    <ProjectReference Include="..\Core\InvoiceApp.Core.csproj" />
  </ItemGroup>
</Project>
"@

$applicationProject = @"
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  
  <ItemGroup>
    <PackageReference Include="FluentValidation" Version="11.8.0" />
    <PackageReference Include="AutoMapper" Version="12.0.1" />
    <PackageReference Include="MediatR" Version="12.2.0" />
  </ItemGroup>
  
  <ItemGroup>
    <ProjectReference Include="..\Core\InvoiceApp.Core.csproj" />
    <ProjectReference Include="..\Infrastructure\InvoiceApp.Infrastructure.csproj" />
  </ItemGroup>
</Project>
"@

$wpfProject = @"
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net8.0-windows</TargetFramework>
    <Nullable>enable</Nullable>
    <UseWPF>true</UseWPF>
    <ApplicationIcon>Resources\Images\logo.ico</ApplicationIcon>
    <AssemblyTitle>Invoice Management System</AssemblyTitle>
    <Product>Invoice Management System</Product>
    <Copyright>Copyright © 2024</Copyright>
    <AssemblyVersion>1.0.0.0</AssemblyVersion>
    <FileVersion>1.0.0.0</FileVersion>
  </PropertyGroup>
  
  <ItemGroup>
    <PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="8.0.0" />
    <PackageReference Include="Microsoft.Extensions.Logging" Version="8.0.0" />
    <PackageReference Include="Microsoft.Extensions.Configuration" Version="8.0.0" />
    <PackageReference Include="Microsoft.Extensions.Configuration.Json" Version="8.0.0" />
    <PackageReference Include="CommunityToolkit.Mvvm" Version="8.2.2" />
    <PackageReference Include="MaterialDesignThemes" Version="4.9.0" />
    <PackageReference Include="ModernWpfUI" Version="0.9.6" />
    <PackageReference Include="Microsoft.Xaml.Behaviors.Wpf" Version="1.1.77" />
  </ItemGroup>
  
  <ItemGroup>
    <ProjectReference Include="..\Core\InvoiceApp.Core.csproj" />
    <ProjectReference Include="..\Infrastructure\InvoiceApp.Infrastructure.csproj" />
    <ProjectReference Include="..\Application\InvoiceApp.Application.csproj" />
  </ItemGroup>
  
  <ItemGroup>
    <None Update="appsettings.json">
      <CopyToOutputDirectory>Always</CopyToOutputDirectory>
    </None>
  </ItemGroup>
</Project>
"@

# Write project files
$coreProject | Out-File -FilePath "Core\InvoiceApp.Core.csproj" -Encoding UTF8
$infrastructureProject | Out-File -FilePath "Infrastructure\InvoiceApp.Infrastructure.csproj" -Encoding UTF8
$applicationProject | Out-File -FilePath "Application\InvoiceApp.Application.csproj" -Encoding UTF8
$wpfProject | Out-File -FilePath "WPF\InvoiceApp.WPF.csproj" -Encoding UTF8

# Create configuration files
$appSettings = @"
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=invoice_management;Username=postgres;Password=yourpassword"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "InvoiceSettings": {
    "DefaultVatPercentage": 11.0,
    "AutoSaveInterval": 30,
    "SearchDelayMs": 300,
    "MaxPageSize": 200
  },
  "Performance": {
    "EnableCaching": true,
    "CacheExpirationMinutes": 30,
    "EnableVirtualization": true,
    "LazyLoadingEnabled": true
  },
  "UI": {
    "Theme": "Modern",
    "AnimationsEnabled": true,
    "TransitionDuration": 300
  }
}
"@

$appSettings | Out-File -FilePath "WPF\appsettings.json" -Encoding UTF8

# Create README.md
$readme = @"
# Invoice Management Desktop Application

Modern WPF application for managing invoices with PostgreSQL database.

## Features
- 🚀 High Performance (No Loading Delays)
- 🎨 Modern UI with Smooth Animations
- 🔍 Smart Search with Fuzzy Matching
- 📊 Real-time Dashboard
- 📄 PDF/Excel Export
- 🌙 Dark/Light Theme Support
- 💾 Auto-save & Caching
- 🔐 Role-based Security

## Architecture
- Clean Architecture
- Repository Pattern
- MVVM Pattern
- Dependency Injection
- CQRS with MediatR

## Performance Features
- Memory Caching
- Connection Pooling
- Virtual Scrolling
- Lazy Loading
- Background Tasks
- Query Optimization

## Getting Started

1. Restore NuGet packages:
   ```bash
   dotnet restore
   ```

2. Update database connection in `appsettings.json`

3. Run migrations:
   ```bash
   dotnet ef database update --project Infrastructure
   ```

4. Build and run:
   ```bash
   dotnet build
   dotnet run --project WPF
   ```

## Project Structure
- **Core**: Business entities, interfaces, DTOs
- **Infrastructure**: Data access, repositories, services  
- **Application**: Business logic, commands, queries
- **WPF**: Presentation layer with modern UI

## Technologies
- .NET 8
- WPF with Material Design
- Entity Framework Core
- PostgreSQL
- AutoMapper
- FluentValidation
- MediatR
- SignalR
"@

$readme | Out-File -FilePath "README.md" -Encoding UTF8

Write-Host "✅ Project structure created successfully!" -ForegroundColor Green
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  📁 Folders: $((Get-ChildItem -Recurse -Directory).Count) directories" -ForegroundColor White
Write-Host "  📄 Files: $((Get-ChildItem -Recurse -File).Count) files" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Open solution in Visual Studio: InvoiceApp.sln" -ForegroundColor White
Write-Host "  2. Restore NuGet packages: dotnet restore" -ForegroundColor White  
Write-Host "  3. Configure database connection in appsettings.json" -ForegroundColor White
Write-Host "  4. Start coding! 🎉" -ForegroundColor White
Write-Host ""
Write-Host "💡 Pro Tips:" -ForegroundColor Magenta
Write-Host "  • Use Material Design components for modern UI" -ForegroundColor White
Write-Host "  • Implement caching for instant loading" -ForegroundColor White
Write-Host "  • Add smooth animations for better UX" -ForegroundColor White