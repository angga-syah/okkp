using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Forms;
using System.Windows.Interop;
using System.Windows.Media;

namespace InvoiceApp.WPF.Helpers;

public static class WindowHelper
{
    #region Window Positioning

    public static void CenterWindowOnScreen(Window window)
    {
        var screenWidth = SystemParameters.PrimaryScreenWidth;
        var screenHeight = SystemParameters.PrimaryScreenHeight;
        
        window.Left = (screenWidth - window.Width) / 2;
        window.Top = (screenHeight - window.Height) / 2;
    }

    public static void CenterWindowOnParent(Window window, Window parent)
    {
        if (parent == null)
        {
            CenterWindowOnScreen(window);
            return;
        }

        window.Left = parent.Left + (parent.Width - window.Width) / 2;
        window.Top = parent.Top + (parent.Height - window.Height) / 2;
    }

    public static void CenterWindowOnActiveScreen(Window window)
    {
        var screen = Screen.FromPoint(System.Windows.Forms.Cursor.Position);
        
        window.Left = screen.WorkingArea.Left + (screen.WorkingArea.Width - window.Width) / 2;
        window.Top = screen.WorkingArea.Top + (screen.WorkingArea.Height - window.Height) / 2;
    }

    public static void PositionWindowOnScreen(Window window, WindowPosition position)
    {
        var screenWidth = SystemParameters.PrimaryScreenWidth;
        var screenHeight = SystemParameters.PrimaryScreenHeight;
        var workArea = SystemParameters.WorkArea;

        switch (position)
        {
            case WindowPosition.Center:
                window.Left = (screenWidth - window.Width) / 2;
                window.Top = (screenHeight - window.Height) / 2;
                break;
                
            case WindowPosition.TopLeft:
                window.Left = workArea.Left;
                window.Top = workArea.Top;
                break;
                
            case WindowPosition.TopRight:
                window.Left = workArea.Right - window.Width;
                window.Top = workArea.Top;
                break;
                
            case WindowPosition.BottomLeft:
                window.Left = workArea.Left;
                window.Top = workArea.Bottom - window.Height;
                break;
                
            case WindowPosition.BottomRight:
                window.Left = workArea.Right - window.Width;
                window.Top = workArea.Bottom - window.Height;
                break;
                
            case WindowPosition.TopCenter:
                window.Left = (screenWidth - window.Width) / 2;
                window.Top = workArea.Top;
                break;
                
            case WindowPosition.BottomCenter:
                window.Left = (screenWidth - window.Width) / 2;
                window.Top = workArea.Bottom - window.Height;
                break;
        }
    }

    #endregion

    #region Window State Management

    public static void SaveWindowState(Window window, string keyPrefix = "")
    {
        var settings = Properties.Settings.Default;
        
        settings[$"{keyPrefix}WindowLeft"] = window.Left;
        settings[$"{keyPrefix}WindowTop"] = window.Top;
        settings[$"{keyPrefix}WindowWidth"] = window.Width;
        settings[$"{keyPrefix}WindowHeight"] = window.Height;
        settings[$"{keyPrefix}WindowState"] = (int)window.WindowState;
        
        settings.Save();
    }

    public static void RestoreWindowState(Window window, string keyPrefix = "")
    {
        try
        {
            var settings = Properties.Settings.Default;
            
            if (settings[$"{keyPrefix}WindowWidth"] != null)
            {
                window.Left = (double)(settings[$"{keyPrefix}WindowLeft"] ?? window.Left);
                window.Top = (double)(settings[$"{keyPrefix}WindowTop"] ?? window.Top);
                window.Width = (double)(settings[$"{keyPrefix}WindowWidth"] ?? window.Width);
                window.Height = (double)(settings[$"{keyPrefix}WindowHeight"] ?? window.Height);
                
                var windowState = (WindowState?)settings[$"{keyPrefix}WindowState"];
                if (windowState.HasValue && windowState != WindowState.Minimized)
                {
                    window.WindowState = windowState.Value;
                }
            }
            
            // Ensure window is still on screen
            EnsureWindowOnScreen(window);
        }
        catch
        {
            // If restoration fails, just center the window
            CenterWindowOnScreen(window);
        }
    }

    public static void EnsureWindowOnScreen(Window window)
    {
        var screens = Screen.AllScreens;
        var windowRect = new System.Drawing.Rectangle(
            (int)window.Left, (int)window.Top, 
            (int)window.Width, (int)window.Height);

        var isOnScreen = screens.Any(screen => screen.WorkingArea.IntersectsWith(windowRect));
        
        if (!isOnScreen)
        {
            CenterWindowOnActiveScreen(window);
        }
    }

