using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Runtime;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;
using InvoiceApp.Core.Constants;

namespace InvoiceApp.WPF.Performance
{
    /// <summary>
    /// Memory optimization helper for improving WPF application performance
    /// Handles garbage collection, memory monitoring, and resource cleanup
    /// </summary>
    public static class MemoryOptimizer
    {
        private static Timer _memoryMonitorTimer;
        private static readonly object _lockObject = new();
        private static bool _isMonitoring = false;
        private static long _lastMemoryUsage = 0;
        private static DateTime _lastCleanup = DateTime.Now;
        private static readonly Dictionary<string, DateTime> _resourceTracker = new();

        /// <summary>
        /// Memory usage statistics
        /// </summary>
        public static class MemoryStats
        {
            public static long CurrentMemoryUsage => GC.GetTotalMemory(false);
            public static long WorkingSet => Environment.WorkingSet;
            public static double MemoryUsageMB => CurrentMemoryUsage / (1024.0 * 1024.0);
            public static double WorkingSetMB => WorkingSet / (1024.0 * 1024.0);
            public static int Gen0Collections => GC.CollectionCount(0);
            public static int Gen1Collections => GC.CollectionCount(1);
            public static int Gen2Collections => GC.CollectionCount(2);
        }

        /// <summary>
        /// Starts automatic memory monitoring and optimization
        /// </summary>
        public static void StartMemoryMonitoring(TimeSpan? interval = null)
        {
            lock (_lockObject)
            {
                if (_isMonitoring) return;

                var monitorInterval = interval ?? TimeSpan.FromMinutes(2);
                _memoryMonitorTimer = new Timer(MemoryMonitorCallback, null, TimeSpan.Zero, monitorInterval);
                _isMonitoring = true;
                _lastMemoryUsage = MemoryStats.CurrentMemoryUsage;

                Debug.WriteLine($"Memory monitoring started. Current usage: {MemoryStats.MemoryUsageMB:F2} MB");
            }
        }

        /// <summary>
        /// Stops memory monitoring
        /// </summary>
        public static void StopMemoryMonitoring()
        {
            lock (_lockObject)
            {
                _memoryMonitorTimer?.Dispose();
                _memoryMonitorTimer = null;
                _isMonitoring = false;

                Debug.WriteLine("Memory monitoring stopped.");
            }
        }

        /// <summary>
        /// Performs aggressive memory cleanup
        /// </summary>
        public static void ForceMemoryCleanup()
        {
            try
            {
                // Clear any unused resources
                ClearUnusedResources();

                // Force garbage collection
                GC.Collect(2, GCCollectionMode.Forced, true);
                GC.WaitForPendingFinalizers();
                GC.Collect(2, GCCollectionMode.Forced, true);

                // Compact large object heap
                GCSettings.LargeObjectHeapCompactionMode = GCLargeObjectHeapCompactionMode.CompactOnce;
                GC.Collect();

                _lastCleanup = DateTime.Now;

                Debug.WriteLine($"Force memory cleanup completed. New usage: {MemoryStats.MemoryUsageMB:F2} MB");
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error during force memory cleanup: {ex.Message}");
            }
        }

        /// <summary>
        /// Performs gentle memory optimization
        /// </summary>
        public static void OptimizeMemory()
        {
            try
            {
                // Only collect if memory usage is high
                if (MemoryStats.MemoryUsageMB > PerformanceConstants.MemoryThresholdMB)
                {
                    GC.Collect(1, GCCollectionMode.Optimized);
                    
                    // Clear unused dispatcher operations
                    Application.Current?.Dispatcher?.Invoke(() =>
                    {
                        // This forces the dispatcher to process any pending operations
                    }, DispatcherPriority.Background);
                }

                _lastCleanup = DateTime.Now;
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error during memory optimization: {ex.Message}");
            }
        }

