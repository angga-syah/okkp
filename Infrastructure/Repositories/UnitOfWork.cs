// E:\kp\4 invoice\Infrastructure\Repositories\UnitOfWork.cs
using InvoiceApp.Core.Interfaces;
using InvoiceApp.Infrastructure.Data;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Infrastructure.Repositories;

public class UnitOfWork : IUnitOfWork, IDisposable
{
    private readonly InvoiceDbContext _context;
    private readonly ILogger<UnitOfWork> _logger;
    private bool _disposed = false;

    // Repository instances
    private ICompanyRepository? _companyRepository;
    private ITkaWorkerRepository? _tkaWorkerRepository;
    private IInvoiceRepository? _invoiceRepository;
    private IUserRepository? _userRepository;
    private IImportRepository? _importRepository;

    public UnitOfWork(
        InvoiceDbContext context,
        ILogger<UnitOfWork> logger,
        ICompanyRepository companyRepository,
        ITkaWorkerRepository tkaWorkerRepository,
        IInvoiceRepository invoiceRepository,
        IUserRepository userRepository,
        IImportRepository importRepository)
    {
        _context = context;
        _logger = logger;
        _companyRepository = companyRepository;
        _tkaWorkerRepository = tkaWorkerRepository;
        _invoiceRepository = invoiceRepository;
        _userRepository = userRepository;
        _importRepository = importRepository;
    }

    public ICompanyRepository CompanyRepository => 
        _companyRepository ??= new CompanyRepository(_context, _logger.CreateLogger<CompanyRepository>());

    public ITkaWorkerRepository TkaWorkerRepository => 
        _tkaWorkerRepository ??= new TkaWorkerRepository(_context, _logger.CreateLogger<TkaWorkerRepository>());

    public IInvoiceRepository InvoiceRepository => 
        _invoiceRepository ??= new InvoiceRepository(_context, _logger.CreateLogger<InvoiceRepository>());

    public IUserRepository UserRepository => 
        _userRepository ??= new UserRepository(_context, _logger.CreateLogger<UserRepository>());

    public IImportRepository ImportRepository => 
        _importRepository ??= new ImportRepository(_context, _logger.CreateLogger<ImportRepository>());

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _context.SaveChangesAsync(cancellationToken);
            _logger.LogDebug("Saved {ChangeCount} changes to database", result);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving changes to database");
            throw;
        }
    }

    public async Task<bool> SaveChangesReturnBoolAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _context.SaveChangesAsync(cancellationToken);
            return result > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving changes to database");
            throw;
        }
    }

    public async Task BeginTransactionAsync()
    {
        try
        {
            await _context.Database.BeginTransactionAsync();
            _logger.LogDebug("Database transaction started");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error beginning database transaction");
            throw;
        }
    }

    public async Task CommitTransactionAsync()
    {
        try
        {
            await _context.Database.CommitTransactionAsync();
            _logger.LogDebug("Database transaction committed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error committing database transaction");
            throw;
        }
    }

    public async Task RollbackTransactionAsync()
    {
        try
        {
            await _context.Database.RollbackTransactionAsync();
            _logger.LogDebug("Database transaction rolled back");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rolling back database transaction");
            throw;
        }
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed)
        {
            if (disposing)
            {
                _context?.Dispose();
            }
            _disposed = true;
        }
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }
}