    #endregion

    #region Window Appearance

    public static void SetWindowRoundedCorners(Window window, int cornerRadius = 10)
    {
        if (Environment.OSVersion.Version.Major >= 10)
        {
            var hwnd = new WindowInteropHelper(window).Handle;
            if (hwnd != IntPtr.Zero)
            {
                try
                {
                    SetRoundedCorners(hwnd, cornerRadius);
                }
                catch
                {
                    // Ignore if not supported
                }
            }
        }
    }

    public static void SetWindowShadow(Window window, bool enable = true)
    {
        var hwnd = new WindowInteropHelper(window).Handle;
        if (hwnd != IntPtr.Zero)
        {
            try
            {
                EnableDropShadow(hwnd, enable);
            }
            catch
            {
                // Ignore if not supported
            }
        }
    }

    public static void SetWindowBlur(Window window, bool enable = true)
    {
        var hwnd = new WindowInteropHelper(window).Handle;
        if (hwnd != IntPtr.Zero)
        {
            try
            {
                EnableBlurBehind(hwnd, enable);
            }
            catch
            {
                // Ignore if not supported
            }
        }
    }

    public static void SetWindowTransparency(Window window, double opacity)
    {
        window.AllowsTransparency = true;
        window.Opacity = Math.Max(0.1, Math.Min(1.0, opacity));
    }

    #endregion

    #region Modal Dialog Helpers

    public static bool? ShowModalDialog(Window dialog, Window? owner = null)
    {
        if (owner != null)
        {
            dialog.Owner = owner;
            CenterWindowOnParent(dialog, owner);
        }
        else
        {
            var mainWindow = System.Windows.Application.Current.MainWindow;
            if (mainWindow != null && mainWindow != dialog)
            {
                dialog.Owner = mainWindow;
                CenterWindowOnParent(dialog, mainWindow);
            }
            else
            {
                CenterWindowOnScreen(dialog);
            }
        }

        dialog.WindowStartupLocation = WindowStartupLocation.Manual;
        return dialog.ShowDialog();
    }

    public static void ShowModelessDialog(Window dialog, Window? owner = null)
    {
        if (owner != null)
        {
            dialog.Owner = owner;
            CenterWindowOnParent(dialog, owner);
        }
        else
        {
            CenterWindowOnScreen(dialog);
        }

        dialog.WindowStartupLocation = WindowStartupLocation.Manual;
        dialog.Show();
    }

    #endregion

    #region Window Animation

    public static void FadeInWindow(Window window, double duration = 300)
    {
        window.Opacity = 0;
        window.Show();
        
        AnimationHelper.FadeIn(window, duration);
    }

    public static void FadeOutWindow(Window window, double duration = 200, Action? onCompleted = null)
    {
        AnimationHelper.FadeOut(window, duration, () =>
        {
            window.Hide();
            onCompleted?.Invoke();
        });
    }

    public static void SlideInWindow(Window window, SlideDirection direction = SlideDirection.FromBottom, double duration = 400)
    {
        window.Show();
        
        switch (direction)
        {
            case SlideDirection.FromLeft:
                AnimationHelper.SlideInFromLeft(window, 100, duration);
                break;
            case SlideDirection.FromRight:
                AnimationHelper.SlideInFromRight(window, 100, duration);
                break;
            case SlideDirection.FromBottom:
                AnimationHelper.SlideInFromBottom(window, 50, duration);
                break;
        }
    }

    #endregion

    #region Screen Information

    public static Screen GetScreenFromWindow(Window window)
    {
        var windowRect = new System.Drawing.Rectangle(
            (int)window.Left, (int)window.Top,
            (int)window.Width, (int)window.Height);
        
        return Screen.FromRectangle(windowRect);
    }

    public static double GetScreenScaling(Window window)
    {
        var source = PresentationSource.FromVisual(window);
        if (source?.CompositionTarget != null)
        {
            return source.CompositionTarget.TransformToDevice.M11;
        }
        return 1.0;
    }

    public static Size GetScreenSize()
    {
        return new Size(SystemParameters.PrimaryScreenWidth, SystemParameters.PrimaryScreenHeight);
    }

    public static Size GetWorkAreaSize()
    {
        var workArea = SystemParameters.WorkArea;
        return new Size(workArea.Width, workArea.Height);
    }

    #endregion

    #region Window Management

