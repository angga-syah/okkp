using System.Windows.Input;

namespace InvoiceApp.WPF.Helpers;

/// <summary>
/// A command whose sole purpose is to relay its functionality to other
/// objects by invoking delegates. The default return value for the CanExecute
/// method is 'true'.
/// </summary>
public class RelayCommand : ICommand
{
    private readonly Action _execute;
    private readonly Func<bool>? _canExecute;

    /// <summary>
    /// Initializes a new instance of RelayCommand that can always execute.
    /// </summary>
    /// <param name="execute">The execution logic.</param>
    public RelayCommand(Action execute) : this(execute, null)
    {
    }

    /// <summary>
    /// Initializes a new instance of RelayCommand.
    /// </summary>
    /// <param name="execute">The execution logic.</param>
    /// <param name="canExecute">The execution status logic.</param>
    public RelayCommand(Action execute, Func<bool>? canExecute)
    {
        _execute = execute ?? throw new ArgumentNullException(nameof(execute));
        _canExecute = canExecute;
    }

    /// <summary>
    /// Occurs when changes occur that affect whether or not the command should execute.
    /// </summary>
    public event EventHandler? CanExecuteChanged
    {
        add { CommandManager.RequerySuggested += value; }
        remove { CommandManager.RequerySuggested -= value; }
    }

    /// <summary>
    /// Defines the method that determines whether the command can execute in its current state.
    /// </summary>
    /// <param name="parameter">Data used by the command. If the command does not require data to be passed, this object can be set to null.</param>
    /// <returns>true if this command can be executed; otherwise, false.</returns>
    public bool CanExecute(object? parameter)
    {
        return _canExecute?.Invoke() ?? true;
    }

    /// <summary>
    /// Defines the method to be called when the command is invoked.
    /// </summary>
    /// <param name="parameter">Data used by the command. If the command does not require data to be passed, this object can be set to null.</param>
    public void Execute(object? parameter)
    {
        _execute();
    }

    /// <summary>
    /// Method used to raise the CanExecuteChanged event to indicate that the return value of the CanExecute method has changed.
    /// </summary>
    public void RaiseCanExecuteChanged()
    {
        CommandManager.InvalidateRequerySuggested();
    }
}

/// <summary>
/// A generic command whose sole purpose is to relay its functionality to other
/// objects by invoking delegates. The default return value for the CanExecute
/// method is 'true'.
/// </summary>
/// <typeparam name="T">The type of the command parameter.</typeparam>
public class RelayCommand<T> : ICommand
{
    private readonly Action<T?> _execute;
    private readonly Predicate<T?>? _canExecute;

    /// <summary>
    /// Initializes a new instance of RelayCommand that can always execute.
    /// </summary>
    /// <param name="execute">The execution logic.</param>
    public RelayCommand(Action<T?> execute) : this(execute, null)
    {
    }

    /// <summary>
    /// Initializes a new instance of RelayCommand.
    /// </summary>
    /// <param name="execute">The execution logic.</param>
    /// <param name="canExecute">The execution status logic.</param>
    public RelayCommand(Action<T?> execute, Predicate<T?>? canExecute)
    {
        _execute = execute ?? throw new ArgumentNullException(nameof(execute));
        _canExecute = canExecute;
    }

    /// <summary>
    /// Occurs when changes occur that affect whether or not the command should execute.
    /// </summary>
    public event EventHandler? CanExecuteChanged
    {
        add { CommandManager.RequerySuggested += value; }
        remove { CommandManager.RequerySuggested -= value; }
    }

    /// <summary>
    /// Defines the method that determines whether the command can execute in its current state.
    /// </summary>
    /// <param name="parameter">Data used by the command. If the command does not require data to be passed, this object can be set to null.</param>
    /// <returns>true if this command can be executed; otherwise, false.</returns>
    public bool CanExecute(object? parameter)
    {
        return _canExecute?.Invoke((T?)parameter) ?? true;
    }

