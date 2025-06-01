# Invoice Management Desktop Application

Modern WPF application for managing invoices with PostgreSQL database.

## Features
- ðŸš€ High Performance (No Loading Delays)
- ðŸŽ¨ Modern UI with Smooth Animations
- ðŸ” Smart Search with Fuzzy Matching
- ðŸ“Š Real-time Dashboard
- ðŸ“„ PDF/Excel Export
- ðŸŒ™ Dark/Light Theme Support
- ðŸ’¾ Auto-save & Caching
- ðŸ” Role-based Security

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
   `ash
   dotnet restore
   `

2. Update database connection in ppsettings.json

3. Run migrations:
   `ash
   dotnet ef database update --project Infrastructure
   `

4. Build and run:
   `ash
   dotnet build
   dotnet run --project WPF
   `

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
