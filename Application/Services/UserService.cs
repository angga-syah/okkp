// E:\kp\4 invoice\Application\Services\UserService.cs
using AutoMapper;
using FluentValidation;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Enums;
using InvoiceApp.Core.Interfaces;
using InvoiceApp.Core.Interfaces.Services;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using System.Text;

namespace InvoiceApp.Application.Services;

public class UserService : IUserService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<UserService> _logger;
    private readonly IValidator<UserDto> _validator;

    public UserService(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        ILogger<UserService> logger,
        IValidator<UserDto> validator)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _logger = logger;
        _validator = validator;
    }

    public async Task<UserDto?> AuthenticateAsync(string username, string password)
    {
        _logger.LogInformation("Authenticating user: {Username}", username);

        var user = await _unitOfWork.UserRepository.GetByUsernameAsync(username);
        if (user == null || !user.IsActive)
        {
            _logger.LogWarning("Authentication failed for user: {Username} - User not found or inactive", username);
            return null;
        }

        if (!VerifyPassword(password, user.PasswordHash))
        {
            _logger.LogWarning("Authentication failed for user: {Username} - Invalid password", username);
            return null;
        }

        // Update last login
        user.LastLogin = DateTime.UtcNow;
        _unitOfWork.UserRepository.Update(user);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("User authenticated successfully: {Username}", username);
        return _mapper.Map<UserDto>(user);
    }

    public async Task<List<UserDto>> GetUsersAsync()
    {
        _logger.LogInformation("Getting all users");

        var users = await _unitOfWork.UserRepository.GetAllAsync();
        return _mapper.Map<List<UserDto>>(users);
    }

    public async Task<UserDto?> GetUserByIdAsync(int id)
    {
        _logger.LogInformation("Getting user by ID: {UserId}", id);

        var user = await _unitOfWork.UserRepository.GetByIdAsync(id);
        return user != null ? _mapper.Map<UserDto>(user) : null;
    }

    public async Task<UserDto?> GetUserByUsernameAsync(string username)
    {
        _logger.LogInformation("Getting user by username: {Username}", username);

        var user = await _unitOfWork.UserRepository.GetByUsernameAsync(username);
        return user != null ? _mapper.Map<UserDto>(user) : null;
    }

    public async Task<int> CreateUserAsync(UserDto userDto, string password)
    {
        _logger.LogInformation("Creating new user: {Username}", userDto.Username);

        // Validate
        var validationResult = await _validator.ValidateAsync(userDto);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        // Check for duplicate username
        var existingUser = await _unitOfWork.UserRepository.GetByUsernameAsync(userDto.Username);
        if (existingUser != null)
        {
            throw new InvalidOperationException($"Username {userDto.Username} already exists");
        }

        // Create entity
        var user = _mapper.Map<User>(userDto);
        user.PasswordHash = HashPassword(password);
        user.CreatedAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.UserRepository.AddAsync(user);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("User created with ID: {UserId}", user.Id);
        return user.Id;
    }

    public async Task<bool> UpdateUserAsync(UserDto userDto)
    {
        _logger.LogInformation("Updating user {UserId}", userDto.Id);

        var user = await _unitOfWork.UserRepository.GetByIdAsync(userDto.Id);
        if (user == null)
        {
            throw new InvalidOperationException($"User with ID {userDto.Id} not found");
        }

        // Check for duplicate username (excluding current user)
        var existingUser = await _unitOfWork.UserRepository.GetByUsernameAsync(userDto.Username);
        if (existingUser != null && existingUser.Id != userDto.Id)
        {
            throw new InvalidOperationException($"Username {userDto.Username} already exists");
        }

        // Update properties (excluding password)
        user.Username = userDto.Username;
        user.FullName = userDto.FullName;
        user.Role = Enum.Parse<UserRole>(userDto.RoleName, true);
        user.IsActive = userDto.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.UserRepository.Update(user);
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    public async Task<bool> UpdateUserPasswordAsync(int userId, string currentPassword, string newPassword)
    {
        _logger.LogInformation("Updating password for user {UserId}", userId);

        var user = await _unitOfWork.UserRepository.GetByIdAsync(userId);
        if (user == null)
        {
            throw new InvalidOperationException($"User with ID {userId} not found");
        }

        // Verify current password
        if (!VerifyPassword(currentPassword, user.PasswordHash))
        {
            throw new InvalidOperationException("Current password is incorrect");
        }

        // Update password
        user.PasswordHash = HashPassword(newPassword);
        user.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.UserRepository.Update(user);
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    public async Task<bool> ResetUserPasswordAsync(int userId, string newPassword, int adminUserId)
    {
        _logger.LogInformation("Resetting password for user {UserId} by admin {AdminUserId}", userId, adminUserId);

        // Verify admin user has permission
        var adminUser = await _unitOfWork.UserRepository.GetByIdAsync(adminUserId);
        if (adminUser == null || adminUser.Role != UserRole.Admin)
        {
            throw new UnauthorizedAccessException("Only admin users can reset passwords");
        }

        var user = await _unitOfWork.UserRepository.GetByIdAsync(userId);
        if (user == null)
        {
            throw new InvalidOperationException($"User with ID {userId} not found");
        }

        // Update password
        user.PasswordHash = HashPassword(newPassword);
        user.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.UserRepository.Update(user);
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteUserAsync(int id, bool hardDelete = false)
    {
        _logger.LogInformation("Deleting user {UserId} (hard: {HardDelete})", id, hardDelete);

        var user = await _unitOfWork.UserRepository.GetByIdAsync(id);
        if (user == null)
        {
            throw new InvalidOperationException($"User with ID {id} not found");
        }

        // Check if user has created invoices
        var hasInvoices = await _unitOfWork.InvoiceRepository.HasInvoicesByUserAsync(id);
        if (hasInvoices && hardDelete)
        {
            throw new InvalidOperationException("Cannot delete user with existing invoices");
        }

        if (hardDelete)
        {
            await _unitOfWork.UserRepository.DeleteAsync(user);
        }
        else
        {
            user.IsActive = false;
            user.UpdatedAt = DateTime.UtcNow;
            _unitOfWork.UserRepository.Update(user);
        }

        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<UserPreferenceDto>> GetUserPreferencesAsync(int userId)
    {
        _logger.LogInformation("Getting preferences for user {UserId}", userId);

        var preferences = await _unitOfWork.UserRepository.GetUserPreferencesAsync(userId);
        return _mapper.Map<List<UserPreferenceDto>>(preferences);
    }

    public async Task<bool> SaveUserPreferenceAsync(int userId, string key, string value)
    {
        _logger.LogInformation("Saving preference for user {UserId}: {Key}", userId, key);

        var preference = await _unitOfWork.UserRepository.GetUserPreferenceAsync(userId, key);
        
        if (preference == null)
        {
            preference = new UserPreference
            {
                UserId = userId,
                PreferenceKey = key,
                PreferenceValue = value,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _unitOfWork.UserRepository.AddUserPreferenceAsync(preference);
        }
        else
        {
            preference.PreferenceValue = value;
            preference.UpdatedAt = DateTime.UtcNow;
            _unitOfWork.UserRepository.UpdateUserPreference(preference);
        }

        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<string?> GetUserPreferenceAsync(int userId, string key, string? defaultValue = null)
    {
        _logger.LogInformation("Getting preference for user {UserId}: {Key}", userId, key);

        var preference = await _unitOfWork.UserRepository.GetUserPreferenceAsync(userId, key);
        return preference?.PreferenceValue ?? defaultValue;
    }

    public async Task<bool> DeleteUserPreferenceAsync(int userId, string key)
    {
        _logger.LogInformation("Deleting preference for user {UserId}: {Key}", userId, key);

        var preference = await _unitOfWork.UserRepository.GetUserPreferenceAsync(userId, key);
        if (preference != null)
        {
            await _unitOfWork.UserRepository.DeleteUserPreferenceAsync(preference);
            await _unitOfWork.SaveChangesAsync();
        }

        return true;
    }

    public async Task<bool> ValidateUserPermissionAsync(int userId, string permission)
    {
        var user = await _unitOfWork.UserRepository.GetByIdAsync(userId);
        if (user == null || !user.IsActive)
        {
            return false;
        }

        // Simple role-based permission check
        return permission.ToLower() switch
        {
            "create_invoice" => user.Role == UserRole.Admin,
            "edit_invoice" => user.Role == UserRole.Admin,
            "delete_invoice" => user.Role == UserRole.Admin,
            "view_invoice" => true, // Both admin and viewer can view
            "manage_users" => user.Role == UserRole.Admin,
            "manage_companies" => user.Role == UserRole.Admin,
            "manage_tka" => user.Role == UserRole.Admin,
            "export_data" => user.Role == UserRole.Admin,
            "import_data" => user.Role == UserRole.Admin,
            _ => false
        };
    }

    private string HashPassword(string password)
    {
        // Use BCrypt for password hashing in production
        // This is a simplified version for demonstration
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password + "salt"));
        return Convert.ToBase64String(hashedBytes);
    }

    private bool VerifyPassword(string password, string hash)
    {
        var passwordHash = HashPassword(password);
        return passwordHash == hash;
    }
}