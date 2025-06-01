using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Data;
using InvoiceApp.Core.Constants;

namespace InvoiceApp.WPF.Performance
{
    /// <summary>
    /// Helper class for implementing lazy loading functionality to improve performance
    /// Provides methods for lazy loading collections, data binding, and background loading
    /// </summary>
    public static class LazyLoadingHelper
    {
        private static readonly Dictionary<string, CancellationTokenSource> _loadingTasks = new();
        private static readonly object _lockObject = new();

        /// <summary>
        /// Creates a lazy loading collection that loads data on demand
        /// </summary>
        public static ObservableCollection<T> CreateLazyCollection<T>(
            Func<int, int, Task<IEnumerable<T>>> dataLoader,
            int pageSize = PerformanceConstants.DefaultPageSize,
            string cacheKey = null) where T : class
        {
            var collection = new ObservableCollection<T>();
            var isLoading = false;
            var currentPage = 0;
            var hasMoreData = true;

            // Create background loading action
            async Task LoadMoreData()
            {
                if (isLoading || !hasMoreData) return;

                isLoading = true;
                try
                {
                    var cancellationToken = GetOrCreateCancellationToken(cacheKey ?? typeof(T).Name);
                    var newData = await dataLoader(currentPage, pageSize);
                    
                    if (cancellationToken.IsCancellationRequested) return;

                    await Application.Current.Dispatcher.InvokeAsync(() =>
                    {
                        foreach (var item in newData)
                        {
                            collection.Add(item);
                        }
                    });

                    hasMoreData = newData.Count() >= pageSize;
                    currentPage++;
                }
                catch (OperationCanceledException)
                {
                    // Task was cancelled, ignore
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"Error loading lazy data: {ex.Message}");
                }
                finally
                {
                    isLoading = false;
                }
            }

            // Start initial load
            _ = Task.Run(LoadMoreData);

            return collection;
        }

        /// <summary>
        /// Creates a lazy loading collection view with virtual scrolling support
        /// </summary>
        public static ICollectionView CreateLazyCollectionView<T>(
            ObservableCollection<T> source,
            Func<Task> loadMoreAction,
            int threshold = 10) where T : class
        {
            var view = CollectionViewSource.GetDefaultView(source);
            
            // Monitor collection view for scroll position
            view.CurrentChanged += async (s, e) =>
            {
                if (view.CurrentPosition >= source.Count - threshold)
                {
                    await loadMoreAction();
                }
            };

            return view;
        }

        /// <summary>
        /// Implements lazy loading for a specific property
        /// </summary>
        public static async Task<T> LazyLoadProperty<T>(
            Func<Task<T>> loader,
            string propertyName,
            INotifyPropertyChanged owner,
            T defaultValue = default) where T : class
        {
            var cacheKey = $"{owner.GetHashCode()}_{propertyName}";
            
            try
            {
                var cancellationToken = GetOrCreateCancellationToken(cacheKey);
                var result = await loader();
                
                if (cancellationToken.IsCancellationRequested) 
                    return defaultValue;

                return result;
            }
            catch (OperationCanceledException)
            {
                return defaultValue;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error lazy loading property {propertyName}: {ex.Message}");
                return defaultValue;
            }
        }

        /// <summary>
        /// Preloads data in background to improve perceived performance
        /// </summary>
        public static async Task PreloadDataAsync<T>(
            Func<Task<IEnumerable<T>>> dataLoader,
            Action<IEnumerable<T>> onDataLoaded,
            string cacheKey,
            TimeSpan? delay = null)
        {
            if (delay.HasValue)
            {
                await Task.Delay(delay.Value);
            }

            try
            {
                var cancellationToken = GetOrCreateCancellationToken(cacheKey);
                var data = await dataLoader();
                
                if (cancellationToken.IsCancellationRequested) return;

                await Application.Current.Dispatcher.InvokeAsync(() =>
                {
                    onDataLoaded(data);
                });
            }
            catch (OperationCanceledException)
            {
                // Task was cancelled, ignore
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error preloading data: {ex.Message}");
            }
        }

