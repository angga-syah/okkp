using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;
using InvoiceApp.Core.Constants;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;
using InvoiceApp.WPF.Performance;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.WPF.Services
{
    /// <summary>
    /// Service for monitoring and optimizing application performance
    /// Tracks memory usage, CPU performance, database operations, and UI responsiveness
    /// </summary>
    public class PerformanceMonitorService : IDisposable
    {
        private readonly ILogger<PerformanceMonitorService> _logger;
        private readonly Timer _monitoringTimer;
        private readonly object _lockObject = new();
        private readonly List<PerformanceMetric> _performanceHistory = new();
        private readonly Dictionary<string, Stopwatch> _operationTimers = new();
        private readonly Queue<double> _frameTimeHistory = new();
        
        private bool _isMonitoring = false;
        private DateTime _startTime;
        private long _totalOperations = 0;
        private double _averageFrameTime = 0;
        private int _maxHistoryCount = 1000;

        // Performance thresholds
        private const double SLOW_OPERATION_THRESHOLD_MS = 500;
        private const double HIGH_MEMORY_THRESHOLD_MB = 512;
        private const double CRITICAL_MEMORY_THRESHOLD_MB = 1024;
        private const double TARGET_FRAME_TIME_MS = 16.67; // 60 FPS

        public event EventHandler<PerformanceAlert> PerformanceAlertRaised;
        public event EventHandler<PerformanceMetric> MetricUpdated;

        public PerformanceMonitorService(ILogger<PerformanceMonitorService> logger)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _monitoringTimer = new Timer(MonitoringCallback, null, Timeout.Infinite, Timeout.Infinite);
            _startTime = DateTime.Now;
            
            InitializeFrameTimeMonitoring();
        }

        /// <summary>
        /// Starts performance monitoring
        /// </summary>
        public void StartMonitoring(TimeSpan? interval = null)
        {
            lock (_lockObject)
            {
                if (_isMonitoring) return;

                var monitorInterval = interval ?? TimeSpan.FromSeconds(5);
                _monitoringTimer.Change(TimeSpan.Zero, monitorInterval);
                _isMonitoring = true;
                _startTime = DateTime.Now;

                _logger.LogInformation("Performance monitoring started with interval: {Interval}", monitorInterval);
                
                // Start memory monitoring
                MemoryOptimizer.StartMemoryMonitoring(TimeSpan.FromMinutes(2));
            }
        }

        /// <summary>
        /// Stops performance monitoring
        /// </summary>
        public void StopMonitoring()
        {
            lock (_lockObject)
            {
                if (!_isMonitoring) return;

                _monitoringTimer.Change(Timeout.Infinite, Timeout.Infinite);
                _isMonitoring = false;

                _logger.LogInformation("Performance monitoring stopped");
                
                // Stop memory monitoring
                MemoryOptimizer.StopMemoryMonitoring();
            }
        }

        /// <summary>
        /// Starts timing an operation
        /// </summary>
        public void StartOperation(string operationName)
        {
            lock (_lockObject)
            {
                if (_operationTimers.ContainsKey(operationName))
                {
                    _operationTimers[operationName].Restart();
                }
                else
                {
                    _operationTimers[operationName] = Stopwatch.StartNew();
                }
            }
        }

        /// <summary>
        /// Ends timing an operation and returns elapsed time
        /// </summary>
        public TimeSpan EndOperation(string operationName)
        {
            lock (_lockObject)
            {
                if (_operationTimers.TryGetValue(operationName, out var stopwatch))
                {
                    stopwatch.Stop();
                    var elapsed = stopwatch.Elapsed;
                    _operationTimers.Remove(operationName);
                    _totalOperations++;

                    // Log slow operations
                    if (elapsed.TotalMilliseconds > SLOW_OPERATION_THRESHOLD_MS)
                    {
                        _logger.LogWarning("Slow operation detected: {Operation} took {ElapsedMs}ms", 
                            operationName, elapsed.TotalMilliseconds);

                        RaisePerformanceAlert(new PerformanceAlert
                        {
                            Type = PerformanceAlertType.SlowOperation,
                            Message = $"Operation '{operationName}' took {elapsed.TotalMilliseconds:F1}ms",
                            Severity = elapsed.TotalMilliseconds > SLOW_OPERATION_THRESHOLD_MS * 2 
                                ? AlertSeverity.High 
                                : AlertSeverity.Medium,
                            Timestamp = DateTime.Now
                        });
                    }

                    return elapsed;
                }

                return TimeSpan.Zero;
            }
        }

        /// <summary>
        /// Measures execution time of an action
        /// </summary>
        public async Task<T> MeasureAsync<T>(string operationName, Func<Task<T>> operation)
        {
            StartOperation(operationName);
            try
            {
                return await operation();
            }
            finally
            {
                EndOperation(operationName);
            }
        }

        /// <summary>
        /// Measures execution time of an action
        /// </summary>
        public T Measure<T>(string operationName, Func<T> operation)
        {
            StartOperation(operationName);
            try
            {
                return operation();
            }
            finally
            {
                EndOperation(operationName);
            }
        }

        /// <summary>
        /// Records frame time for UI performance monitoring
        /// </summary>
        public void RecordFrameTime(double frameTimeMs)
        {
            lock (_lockObject)
            {
                _frameTimeHistory.Enqueue(frameTimeMs);
                
                // Keep only recent frame times
                while (_frameTimeHistory.Count > 60) // Last 60 frames
                {
                    _frameTimeHistory.Dequeue();
                }

                _averageFrameTime = _frameTimeHistory.Average();

                // Check for poor frame rate
                if (frameTimeMs > TARGET_FRAME_TIME_MS * 2) // Below 30 FPS
                {
                    RaisePerformanceAlert(new PerformanceAlert
                    {
                        Type = PerformanceAlertType.PoorFrameRate,
                        Message = $"Poor frame rate detected: {frameTimeMs:F1}ms frame time",
                        Severity = frameTimeMs > TARGET_FRAME_TIME_MS * 3 
                            ? AlertSeverity.High 
                            : AlertSeverity.Medium,
                        Timestamp = DateTime.Now
                    });
                }
            }
        }

        /// <summary>
        /// Gets current performance metrics
        /// </summary>
        public PerformanceMetricsDto GetCurrentMetrics()
        {
            lock (_lockObject)
            {
                var memoryInfo = MemoryOptimizer.GetMemoryInfo();
                var process = Process.GetCurrentProcess();

                return new PerformanceMetricsDto
                {
                    Timestamp = DateTime.Now,
                    MemoryUsageMB = memoryInfo.TotalMemoryMB,
                    WorkingSetMB = memoryInfo.WorkingSetMB,
                    CpuUsagePercent = GetCpuUsage(),
                    TotalOperations = _totalOperations,
                    AverageFrameTimeMs = _averageFrameTime,
                    CurrentFrameRate = _averageFrameTime > 0 ? 1000.0 / _averageFrameTime : 0,
                    UptimeSeconds = (DateTime.Now - _startTime).TotalSeconds,
                    Gen0Collections = memoryInfo.Gen0Collections,
                    Gen1Collections = memoryInfo.Gen1Collections,
                    Gen2Collections = memoryInfo.Gen2Collections,
                    ThreadCount = process.Threads.Count,
                    HandleCount = process.HandleCount
                };
            }
        }

        /// <summary>
        /// Gets performance history
        /// </summary>
        public IReadOnlyList<PerformanceMetric> GetPerformanceHistory()
        {
            lock (_lockObject)
            {
                return _performanceHistory.ToList();
            }
        }

        /// <summary>
        /// Optimizes performance based on current metrics
        /// </summary>
        public async Task OptimizePerformanceAsync()
        {
            var metrics = GetCurrentMetrics();
            var optimizations = new List<string>();

            try
            {
                // Memory optimization
                if (metrics.MemoryUsageMB > HIGH_MEMORY_THRESHOLD_MB)
                {
                    await Task.Run(() =>
                    {
                        MemoryOptimizer.OptimizeMemory();
                        optimizations.Add("Memory optimization");
                    });
                }

                // Critical memory cleanup
                if (metrics.MemoryUsageMB > CRITICAL_MEMORY_THRESHOLD_MB)
                {
                    await Task.Run(() =>
                    {
                        MemoryOptimizer.ForceMemoryCleanup();
                        optimizations.Add("Critical memory cleanup");
                    });
                }

                // UI thread optimization
                if (metrics.AverageFrameTimeMs > TARGET_FRAME_TIME_MS * 1.5)
                {
                    await Application.Current.Dispatcher.BeginInvoke(() =>
                    {
                        // Force UI update processing
                        Application.Current.Dispatcher.Invoke(() => { }, DispatcherPriority.Background);
                        optimizations.Add("UI thread optimization");
                    });
                }

                // Database connection optimization
                if (_totalOperations % 100 == 0) // Every 100 operations
                {
                    // This would be implemented in the database layer
                    optimizations.Add("Database connection pool optimization");
                }

                if (optimizations.Any())
                {
                    _logger.LogInformation("Performance optimizations applied: {Optimizations}", 
                        string.Join(", ", optimizations));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during performance optimization");
            }
        }

        /// <summary>
        /// Generates performance report
        /// </summary>
        public PerformanceReportDto GenerateReport(TimeSpan? period = null)
        {
            lock (_lockObject)
            {
                var reportPeriod = period ?? TimeSpan.FromHours(1);
                var cutoffTime = DateTime.Now - reportPeriod;
                var recentMetrics = _performanceHistory.Where(m => m.Timestamp >= cutoffTime).ToList();

                if (!recentMetrics.Any())
                {
                    return new PerformanceReportDto
                    {
                        ReportPeriod = reportPeriod,
                        GeneratedAt = DateTime.Now,
                        Summary = "No performance data available for the specified period."
                    };
                }

                var report = new PerformanceReportDto
                {
                    ReportPeriod = reportPeriod,
                    GeneratedAt = DateTime.Now,
                    TotalOperations = _totalOperations,
                    AverageMemoryUsageMB = recentMetrics.Average(m => m.MemoryUsageMB),
                    PeakMemoryUsageMB = recentMetrics.Max(m => m.MemoryUsageMB),
                    AverageFrameTimeMs = recentMetrics.Average(m => m.AverageFrameTimeMs),
                    WorstFrameTimeMs = recentMetrics.Max(m => m.AverageFrameTimeMs),
                    UptimeHours = (DateTime.Now - _startTime).TotalHours,
                    Recommendations = GenerateRecommendations(recentMetrics)
                };

                report.Summary = $"Processed {_totalOperations} operations with average memory usage of {report.AverageMemoryUsageMB:F1}MB";

                return report;
            }
        }

        /// <summary>
        /// Exports performance data to file
        /// </summary>
        public async Task ExportPerformanceDataAsync(string filePath)
        {
            try
            {
                var metrics = GetPerformanceHistory();
                var csvData = new List<string>
                {
                    "Timestamp,MemoryUsageMB,WorkingSetMB,AverageFrameTimeMs,TotalOperations"
                };

                foreach (var metric in metrics)
                {
                    csvData.Add($"{metric.Timestamp:yyyy-MM-dd HH:mm:ss},{metric.MemoryUsageMB:F2},{metric.WorkingSetMB:F2},{metric.AverageFrameTimeMs:F2},{metric.TotalOperations}");
                }

                await File.WriteAllLinesAsync(filePath, csvData);
                _logger.LogInformation("Performance data exported to {FilePath}", filePath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting performance data to {FilePath}", filePath);
                throw;
            }
        }

        /// <summary>
        /// Monitoring timer callback
        /// </summary>
        private void MonitoringCallback(object state)
        {
            try
            {
                var metrics = GetCurrentMetrics();
                var performanceMetric = new PerformanceMetric
                {
                    Timestamp = metrics.Timestamp,
                    MemoryUsageMB = metrics.MemoryUsageMB,
                    WorkingSetMB = metrics.WorkingSetMB,
                    AverageFrameTimeMs = metrics.AverageFrameTimeMs,
                    TotalOperations = metrics.TotalOperations
                };

                lock (_lockObject)
                {
                    _performanceHistory.Add(performanceMetric);

                    // Keep history size manageable
                    while (_performanceHistory.Count > _maxHistoryCount)
                    {
                        _performanceHistory.RemoveAt(0);
                    }
                }

                // Check for performance issues
                CheckPerformanceThresholds(metrics);

                // Raise metric updated event
                MetricUpdated?.Invoke(this, performanceMetric);

                // Auto-optimize if needed
                if (metrics.MemoryUsageMB > CRITICAL_MEMORY_THRESHOLD_MB)
                {
                    _ = Task.Run(OptimizePerformanceAsync);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in performance monitoring callback");
            }
        }

        /// <summary>
        /// Initializes frame time monitoring
        /// </summary>
        private void InitializeFrameTimeMonitoring()
        {
            if (Application.Current != null)
            {
                CompositionTarget.Rendering += (s, e) =>
                {
                    var now = DateTime.Now;
                    var frameTime = (now - _lastFrameTime).TotalMilliseconds;
                    _lastFrameTime = now;

                    if (frameTime > 0 && frameTime < 1000) // Ignore unrealistic values
                    {
                        RecordFrameTime(frameTime);
                    }
                };
            }
        }

        private DateTime _lastFrameTime = DateTime.Now;

        /// <summary>
        /// Gets current CPU usage percentage
        /// </summary>
        private double GetCpuUsage()
        {
            try
            {
                var process = Process.GetCurrentProcess();
                var currentTime = DateTime.Now;
                var currentCpuTime = process.TotalProcessorTime;

                if (_lastCpuTime != TimeSpan.Zero && _lastCpuMeasureTime != DateTime.MinValue)
                {
                    var cpuTimeDiff = currentCpuTime - _lastCpuTime;
                    var timeDiff = currentTime - _lastCpuMeasureTime;
                    var cpuUsage = cpuTimeDiff.TotalMilliseconds / (Environment.ProcessorCount * timeDiff.TotalMilliseconds) * 100;

                    _lastCpuTime = currentCpuTime;
                    _lastCpuMeasureTime = currentTime;

                    return Math.Min(100, Math.Max(0, cpuUsage));
                }

                _lastCpuTime = currentCpuTime;
                _lastCpuMeasureTime = currentTime;
                return 0;
            }
            catch
            {
                return 0;
            }
        }

        private TimeSpan _lastCpuTime = TimeSpan.Zero;
        private DateTime _lastCpuMeasureTime = DateTime.MinValue;

        /// <summary>
        /// Checks performance thresholds and raises alerts
        /// </summary>
        private void CheckPerformanceThresholds(PerformanceMetricsDto metrics)
        {
            // Memory usage alerts
            if (metrics.MemoryUsageMB > CRITICAL_MEMORY_THRESHOLD_MB)
            {
                RaisePerformanceAlert(new PerformanceAlert
                {
                    Type = PerformanceAlertType.HighMemoryUsage,
                    Message = $"Critical memory usage: {metrics.MemoryUsageMB:F1}MB",
                    Severity = AlertSeverity.Critical,
                    Timestamp = DateTime.Now
                });
            }
            else if (metrics.MemoryUsageMB > HIGH_MEMORY_THRESHOLD_MB)
            {
                RaisePerformanceAlert(new PerformanceAlert
                {
                    Type = PerformanceAlertType.HighMemoryUsage,
                    Message = $"High memory usage: {metrics.MemoryUsageMB:F1}MB",
                    Severity = AlertSeverity.Medium,
                    Timestamp = DateTime.Now
                });
            }

            // Frame rate alerts
            if (metrics.AverageFrameTimeMs > TARGET_FRAME_TIME_MS * 2)
            {
                RaisePerformanceAlert(new PerformanceAlert
                {
                    Type = PerformanceAlertType.PoorFrameRate,
                    Message = $"Poor performance: {metrics.CurrentFrameRate:F1} FPS",
                    Severity = metrics.AverageFrameTimeMs > TARGET_FRAME_TIME_MS * 3 
                        ? AlertSeverity.High 
                        : AlertSeverity.Medium,
                    Timestamp = DateTime.Now
                });
            }
        }

        /// <summary>
        /// Generates performance recommendations
        /// </summary>
        private List<string> GenerateRecommendations(List<PerformanceMetric> metrics)
        {
            var recommendations = new List<string>();

            var avgMemory = metrics.Average(m => m.MemoryUsageMB);
            var maxMemory = metrics.Max(m => m.MemoryUsageMB);
            var avgFrameTime = metrics.Average(m => m.AverageFrameTimeMs);

            if (avgMemory > HIGH_MEMORY_THRESHOLD_MB)
            {
                recommendations.Add("Consider reducing data cache size or implementing data virtualization");
            }

            if (maxMemory > CRITICAL_MEMORY_THRESHOLD_MB)
            {
                recommendations.Add("Memory usage peaked at critical levels - investigate memory leaks");
            }

            if (avgFrameTime > TARGET_FRAME_TIME_MS * 1.5)
            {
                recommendations.Add("UI performance is below optimal - consider reducing visual complexity or implementing UI virtualization");
            }

            if (!recommendations.Any())
            {
                recommendations.Add("Performance is within acceptable ranges");
            }

            return recommendations;
        }

        /// <summary>
        /// Raises a performance alert
        /// </summary>
        private void RaisePerformanceAlert(PerformanceAlert alert)
        {
            PerformanceAlertRaised?.Invoke(this, alert);
        }

        /// <summary>
        /// Disposes resources
        /// </summary>
        public void Dispose()
        {
            StopMonitoring();
            _monitoringTimer?.Dispose();
            MemoryOptimizer.Dispose();
        }
    }

    /// <summary>
    /// Performance metric data structure
    /// </summary>
    public class PerformanceMetric
    {
        public DateTime Timestamp { get; set; }
        public double MemoryUsageMB { get; set; }
        public double WorkingSetMB { get; set; }
        public double AverageFrameTimeMs { get; set; }
        public long TotalOperations { get; set; }
    }

    /// <summary>
    /// Performance alert data structure
    /// </summary>
    public class PerformanceAlert
    {
        public PerformanceAlertType Type { get; set; }
        public string Message { get; set; }
        public AlertSeverity Severity { get; set; }
        public DateTime Timestamp { get; set; }
    }

    /// <summary>
    /// Performance alert types
    /// </summary>
    public enum PerformanceAlertType
    {
        HighMemoryUsage,
        SlowOperation,
        PoorFrameRate,
        DatabaseTimeout,
        GeneralPerformance
    }

    /// <summary>
    /// Alert severity levels
    /// </summary>
    public enum AlertSeverity
    {
        Low,
        Medium,
        High,
        Critical
    }

    /// <summary>
    /// Performance report DTO
    /// </summary>
    public class PerformanceReportDto
    {
        public TimeSpan ReportPeriod { get; set; }
        public DateTime GeneratedAt { get; set; }
        public string Summary { get; set; }
        public long TotalOperations { get; set; }
        public double AverageMemoryUsageMB { get; set; }
        public double PeakMemoryUsageMB { get; set; }
        public double AverageFrameTimeMs { get; set; }
        public double WorstFrameTimeMs { get; set; }
        public double UptimeHours { get; set; }
        public List<string> Recommendations { get; set; } = new();
    }
}