using System;
using System.Collections;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Data;
using System.Windows.Media;
using InvoiceApp.Core.Constants;

namespace InvoiceApp.WPF.Performance
{
    /// <summary>
    /// Helper class for implementing virtualization in WPF controls
    /// Provides methods for virtual scrolling, data virtualization, and UI virtualization
    /// </summary>
    public static class VirtualizationHelper
    {
        /// <summary>
        /// Enables virtualization for a DataGrid
        /// </summary>
        public static void EnableDataGridVirtualization(DataGrid dataGrid)
        {
            if (dataGrid == null) return;

            // Enable row virtualization
            VirtualizingPanel.SetIsVirtualizing(dataGrid, true);
            VirtualizingPanel.SetVirtualizationMode(dataGrid, VirtualizationMode.Recycling);
            VirtualizingPanel.SetIsContainerVirtualizable(dataGrid, true);

            // Enable column virtualization
            dataGrid.EnableColumnVirtualization = true;
            dataGrid.EnableRowVirtualization = true;

            // Optimize scrolling
            ScrollViewer.SetCanContentScroll(dataGrid, true);
            
            // Set caching for better performance
            VirtualizingPanel.SetCacheLengthUnit(dataGrid, VirtualizationCacheLengthUnit.Item);
            VirtualizingPanel.SetCacheLength(dataGrid, new VirtualizationCacheLength(20, 20));

            // Enable deferred scrolling for better performance with large datasets
            ScrollViewer.SetIsDeferredScrollingEnabled(dataGrid, true);
        }

        /// <summary>
        /// Enables virtualization for a ListBox
        /// </summary>
        public static void EnableListBoxVirtualization(ListBox listBox)
        {
            if (listBox == null) return;

            VirtualizingPanel.SetIsVirtualizing(listBox, true);
            VirtualizingPanel.SetVirtualizationMode(listBox, VirtualizationMode.Recycling);
            VirtualizingPanel.SetScrollUnit(listBox, ScrollUnit.Item);
            
            ScrollViewer.SetCanContentScroll(listBox, true);
            ScrollViewer.SetIsDeferredScrollingEnabled(listBox, true);
            
            // Set cache length for smooth scrolling
            VirtualizingPanel.SetCacheLength(listBox, new VirtualizationCacheLength(10, 10));
        }

        /// <summary>
        /// Enables virtualization for a TreeView
        /// </summary>
        public static void EnableTreeViewVirtualization(TreeView treeView)
        {
            if (treeView == null) return;

            VirtualizingPanel.SetIsVirtualizing(treeView, true);
            VirtualizingPanel.SetVirtualizationMode(treeView, VirtualizationMode.Recycling);
            
            ScrollViewer.SetCanContentScroll(treeView, true);
        }

        /// <summary>
        /// Creates a virtualized collection view for large datasets
        /// </summary>
        public static ICollectionView CreateVirtualizedCollectionView<T>(
            Func<int, int, Task<IEnumerable<T>>> dataProvider,
            int totalCount,
            int pageSize = PerformanceConstants.DefaultPageSize) where T : class
        {
            var virtualizedCollection = new VirtualizedCollection<T>(dataProvider, totalCount, pageSize);
            return CollectionViewSource.GetDefaultView(virtualizedCollection);
        }

        /// <summary>
        /// Optimizes a ScrollViewer for large content
        /// </summary>
        public static void OptimizeScrollViewer(ScrollViewer scrollViewer)
        {
            if (scrollViewer == null) return;

            scrollViewer.CanContentScroll = true;
            scrollViewer.IsDeferredScrollingEnabled = true;
            scrollViewer.ScrollViewer.SetPanningMode(scrollViewer, PanningMode.VerticalOnly);
            
            // Enable smooth scrolling
            scrollViewer.ScrollViewer.SetPanningDeceleration(scrollViewer, 0.1);
            scrollViewer.ScrollViewer.SetPanningRatio(scrollViewer, 1.0);
        }