    /// <summary>
    /// Defines the method to be called when the command is invoked.
    /// </summary>
    /// <param name="parameter">Data used by the command. If the command does not require data to be passed, this object can be set to null.</param>
    public void Execute(object? parameter)
    {
        _execute((T?)parameter);
    }

    /// <summary>
    /// Method used to raise the CanExecuteChanged event to indicate that the return value of the CanExecute method has changed.
    /// </summary>
    public void RaiseCanExecuteChanged()
    {
        CommandManager.InvalidateRequerySuggested();
    }
}

/// <summary>
/// An async command implementation that supports async/await patterns.
/// </summary>
public class AsyncRelayCommand : ICommand
{
    private readonly Func<Task> _execute;
    private readonly Func<bool>? _canExecute;
    private bool _isExecuting;

    /// <summary>
    /// Initializes a new instance of AsyncRelayCommand that can always execute.
    /// </summary>
    /// <param name="execute">The async execution logic.</param>
    public AsyncRelayCommand(Func<Task> execute) : this(execute, null)
    {
    }

    /// <summary>
    /// Initializes a new instance of AsyncRelayCommand.
    /// </summary>
    /// <param name="execute">The async execution logic.</param>
    /// <param name="canExecute">The execution status logic.</param>
    public AsyncRelayCommand(Func<Task> execute, Func<bool>? canExecute)
    {
        _execute = execute ?? throw new ArgumentNullException(nameof(execute));
        _canExecute = canExecute;
    }

    /// <summary>
    /// Occurs when changes occur that affect whether or not the command should execute.
    /// </summary>
    public event EventHandler? CanExecuteChanged
    {
        add { CommandManager.RequerySuggested += value; }
        remove { CommandManager.RequerySuggested -= value; }
    }

    /// <summary>
    /// Gets a value indicating whether the command is currently executing.
    /// </summary>
    public bool IsExecuting => _isExecuting;

    /// <summary>
    /// Defines the method that determines whether the command can execute in its current state.
    /// </summary>
    /// <param name="parameter">Data used by the command.</param>
    /// <returns>true if this command can be executed; otherwise, false.</returns>
    public bool CanExecute(object? parameter)
    {
        return !_isExecuting && (_canExecute?.Invoke() ?? true);
    }

    /// <summary>
    /// Defines the method to be called when the command is invoked.
    /// </summary>
    /// <param name="parameter">Data used by the command.</param>
    public async void Execute(object? parameter)
    {
        await ExecuteAsync();
    }

    /// <summary>
    /// Executes the command asynchronously.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task ExecuteAsync()
    {
        if (_isExecuting) return;

        _isExecuting = true;
        RaiseCanExecuteChanged();

        try
        {
            await _execute();
        }
        finally
        {
            _isExecuting = false;
            RaiseCanExecuteChanged();
        }
    }

    /// <summary>
    /// Method used to raise the CanExecuteChanged event.
    /// </summary>
    public void RaiseCanExecuteChanged()
    {
        CommandManager.InvalidateRequerySuggested();
    }
}

/// <summary>
/// A generic async command implementation that supports async/await patterns.
/// </summary>
/// <typeparam name="T">The type of the command parameter.</typeparam>
public class AsyncRelayCommand<T> : ICommand
{
    private readonly Func<T?, Task> _execute;
    private readonly Predicate<T?>? _canExecute;
    private bool _isExecuting;

    /// <summary>
    /// Initializes a new instance of AsyncRelayCommand that can always execute.
    /// </summary>
    /// <param name="execute">The async execution logic.</param>
    public AsyncRelayCommand(Func<T?, Task> execute) : this(execute, null)
    {
    }

