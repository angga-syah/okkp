// E:\kp\4 invoice\Infrastructure\Repositories\UserRepository.cs
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Interfaces;
using InvoiceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Infrastructure.Repositories;

public class UserRepository : BaseRepository<User>, IUserRepository
{
    public UserRepository(InvoiceDbContext context, ILogger<UserRepository> logger) 
        : base(context, logger)
    {
    }

    public override async Task<User?> GetByIdAsync(int id)
    {
        try
        {
            return await _dbSet
                .Include(u => u.UserPreferences)
                .FirstOrDefaultAsync(u => u.Id == id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user by ID: {UserId}", id);
            throw;
        }
    }

    public async Task<User?> GetByUsernameAsync(string username)
    {
        try
        {
            return await _dbSet
                .Include(u => u.UserPreferences)
                .FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user by username: {Username}", username);
            throw;
        }
    }

    public override async Task<List<User>> GetAllAsync()
    {
        try
        {
            return await _dbSet
                .Include(u => u.UserPreferences)
                .OrderBy(u => u.FullName)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all users");
            throw;
        }
    }

    public async Task<List<UserPreference>> GetUserPreferencesAsync(int userId)
    {
        try
        {
            return await _context.UserPreferences
                .Where(p => p.UserId == userId)
                .OrderBy(p => p.PreferenceKey)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user preferences for user: {UserId}", userId);
            throw;
        }
    }

    public async Task<UserPreference?> GetUserPreferenceAsync(int userId, string key)
    {
        try
        {
            return await _context.UserPreferences
                .FirstOrDefaultAsync(p => p.UserId == userId && p.PreferenceKey == key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user preference: {UserId}, {Key}", userId, key);
            throw;
        }
    }

    public async Task<UserPreference> AddUserPreferenceAsync(UserPreference preference)
    {
        try
        {
            preference.CreatedAt = DateTime.UtcNow;
            preference.UpdatedAt = DateTime.UtcNow;
            
            var entry = await _context.UserPreferences.AddAsync(preference);
            return entry.Entity;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding user preference");
            throw;
        }
    }

    public UserPreference UpdateUserPreference(UserPreference preference)
    {
        try
        {
            preference.UpdatedAt = DateTime.UtcNow;
            var entry = _context.UserPreferences.Update(preference);
            return entry.Entity;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user preference");
            throw;
        }
    }

    public async Task DeleteUserPreferenceAsync(UserPreference preference)
    {
        try
        {
            _context.UserPreferences.Remove(preference);
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user preference");
            throw;
        }
    }

    public async Task<bool> UsernameExistsAsync(string username, int? excludeUserId = null)
    {
        try
        {
            var query = _dbSet.Where(u => u.Username.ToLower() == username.ToLower());
            
            if (excludeUserId.HasValue)
            {
                query = query.Where(u => u.Id != excludeUserId.Value);
            }
            
            return await query.AnyAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if username exists: {Username}", username);
            throw;
        }
    }

    public async Task<List<User>> GetActiveUsersAsync()
    {
        try
        {
            return await _dbSet
                .Where(u => u.IsActive)
                .OrderBy(u => u.FullName)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting active users");
            throw;
        }
    }

    public async Task<List<User>> GetUsersByRoleAsync(Core.Enums.UserRole role)
    {
        try
        {
            return await _dbSet
                .Where(u => u.Role == role && u.IsActive)
                .OrderBy(u => u.FullName)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting users by role: {Role}", role);
            throw;
        }
    }

    public async Task<PagedResult<User>> GetPagedUsersAsync(
        int pageNumber,
        int pageSize,
        string? searchTerm = null,
        bool? isActive = null,
        Core.Enums.UserRole? role = null,
        string? sortBy = "FullName",
        string? sortDirection = "ASC")
    {
        try
        {
            IQueryable<User> query = _dbSet.Include(u => u.UserPreferences);

            // Apply filters
            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var search = searchTerm.ToLower();
                query = query.Where(u => 
                    u.Username.ToLower().Contains(search) ||
                    u.FullName.ToLower().Contains(search));
            }

            if (isActive.HasValue)
            {
                query = query.Where(u => u.IsActive == isActive.Value);
            }

            if (role.HasValue)
            {
                query = query.Where(u => u.Role == role.Value);
            }

            // Apply sorting
            query = sortBy?.ToLower() switch
            {
                "username" => sortDirection?.ToUpper() == "DESC" 
                    ? query.OrderByDescending(u => u.Username)
                    : query.OrderBy(u => u.Username),
                "role" => sortDirection?.ToUpper() == "DESC"
                    ? query.OrderByDescending(u => u.Role)
                    : query.OrderBy(u => u.Role),
                "createdat" => sortDirection?.ToUpper() == "DESC"
                    ? query.OrderByDescending(u => u.CreatedAt)
                    : query.OrderBy(u => u.CreatedAt),
                "lastlogin" => sortDirection?.ToUpper() == "DESC"
                    ? query.OrderByDescending(u => u.LastLogin)
                    : query.OrderBy(u => u.LastLogin),
                _ => sortDirection?.ToUpper() == "DESC"
                    ? query.OrderByDescending(u => u.FullName)
                    : query.OrderBy(u => u.FullName)
            };

            // Get total count
            var totalCount = await query.CountAsync();

            // Apply pagination
            var users = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<User>
            {
                Items = users,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting paged users");
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetUserStatsAsync()
    {
        try
        {
            var stats = new Dictionary<string, object>();
            
            var totalUsers = await _dbSet.CountAsync();
            var activeUsers = await _dbSet.CountAsync(u => u.IsActive);
            var adminUsers = await _dbSet.CountAsync(u => u.Role == Core.Enums.UserRole.Admin && u.IsActive);
            var viewerUsers = await _dbSet.CountAsync(u => u.Role == Core.Enums.UserRole.Viewer && u.IsActive);
            var recentLogins = await _dbSet.CountAsync(u => u.LastLogin >= DateTime.UtcNow.AddDays(-7));

            stats.Add("TotalUsers", totalUsers);
            stats.Add("ActiveUsers", activeUsers);
            stats.Add("AdminUsers", adminUsers);
            stats.Add("ViewerUsers", viewerUsers);
            stats.Add("RecentLogins", recentLogins);
            stats.Add("InactiveUsers", totalUsers - activeUsers);

            return stats;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user statistics");
            throw;
        }
    }

    public async Task UpdateLastLoginAsync(int userId)
    {
        try
        {
            var user = await GetByIdAsync(userId);
            if (user != null)
            {
                user.LastLogin = DateTime.UtcNow;
                user.UpdatedAt = DateTime.UtcNow;
                Update(user);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating last login for user: {UserId}", userId);
            throw;
        }
    }

    public async Task<List<User>> SearchUsersAsync(string searchTerm, int maxResults = 10)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(searchTerm))
                return new List<User>();

            var search = searchTerm.ToLower();
            
            return await _dbSet
                .Where(u => u.IsActive && (
                    u.Username.ToLower().Contains(search) ||
                    u.FullName.ToLower().Contains(search)))
                .OrderBy(u => u.FullName)
                .Take(maxResults)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching users with term: {SearchTerm}", searchTerm);
            throw;
        }
    }
}