        /// <summary>
        /// Monitors scroll position and triggers data loading
        /// </summary>
        public static void SetupInfiniteScrolling<T>(
            ItemsControl itemsControl,
            ObservableCollection<T> collection,
            Func<int, Task<IEnumerable<T>>> loadMoreData,
            int threshold = 5)
        {
            if (itemsControl == null) return;

            var scrollViewer = FindScrollViewer(itemsControl);
            if (scrollViewer == null) return;

            var isLoading = false;
            var currentPage = 0;

            scrollViewer.ScrollChanged += async (s, e) =>
            {
                if (isLoading) return;

                // Check if near bottom
                var distanceFromBottom = scrollViewer.ScrollableHeight - scrollViewer.VerticalOffset;
                var triggerDistance = Math.Max(threshold * 30, 150); // Approximate item height * threshold

                if (distanceFromBottom <= triggerDistance)
                {
                    isLoading = true;
                    try
                    {
                        var newItems = await loadMoreData(currentPage);
                        foreach (var item in newItems)
                        {
                            collection.Add(item);
                        }
                        currentPage++;
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine($"Error loading more data: {ex.Message}");
                    }
                    finally
                    {
                        isLoading = false;
                    }
                }
            };
        }

        /// <summary>
        /// Finds the ScrollViewer in a control's visual tree
        /// </summary>
        public static ScrollViewer FindScrollViewer(DependencyObject parent)
        {
            if (parent == null) return null;

            if (parent is ScrollViewer scrollViewer)
                return scrollViewer;

            var childCount = VisualTreeHelper.GetChildrenCount(parent);
            for (int i = 0; i < childCount; i++)
            {
                var child = VisualTreeHelper.GetChild(parent, i);
                var result = FindScrollViewer(child);
                if (result != null)
                    return result;
            }

            return null;
        }

        /// <summary>
        /// Gets visible items in a virtualized list
        /// </summary>
        public static IEnumerable<T> GetVisibleItems<T>(ItemsControl itemsControl) where T : class
        {
            var items = new List<T>();
            
            if (itemsControl?.Items == null) return items;

            var scrollViewer = FindScrollViewer(itemsControl);
            if (scrollViewer == null) return items;

            var viewport = new Rect(0, scrollViewer.VerticalOffset, 
                                  scrollViewer.ViewportWidth, scrollViewer.ViewportHeight);

            for (int i = 0; i < itemsControl.Items.Count; i++)
            {
                var container = itemsControl.ItemContainerGenerator.ContainerFromIndex(i) as FrameworkElement;
                if (container != null)
                {
                    var bounds = new Rect(0, container.TranslatePoint(new Point(), scrollViewer).Y,
                                        container.ActualWidth, container.ActualHeight);

                    if (viewport.IntersectsWith(bounds) && itemsControl.Items[i] is T item)
                    {
                        items.Add(item);
                    }
                }
            }

            return items;
        }

        /// <summary>
        /// Scrolls to a specific item in a virtualized list
        /// </summary>
        public static void ScrollToItem(ItemsControl itemsControl, object item)
        {
            if (itemsControl == null || item == null) return;

            var index = itemsControl.Items.IndexOf(item);
            if (index >= 0)
            {
                ScrollToIndex(itemsControl, index);
            }
        }

        /// <summary>
        /// Scrolls to a specific index in a virtualized list
        /// </summary>
        public static void ScrollToIndex(ItemsControl itemsControl, int index)
        {
            if (itemsControl == null || index < 0 || index >= itemsControl.Items.Count) return;

            // Bring item into view
            var container = itemsControl.ItemContainerGenerator.ContainerFromIndex(index) as FrameworkElement;
            if (container != null)
            {
                container.BringIntoView();
            }
            else
            {
                // Item not yet generated, scroll to approximate position
                var scrollViewer = FindScrollViewer(itemsControl);
                if (scrollViewer != null)
                {
                    var itemHeight = EstimateItemHeight(itemsControl);
                    var targetOffset = index * itemHeight;
                    scrollViewer.ScrollToVerticalOffset(Math.Max(0, targetOffset - scrollViewer.ViewportHeight / 2));
                }
            }
        }

        /// <summary>
        /// Estimates item height for scrolling calculations
        /// </summary>
        private static double EstimateItemHeight(ItemsControl itemsControl)
        {
            // Try to get height from first visible item
            for (int i = 0; i < Math.Min(10, itemsControl.Items.Count); i++)
            {
                var container = itemsControl.ItemContainerGenerator.ContainerFromIndex(i) as FrameworkElement;
                if (container != null && container.ActualHeight > 0)
                {
                    return container.ActualHeight;
                }
            }

            // Default estimate
            return 25.0;
        }