    /// <summary>
    /// Initializes a new instance of AsyncRelayCommand.
    /// </summary>
    /// <param name="execute">The async execution logic.</param>
    /// <param name="canExecute">The execution status logic.</param>
    public AsyncRelayCommand(Func<T?, Task> execute, Predicate<T?>? canExecute)
    {
        _execute = execute ?? throw new ArgumentNullException(nameof(execute));
        _canExecute = canExecute;
    }

    /// <summary>
    /// Occurs when changes occur that affect whether or not the command should execute.
    /// </summary>
    public event EventHandler? CanExecuteChanged
    {
        add { CommandManager.RequerySuggested += value; }
        remove { CommandManager.RequerySuggested -= value; }
    }

    /// <summary>
    /// Gets a value indicating whether the command is currently executing.
    /// </summary>
    public bool IsExecuting => _isExecuting;

    /// <summary>
    /// Defines the method that determines whether the command can execute in its current state.
    /// </summary>
    /// <param name="parameter">Data used by the command.</param>
    /// <returns>true if this command can be executed; otherwise, false.</returns>
    public bool CanExecute(object? parameter)
    {
        return !_isExecuting && (_canExecute?.Invoke((T?)parameter) ?? true);
    }

    /// <summary>
    /// Defines the method to be called when the command is invoked.
    /// </summary>
    /// <param name="parameter">Data used by the command.</param>
    public async void Execute(object? parameter)
    {
        await ExecuteAsync((T?)parameter);
    }

    /// <summary>
    /// Executes the command asynchronously.
    /// </summary>
    /// <param name="parameter">The command parameter.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task ExecuteAsync(T? parameter)
    {
        if (_isExecuting) return;

        _isExecuting = true;
        RaiseCanExecuteChanged();

        try
        {
            await _execute(parameter);
        }
        finally
        {
            _isExecuting = false;
            RaiseCanExecuteChanged();
        }
    }

    /// <summary>
    /// Method used to raise the CanExecuteChanged event.
    /// </summary>
    public void RaiseCanExecuteChanged()
    {
        CommandManager.InvalidateRequerySuggested();
    }
}

/// <summary>
/// A command that can be cancelled during execution.
/// </summary>
public class CancellableAsyncRelayCommand : ICommand
{
    private readonly Func<CancellationToken, Task> _execute;
    private readonly Func<bool>? _canExecute;
    private CancellationTokenSource? _cancellationTokenSource;
    private bool _isExecuting;

    /// <summary>
    /// Initializes a new instance of CancellableAsyncRelayCommand.
    /// </summary>
    /// <param name="execute">The async execution logic that accepts a cancellation token.</param>
    /// <param name="canExecute">The execution status logic.</param>
    public CancellableAsyncRelayCommand(Func<CancellationToken, Task> execute, Func<bool>? canExecute = null)
    {
        _execute = execute ?? throw new ArgumentNullException(nameof(execute));
        _canExecute = canExecute;
    }

    /// <summary>
    /// Occurs when changes occur that affect whether or not the command should execute.
    /// </summary>
    public event EventHandler? CanExecuteChanged
    {
        add { CommandManager.RequerySuggested += value; }
        remove { CommandManager.RequerySuggested -= value; }
    }

    /// <summary>
    /// Gets a value indicating whether the command is currently executing.
    /// </summary>
    public bool IsExecuting => _isExecuting;

    /// <summary>
    /// Gets a value indicating whether the command can be cancelled.
    /// </summary>
    public bool CanCancel => _isExecuting && _cancellationTokenSource != null && !_cancellationTokenSource.Token.IsCancellationRequested;

    /// <summary>
    /// Defines the method that determines whether the command can execute in its current state.
    /// </summary>
    /// <param name="parameter">Data used by the command.</param>
    /// <returns>true if this command can be executed; otherwise, false.</returns>
    public bool CanExecute(object? parameter)
    {
        return !_isExecuting && (_canExecute?.Invoke() ?? true);
    }

