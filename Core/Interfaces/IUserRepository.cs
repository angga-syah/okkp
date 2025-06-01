// E:\kp\4 invoice\Core\Interfaces\IUserRepository.cs
using InvoiceApp.Core.Entities;

namespace InvoiceApp.Core.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(int id);
    Task<User?> GetByUsernameAsync(string username);
    Task<List<User>> GetAllAsync();
    Task<User> AddAsync(User user);
    Task<User> UpdateAsync(User user);
    Task DeleteAsync(User user);
    Task<List<UserPreference>> GetUserPreferencesAsync(int userId);
    Task<UserPreference?> GetUserPreferenceAsync(int userId, string key);
    Task<UserPreference> AddUserPreferenceAsync(UserPreference preference);
    Task<UserPreference> UpdateUserPreference(UserPreference preference);
    Task DeleteUserPreferenceAsync(UserPreference preference);
}