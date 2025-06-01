// E:\kp\4 invoice\Infrastructure\Services\Performance\ConnectionPoolService.cs
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using System.Collections.Concurrent;

namespace InvoiceApp.Infrastructure.Services.Performance;

public class ConnectionPoolService : IDisposable
{
    private readonly ILogger<ConnectionPoolService> _logger;
    private readonly string _connectionString;
    private readonly NpgsqlDataSourceBuilder _dataSourceBuilder;
    private readonly NpgsqlDataSource _dataSource;
    private readonly ConcurrentDictionary<string, ConnectionMetrics> _connectionMetrics;
    private readonly Timer _metricsTimer;
    private bool _disposed = false;

    public ConnectionPoolService(IConfiguration configuration, ILogger<ConnectionPoolService> logger)
    {
        _logger = logger;
        _connectionString = configuration.GetConnectionString("DefaultConnection")!;
        _connectionMetrics = new ConcurrentDictionary<string, ConnectionMetrics>();

        // Configure the data source with optimized settings
        _dataSourceBuilder = new NpgsqlDataSourceBuilder(_connectionString);
        ConfigureDataSource();
        
        _dataSource = _dataSourceBuilder.Build();
        
        // Start metrics collection timer
        _metricsTimer = new Timer(CollectMetrics, null, TimeSpan.Zero, TimeSpan.FromMinutes(1));
        
        _logger.LogInformation("Connection Pool Service initialized");
    }

    private void ConfigureDataSource()
    {
        _dataSourceBuilder.ConnectionStringBuilder.Pooling = true;
        _dataSourceBuilder.ConnectionStringBuilder.MaxPoolSize = 100;
        _dataSourceBuilder.ConnectionStringBuilder.MinPoolSize = 10;
        _dataSourceBuilder.ConnectionStringBuilder.ConnectionLifeTime = 900; // 15 minutes
        _dataSourceBuilder.ConnectionStringBuilder.ConnectionIdleLifetime = 300; // 5 minutes
        _dataSourceBuilder.ConnectionStringBuilder.CommandTimeout = 30;
        _dataSourceBuilder.ConnectionStringBuilder.Timeout = 15;
        _dataSourceBuilder.ConnectionStringBuilder.KeepAlive = 30;
        
        // Performance settings
        _dataSourceBuilder.ConnectionStringBuilder.NoResetOnClose = true;
        _dataSourceBuilder.ConnectionStringBuilder.ReadBufferSize = 8192;
        _dataSourceBuilder.ConnectionStringBuilder.WriteBufferSize = 8192;
        
        _logger.LogDebug("Data source configured with optimized connection pool settings");
    }