    public static void MinimizeToSystemTray(Window window, System.Windows.Forms.NotifyIcon? notifyIcon = null)
    {
        window.Hide();
        
        if (notifyIcon != null)
        {
            notifyIcon.Visible = true;
            notifyIcon.ShowBalloonTip(3000, "Application", "Application minimized to system tray", 
                System.Windows.Forms.ToolTipIcon.Info);
        }
    }

    public static void RestoreFromSystemTray(Window window, System.Windows.Forms.NotifyIcon? notifyIcon = null)
    {
        window.Show();
        window.WindowState = WindowState.Normal;
        window.Activate();
        
        if (notifyIcon != null)
        {
            notifyIcon.Visible = false;
        }
    }

    public static void BringWindowToFront(Window window)
    {
        if (window.WindowState == WindowState.Minimized)
        {
            window.WindowState = WindowState.Normal;
        }
        
        window.Activate();
        window.Topmost = true;
        window.Topmost = false;
        window.Focus();
    }

    public static bool IsWindowVisible(Window window)
    {
        return window.IsVisible && window.WindowState != WindowState.Minimized;
    }

    #endregion

    #region Utility Methods

    public static void SetWindowIcon(Window window, string iconPath)
    {
        try
        {
            if (File.Exists(iconPath))
            {
                window.Icon = new System.Windows.Media.Imaging.BitmapImage(new Uri(iconPath, UriKind.Absolute));
            }
        }
        catch
        {
            // Ignore if icon cannot be set
        }
    }

    public static void DisableWindowMaximizeButton(Window window)
    {
        window.ResizeMode = ResizeMode.CanMinimize;
    }

    public static void DisableWindowMinimizeButton(Window window)
    {
        var hwnd = new WindowInteropHelper(window).Handle;
        if (hwnd != IntPtr.Zero)
        {
            try
            {
                DisableMinimizeButton(hwnd);
            }
            catch
            {
                // Ignore if not supported
            }
        }
    }

    public static void SetWindowAlwaysOnTop(Window window, bool alwaysOnTop = true)
    {
        window.Topmost = alwaysOnTop;
    }

    public static void FlashWindow(Window window, int flashCount = 3)
    {
        var hwnd = new WindowInteropHelper(window).Handle;
        if (hwnd != IntPtr.Zero)
        {
            try
            {
                FlashWindowEx(hwnd, flashCount);
            }
            catch
            {
                // Ignore if not supported
            }
        }
    }

    #endregion

    #region Native Windows API

    [DllImport("user32.dll")]
    private static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int x, int y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll")]
    private static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll")]
    private static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

    [DllImport("user32.dll")]
    private static extern bool FlashWindow(IntPtr hWnd, bool bInvert);

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

    private const int GWL_STYLE = -16;
    private const int WS_MAXIMIZEBOX = 0x10000;
    private const int WS_MINIMIZEBOX = 0x20000;

    private static void SetRoundedCorners(IntPtr hwnd, int radius)
    {
        var attribute = 2; // DWMWA_WINDOW_CORNER_PREFERENCE
        var preference = 2; // DWMWCP_ROUND
        DwmSetWindowAttribute(hwnd, attribute, ref preference, sizeof(int));
    }

    private static void EnableDropShadow(IntPtr hwnd, bool enable)
    {
        var attribute = 2; // DWMWA_NCRENDERING_POLICY
        var policy = enable ? 2 : 1; // DWMNCRP_ENABLED : DWMNCRP_DISABLED
        DwmSetWindowAttribute(hwnd, attribute, ref policy, sizeof(int));
    }

    private static void EnableBlurBehind(IntPtr hwnd, bool enable)
    {
        var attribute = 4; // DWMWA_BLUR_BEHIND
        var blurValue = enable ? 1 : 0;
        DwmSetWindowAttribute(hwnd, attribute, ref blurValue, sizeof(int));
    }

    private static void DisableMinimizeButton(IntPtr hwnd)
    {
        var style = GetWindowLong(hwnd, GWL_STYLE);
        SetWindowLong(hwnd, GWL_STYLE, style & ~WS_MINIMIZEBOX);
    }

    private static void FlashWindowEx(IntPtr hwnd, int flashCount)
    {
        for (int i = 0; i < flashCount; i++)
        {
            FlashWindow(hwnd, true);
            System.Threading.Thread.Sleep(500);
            FlashWindow(hwnd, false);
            System.Threading.Thread.Sleep(500);
        }
    }

    #endregion
}

public enum WindowPosition
{
    Center,
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
    TopCenter,
    BottomCenter
}

public enum SlideDirection
{
    FromLeft,
    FromRight,
    FromBottom
}