        /// <summary>
        /// Creates a lazy loading wrapper for expensive operations
        /// </summary>
        public static Lazy<Task<T>> CreateLazyTask<T>(Func<Task<T>> taskFactory)
        {
            return new Lazy<Task<T>>(taskFactory, LazyThreadSafetyMode.ExecutionAndPublication);
        }

        /// <summary>
        /// Implements progressive loading with priority levels
        /// </summary>
        public static async Task LoadWithPriority<T>(
            IEnumerable<(Func<Task<T>> loader, int priority, Action<T> callback)> loaders,
            CancellationToken cancellationToken = default)
        {
            var sortedLoaders = loaders.OrderBy(x => x.priority).ToList();

            foreach (var (loader, priority, callback) in sortedLoaders)
            {
                if (cancellationToken.IsCancellationRequested) break;

                try
                {
                    var result = await loader();
                    
                    if (!cancellationToken.IsCancellationRequested)
                    {
                        await Application.Current.Dispatcher.InvokeAsync(() => callback(result));
                    }

                    // Add small delay between priority levels
                    if (priority > 0)
                    {
                        await Task.Delay(10, cancellationToken);
                    }
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"Error loading priority {priority}: {ex.Message}");
                }
            }
        }

        /// <summary>
        /// Cancels all loading operations for a specific cache key
        /// </summary>
        public static void CancelLoading(string cacheKey)
        {
            lock (_lockObject)
            {
                if (_loadingTasks.TryGetValue(cacheKey, out var cts))
                {
                    cts.Cancel();
                    cts.Dispose();
                    _loadingTasks.Remove(cacheKey);
                }
            }
        }

        /// <summary>
        /// Cancels all active loading operations
        /// </summary>
        public static void CancelAllLoading()
        {
            lock (_lockObject)
            {
                foreach (var cts in _loadingTasks.Values)
                {
                    cts.Cancel();
                    cts.Dispose();
                }
                _loadingTasks.Clear();
            }
        }

        /// <summary>
        /// Creates or gets existing cancellation token for a cache key
        /// </summary>
        private static CancellationToken GetOrCreateCancellationToken(string cacheKey)
        {
            lock (_lockObject)
            {
                if (!_loadingTasks.TryGetValue(cacheKey, out var cts) || cts.IsCancellationRequested)
                {
                    cts?.Dispose();
                    cts = new CancellationTokenSource();
                    _loadingTasks[cacheKey] = cts;
                }
                return cts.Token;
            }
        }

        /// <summary>
        /// Creates a lazy loading observable collection with automatic memory cleanup
        /// </summary>
        public static ObservableCollection<T> CreateSmartLazyCollection<T>(
            Func<int, int, Task<IEnumerable<T>>> dataLoader,
            int maxItemsInMemory = PerformanceConstants.MaxItemsInMemory,
            int pageSize = PerformanceConstants.DefaultPageSize) where T : class
        {
            var collection = new ObservableCollection<T>();
            var isLoading = false;
            var currentPage = 0;
            var hasMoreData = true;

            async Task LoadMoreData()
            {
                if (isLoading || !hasMoreData) return;

                isLoading = true;
                try
                {
                    var newData = await dataLoader(currentPage, pageSize);
                    
                    await Application.Current.Dispatcher.InvokeAsync(() =>
                    {
                        // Memory cleanup if too many items
                        if (collection.Count > maxItemsInMemory)
                        {
                            var removeCount = collection.Count - maxItemsInMemory + pageSize;
                            for (int i = 0; i < removeCount && collection.Count > 0; i++)
                            {
                                collection.RemoveAt(0);
                            }
                        }

                        foreach (var item in newData)
                        {
                            collection.Add(item);
                        }
                    });

                    hasMoreData = newData.Count() >= pageSize;
                    currentPage++;
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"Error loading smart lazy data: {ex.Message}");
                }
                finally
                {
                    isLoading = false;
                }
            }

            return collection;
        }

        /// <summary>
        /// Disposes resources and cancels all operations
        /// </summary>
        public static void Dispose()
        {
            CancelAllLoading();
        }
    }
}