        /// <summary>
        /// Clears weak references and unused cached resources
        /// </summary>
        public static void ClearUnusedResources()
        {
            try
            {
                // Clear resource tracker of old entries
                var cutoffTime = DateTime.Now.AddMinutes(-30);
                var expiredKeys = _resourceTracker
                    .Where(kvp => kvp.Value < cutoffTime)
                    .Select(kvp => kvp.Key)
                    .ToList();

                foreach (var key in expiredKeys)
                {
                    _resourceTracker.Remove(key);
                }

                // Clear WPF resource caches if available
                if (Application.Current != null)
                {
                    Application.Current.Dispatcher.BeginInvoke(() =>
                    {
                        // Clear any cached resources that might be holding memory
                        var resourceDictionaries = Application.Current.Resources?.MergedDictionaries;
                        if (resourceDictionaries != null)
                        {
                            // This helps clear any cached resources
                            foreach (var dict in resourceDictionaries.ToList())
                            {
                                if (dict.Source != null)
                                {
                                    // Re-reference to clear any cached data
                                    dict.Clear();
                                }
                            }
                        }
                    }, DispatcherPriority.Background);
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error clearing unused resources: {ex.Message}");
            }
        }

        /// <summary>
        /// Monitors memory usage and triggers cleanup when needed
        /// </summary>
        private static void MemoryMonitorCallback(object state)
        {
            try
            {
                var currentMemory = MemoryStats.CurrentMemoryUsage;
                var memoryIncrease = currentMemory - _lastMemoryUsage;
                var timeSinceLastCleanup = DateTime.Now - _lastCleanup;

                Debug.WriteLine($"Memory Monitor - Current: {MemoryStats.MemoryUsageMB:F2} MB, " +
                              $"Working Set: {MemoryStats.WorkingSetMB:F2} MB, " +
                              $"Increase: {memoryIncrease / (1024.0 * 1024.0):F2} MB");

                // Trigger cleanup if memory usage is high or growing rapidly
                if (MemoryStats.MemoryUsageMB > PerformanceConstants.MemoryThresholdMB ||
                    (memoryIncrease > PerformanceConstants.MemoryIncreaseThreshold && 
                     timeSinceLastCleanup > TimeSpan.FromMinutes(5)))
                {
                    OptimizeMemory();
                }

                // Force cleanup if memory usage is critically high
                if (MemoryStats.MemoryUsageMB > PerformanceConstants.CriticalMemoryThresholdMB)
                {
                    ForceMemoryCleanup();
                }

                _lastMemoryUsage = currentMemory;
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error in memory monitor callback: {ex.Message}");
            }
        }

        /// <summary>
        /// Tracks resource usage for cleanup purposes
        /// </summary>
        public static void TrackResource(string resourceKey)
        {
            lock (_lockObject)
            {
                _resourceTracker[resourceKey] = DateTime.Now;
            }
        }

        /// <summary>
        /// Releases tracking for a specific resource
        /// </summary>
        public static void ReleaseResource(string resourceKey)
        {
            lock (_lockObject)
            {
                _resourceTracker.Remove(resourceKey);
            }
        }

        /// <summary>
        /// Gets current memory usage information
        /// </summary>
        public static MemoryInfo GetMemoryInfo()
        {
            return new MemoryInfo
            {
                TotalMemoryMB = MemoryStats.MemoryUsageMB,
                WorkingSetMB = MemoryStats.WorkingSetMB,
                Gen0Collections = MemoryStats.Gen0Collections,
                Gen1Collections = MemoryStats.Gen1Collections,
                Gen2Collections = MemoryStats.Gen2Collections,
                TrackedResources = _resourceTracker.Count,
                LastCleanup = _lastCleanup,
                IsMonitoring = _isMonitoring
            };
        }

        /// <summary>
        /// Sets up memory optimization for specific UI scenarios
        /// </summary>
        public static void OptimizeForScenario(MemoryOptimizationScenario scenario)
        {
            switch (scenario)
            {
                case MemoryOptimizationScenario.DataGridWithLargeDataset:
                    // Optimize for large data grids
                    GCSettings.LatencyMode = GCLatencyMode.Interactive;
                    break;

                case MemoryOptimizationScenario.ReportGeneration:
                    // Optimize for report generation
                    GCSettings.LatencyMode = GCLatencyMode.Batch;
                    break;

                case MemoryOptimizationScenario.Normal:
                default:
                    // Standard optimization
                    GCSettings.LatencyMode = GCLatencyMode.Interactive;
                    break;
            }
        }

        /// <summary>
        /// Preemptively optimizes memory before a memory-intensive operation
        /// </summary>
        public static async Task PrepareForMemoryIntensiveOperation()
        {
            await Task.Run(() =>
            {
                OptimizeMemory();
                
                // Set up for batch mode during intensive operations
                GCSettings.LatencyMode = GCLatencyMode.Batch;
            });
        }

        /// <summary>
        /// Restores normal memory management after intensive operation
        /// </summary>
        public static void RestoreNormalMemoryMode()
        {
            GCSettings.LatencyMode = GCLatencyMode.Interactive;
            OptimizeMemory();
        }

        /// <summary>
        /// Disposes resources and stops monitoring
        /// </summary>
        public static void Dispose()
        {
            StopMemoryMonitoring();
            ClearUnusedResources();
            
            lock (_lockObject)
            {
                _resourceTracker.Clear();
            }
        }
    }

    /// <summary>
    /// Memory optimization scenarios
    /// </summary>
    public enum MemoryOptimizationScenario
    {
        Normal,
        DataGridWithLargeDataset,
        ReportGeneration
    }

    /// <summary>
    /// Memory information structure
    /// </summary>
    public class MemoryInfo
    {
        public double TotalMemoryMB { get; set; }
        public double WorkingSetMB { get; set; }
        public int Gen0Collections { get; set; }
        public int Gen1Collections { get; set; }
        public int Gen2Collections { get; set; }
        public int TrackedResources { get; set; }
        public DateTime LastCleanup { get; set; }
        public bool IsMonitoring { get; set; }
    }
}