    public async Task<NpgsqlConnection> GetConnectionAsync(string operationName = "Unknown")
    {
        try
        {
            var connection = await _dataSource.OpenConnectionAsync();
            
            // Track connection metrics
            var metrics = _connectionMetrics.GetOrAdd(operationName, _ => new ConnectionMetrics());
            Interlocked.Increment(ref metrics.TotalConnections);
            Interlocked.Increment(ref metrics.ActiveConnections);
            
            _logger.LogDebug("Connection opened for operation: {OperationName}", operationName);
            return new TrackedConnection(connection, this, operationName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get database connection for operation: {OperationName}", operationName);
            throw;
        }
    }

    internal void OnConnectionClosed(string operationName, TimeSpan duration)
    {
        if (_connectionMetrics.TryGetValue(operationName, out var metrics))
        {
            Interlocked.Decrement(ref metrics.ActiveConnections);
            Interlocked.Add(ref metrics.TotalConnectionTime, (long)duration.TotalMilliseconds);
        }
        
        _logger.LogDebug("Connection closed for operation: {OperationName}, Duration: {Duration}ms", 
            operationName, duration.TotalMilliseconds);
    }

    public ConnectionPoolMetrics GetPoolMetrics()
    {
        var totalActive = _connectionMetrics.Values.Sum(m => m.ActiveConnections);
        var totalConnectionsCreated = _connectionMetrics.Values.Sum(m => m.TotalConnections);
        var averageConnectionTime = _connectionMetrics.Values
            .Where(m => m.TotalConnections > 0)
            .Average(m => (double)m.TotalConnectionTime / m.TotalConnections);

        return new ConnectionPoolMetrics
        {
            ActiveConnections = totalActive,
            TotalConnectionsCreated = totalConnectionsCreated,
            AverageConnectionTimeMs = averageConnectionTime,
            OperationMetrics = _connectionMetrics.ToDictionary(
                kvp => kvp.Key,
                kvp => new OperationConnectionMetrics
                {
                    OperationName = kvp.Key,
                    ActiveConnections = kvp.Value.ActiveConnections,
                    TotalConnections = kvp.Value.TotalConnections,
                    AverageConnectionTimeMs = kvp.Value.TotalConnections > 0 
                        ? (double)kvp.Value.TotalConnectionTime / kvp.Value.TotalConnections 
                        : 0
                })
        };
    }

    private void CollectMetrics(object? state)
    {
        try
        {
            var metrics = GetPoolMetrics();
            _logger.LogDebug("Connection Pool Metrics - Active: {Active}, Total Created: {Total}, Avg Time: {AvgTime}ms",
                metrics.ActiveConnections, metrics.TotalConnectionsCreated, metrics.AverageConnectionTimeMs);

            // Alert on high connection usage
            if (metrics.ActiveConnections > 80) // 80% of max pool size
            {
                _logger.LogWarning("High connection pool usage: {Active} active connections", metrics.ActiveConnections);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting connection pool metrics");
        }
    }

    public async Task<bool> TestConnectionAsync()
    {
        try
        {
            using var connection = await GetConnectionAsync("HealthCheck");
            using var command = new NpgsqlCommand("SELECT 1", connection);
            var result = await command.ExecuteScalarAsync();
            return result != null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Connection test failed");
            return false;
        }
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            _metricsTimer?.Dispose();
            _dataSource?.Dispose();
            _disposed = true;
            _logger.LogInformation("Connection Pool Service disposed");
        }
    }
}

// Helper classes
public class ConnectionMetrics
{
    public long ActiveConnections;
    public long TotalConnections;
    public long TotalConnectionTime; // in milliseconds
}

public class ConnectionPoolMetrics
{
    public long ActiveConnections { get; set; }
    public long TotalConnectionsCreated { get; set; }
    public double AverageConnectionTimeMs { get; set; }
    public Dictionary<string, OperationConnectionMetrics> OperationMetrics { get; set; } = new();
}

public class OperationConnectionMetrics
{
    public string OperationName { get; set; } = string.Empty;
    public long ActiveConnections { get; set; }
    public long TotalConnections { get; set; }
    public double AverageConnectionTimeMs { get; set; }
}

public class TrackedConnection : NpgsqlConnection
{
    private readonly NpgsqlConnection _innerConnection;
    private readonly ConnectionPoolService _poolService;
    private readonly string _operationName;
    private readonly DateTime _openedAt;
    private bool _disposed = false;

    public TrackedConnection(NpgsqlConnection innerConnection, ConnectionPoolService poolService, string operationName)
    {
        _innerConnection = innerConnection;
        _poolService = poolService;
        _operationName = operationName;
        _openedAt = DateTime.UtcNow;
    }

    public override string ConnectionString 
    { 
        get => _innerConnection.ConnectionString; 
        set => _innerConnection.ConnectionString = value; 
    }

    public override string Database => _innerConnection.Database;
    public override ConnectionState State => _innerConnection.State;
    public override string DataSource => _innerConnection.DataSource;
    public override string ServerVersion => _innerConnection.ServerVersion;

    protected override DbTransaction BeginDbTransaction(IsolationLevel isolationLevel)
    {
        return _innerConnection.BeginTransaction(isolationLevel);
    }

    public override void ChangeDatabase(string databaseName)
    {
        _innerConnection.ChangeDatabase(databaseName);
    }

    public override void Close()
    {
        if (!_disposed)
        {
            var duration = DateTime.UtcNow - _openedAt;
            _poolService.OnConnectionClosed(_operationName, duration);
            _innerConnection.Close();
            _disposed = true;
        }
    }

    protected override DbCommand CreateDbCommand()
    {
        return _innerConnection.CreateCommand();
    }

    public override void Open()
    {
        _innerConnection.Open();
    }

    public override Task OpenAsync(CancellationToken cancellationToken)
    {
        return _innerConnection.OpenAsync(cancellationToken);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing && !_disposed)
        {
            Close();
        }
        base.Dispose(disposing);
    }
}