// E:\kp\4 invoice\Core\Interfaces\Services\ISecurityService.cs
namespace InvoiceApp.Core.Interfaces.Services;

public interface ISecurityService
{
    Task<bool> ValidatePermissionAsync(int userId, string permission);
    Task<bool> ValidatePermissionAsync(int userId, string resource, string action);
    Task<List<string>> GetUserPermissionsAsync(int userId);
    Task<bool> IsUserInRoleAsync(int userId, string role);
    Task<string> HashPasswordAsync(string password);
    Task<bool> VerifyPasswordAsync(string password, string hash);
    Task<string> GenerateTokenAsync(int userId, TimeSpan expiration);
    Task<bool> ValidateTokenAsync(string token);
    Task<int?> GetUserIdFromTokenAsync(string token);
    Task RevokeTokenAsync(string token);
    Task<string> EncryptDataAsync(string data);
    Task<string> DecryptDataAsync(string encryptedData);
    Task LogSecurityEventAsync(string eventType, int? userId, string details, string? ipAddress = null);
    Task<bool> IsAccountLockedAsync(int userId);
    Task LockAccountAsync(int userId, TimeSpan? duration = null);
    Task UnlockAccountAsync(int userId);
}