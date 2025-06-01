// E:\kp\4 invoice\Core\Interfaces\Services\IUserService.cs
using InvoiceApp.Core.DTOs;

namespace InvoiceApp.Core.Interfaces.Services;

public interface IUserService
{
    Task<UserDto?> AuthenticateAsync(string username, string password);
    Task<List<UserDto>> GetUsersAsync();
    Task<UserDto?> GetUserByIdAsync(int id);
    Task<UserDto?> GetUserByUsernameAsync(string username);
    Task<int> CreateUserAsync(UserDto userDto, string password);
    Task<bool> UpdateUserAsync(UserDto userDto);
    Task<bool> UpdateUserPasswordAsync(int userId, string currentPassword, string newPassword);
    Task<bool> ResetUserPasswordAsync(int userId, string newPassword, int adminUserId);
    Task<bool> DeleteUserAsync(int id, bool hardDelete = false);
    Task<List<UserPreferenceDto>> GetUserPreferencesAsync(int userId);
    Task<bool> SaveUserPreferenceAsync(int userId, string key, string value);
    Task<string?> GetUserPreferenceAsync(int userId, string key, string? defaultValue = null);
    Task<bool> DeleteUserPreferenceAsync(int userId, string key);
    Task<bool> ValidateUserPermissionAsync(int userId, string permission);
}