    /// <summary>
    /// Defines the method to be called when the command is invoked.
    /// </summary>
    /// <param name="parameter">Data used by the command.</param>
    public async void Execute(object? parameter)
    {
        await ExecuteAsync();
    }

    /// <summary>
    /// Executes the command asynchronously.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task ExecuteAsync()
    {
        if (_isExecuting) return;

        _isExecuting = true;
        _cancellationTokenSource = new CancellationTokenSource();
        RaiseCanExecuteChanged();

        try
        {
            await _execute(_cancellationTokenSource.Token);
        }
        catch (OperationCanceledException)
        {
            // Command was cancelled, this is expected
        }
        finally
        {
            _isExecuting = false;
            _cancellationTokenSource?.Dispose();
            _cancellationTokenSource = null;
            RaiseCanExecuteChanged();
        }
    }

    /// <summary>
    /// Cancels the current execution if possible.
    /// </summary>
    public void Cancel()
    {
        if (CanCancel)
        {
            _cancellationTokenSource?.Cancel();
        }
    }

    /// <summary>
    /// Method used to raise the CanExecuteChanged event.
    /// </summary>
    public void RaiseCanExecuteChanged()
    {
        CommandManager.InvalidateRequerySuggested();
    }
}

/// <summary>
/// Extension methods for command creation.
/// </summary>
public static class CommandExtensions
{
    /// <summary>
    /// Creates a RelayCommand from an action.
    /// </summary>
    /// <param name="execute">The action to execute.</param>
    /// <param name="canExecute">The function that determines if the command can execute.</param>
    /// <returns>A new RelayCommand.</returns>
    public static RelayCommand ToCommand(this Action execute, Func<bool>? canExecute = null)
    {
        return new RelayCommand(execute, canExecute);
    }

    /// <summary>
    /// Creates a RelayCommand from an action with parameter.
    /// </summary>
    /// <typeparam name="T">The type of the command parameter.</typeparam>
    /// <param name="execute">The action to execute.</param>
    /// <param name="canExecute">The function that determines if the command can execute.</param>
    /// <returns>A new RelayCommand.</returns>
    public static RelayCommand<T> ToCommand<T>(this Action<T?> execute, Predicate<T?>? canExecute = null)
    {
        return new RelayCommand<T>(execute, canExecute);
    }

    /// <summary>
    /// Creates an AsyncRelayCommand from an async function.
    /// </summary>
    /// <param name="execute">The async function to execute.</param>
    /// <param name="canExecute">The function that determines if the command can execute.</param>
    /// <returns>A new AsyncRelayCommand.</returns>
    public static AsyncRelayCommand ToAsyncCommand(this Func<Task> execute, Func<bool>? canExecute = null)
    {
        return new AsyncRelayCommand(execute, canExecute);
    }

    /// <summary>
    /// Creates an AsyncRelayCommand from an async function with parameter.
    /// </summary>
    /// <typeparam name="T">The type of the command parameter.</typeparam>
    /// <param name="execute">The async function to execute.</param>
    /// <param name="canExecute">The function that determines if the command can execute.</param>
    /// <returns>A new AsyncRelayCommand.</returns>
    public static AsyncRelayCommand<T> ToAsyncCommand<T>(this Func<T?, Task> execute, Predicate<T?>? canExecute = null)
    {
        return new AsyncRelayCommand<T>(execute, canExecute);
    }

    /// <summary>
    /// Creates a CancellableAsyncRelayCommand from an async function.
    /// </summary>
    /// <param name="execute">The async function to execute with cancellation support.</param>
    /// <param name="canExecute">The function that determines if the command can execute.</param>
    /// <returns>A new CancellableAsyncRelayCommand.</returns>
    public static CancellableAsyncRelayCommand ToCancellableAsyncCommand(this Func<CancellationToken, Task> execute, Func<bool>? canExecute = null)
    {
        return new CancellableAsyncRelayCommand(execute, canExecute);
    }
}