        /// <summary>
        /// Optimizes DataGrid performance for large datasets
        /// </summary>
        public static void OptimizeDataGridPerformance(DataGrid dataGrid)
        {
            if (dataGrid == null) return;

            EnableDataGridVirtualization(dataGrid);

            // Disable unnecessary features for performance
            dataGrid.CanUserResizeColumns = false;
            dataGrid.CanUserReorderColumns = false;
            dataGrid.CanUserSortColumns = false;

            // Optimize selection
            dataGrid.SelectionUnit = DataGridSelectionUnit.FullRow;
            dataGrid.SelectionMode = DataGridSelectionMode.Single;

            // Disable alternating row background for better performance
            dataGrid.AlternatingRowBackground = null;

            // Set fixed row height if possible
            // dataGrid.RowHeight = 25; // Uncomment if all rows have same height
        }

        /// <summary>
        /// Creates a memory-efficient data template selector
        /// </summary>
        public static DataTemplateSelector CreateVirtualizedTemplateSelector(
            Dictionary<Type, DataTemplate> templates)
        {
            return new VirtualizedDataTemplateSelector(templates);
        }
    }

    /// <summary>
    /// Virtualized collection implementation for large datasets
    /// </summary>
    public class VirtualizedCollection<T> : IList, INotifyCollectionChanged, INotifyPropertyChanged where T : class
    {
        private readonly Func<int, int, Task<IEnumerable<T>>> _dataProvider;
        private readonly Dictionary<int, T> _cache = new();
        private readonly int _pageSize;
        private int _totalCount;

        public event NotifyCollectionChangedEventHandler CollectionChanged;
        public event PropertyChangedEventHandler PropertyChanged;

        public VirtualizedCollection(Func<int, int, Task<IEnumerable<T>>> dataProvider, int totalCount, int pageSize)
        {
            _dataProvider = dataProvider;
            _totalCount = totalCount;
            _pageSize = pageSize;
        }

        public int Count => _totalCount;
        public bool IsReadOnly => true;
        public bool IsFixedSize => false;
        public object SyncRoot => this;
        public bool IsSynchronized => false;

        public object this[int index]
        {
            get => GetItemAsync(index).Result;
            set => throw new NotSupportedException();
        }

        private async Task<T> GetItemAsync(int index)
        {
            if (index < 0 || index >= _totalCount) return null;

            if (_cache.TryGetValue(index, out var cachedItem))
                return cachedItem;

            var pageIndex = index / _pageSize;
            var pageStartIndex = pageIndex * _pageSize;

            try
            {
                var pageData = await _dataProvider(pageIndex, _pageSize);
                var items = pageData.ToList();

                for (int i = 0; i < items.Count; i++)
                {
                    _cache[pageStartIndex + i] = items[i];
                }

                return _cache.TryGetValue(index, out var item) ? item : null;
            }
            catch
            {
                return null;
            }
        }

        public int Add(object value) => throw new NotSupportedException();
        public void Clear() => throw new NotSupportedException();
        public bool Contains(object value) => throw new NotImplementedException();
        public int IndexOf(object value) => throw new NotImplementedException();
        public void Insert(int index, object value) => throw new NotSupportedException();
        public void Remove(object value) => throw new NotSupportedException();
        public void RemoveAt(int index) => throw new NotSupportedException();

        public void CopyTo(Array array, int index)
        {
            throw new NotImplementedException();
        }

        public IEnumerator GetEnumerator()
        {
            for (int i = 0; i < _totalCount; i++)
            {
                yield return this[i];
            }
        }
    }

    /// <summary>
    /// Memory-efficient data template selector for virtualized lists
    /// </summary>
    public class VirtualizedDataTemplateSelector : DataTemplateSelector
    {
        private readonly Dictionary<Type, DataTemplate> _templates;

        public VirtualizedDataTemplateSelector(Dictionary<Type, DataTemplate> templates)
        {
            _templates = templates ?? new Dictionary<Type, DataTemplate>();
        }

        public override DataTemplate SelectTemplate(object item, DependencyObject container)
        {
            if (item == null) return null;

            var itemType = item.GetType();
            return _templates.TryGetValue(itemType, out var template) ? template : base.SelectTemplate(item, container);
        }
    }
}