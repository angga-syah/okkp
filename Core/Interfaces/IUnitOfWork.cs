// E:\kp\4 invoice\Core\Interfaces\IUnitOfWork.cs
namespace InvoiceApp.Core.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IUserRepository UserRepository { get; }
    ICompanyRepository CompanyRepository { get; }
    ITkaWorkerRepository TkaWorkerRepository { get; }
    IInvoiceRepository InvoiceRepository { get; }
    IImportRepository ImportRepository { get; }
    ISettingsRepository SettingsRepository { get; }
    
    Task<int> SaveChangesAsync();
    Task BeginTransactionAsync();
    Task CommitTransactionAsync();
    Task RollbackTransactionAsync();
}