// E:\kp\4 invoice\Core\Constants\UIConstants.cs
namespace InvoiceApp.Core.Constants;

public static class UIConstants
{
    // Theme Colors
    public static class Colors
    {
        public const string Primary = "#1976D2";
        public const string PrimaryDark = "#0D47A1";
        public const string PrimaryLight = "#42A5F5";
        public const string Secondary = "#388E3C";
        public const string SecondaryDark = "#1B5E20";
        public const string SecondaryLight = "#66BB6A";
        public const string Error = "#F44336";
        public const string Warning = "#FF9800";
        public const string Info = "#2196F3";
        public const string Success = "#4CAF50";
        public const string Background = "#FAFAFA";
        public const string Surface = "#FFFFFF";
        public const string OnPrimary = "#FFFFFF";
        public const string OnSecondary = "#FFFFFF";
        public const string OnBackground = "#212121";
        public const string OnSurface = "#212121";
    }
    
    // Dark Theme Colors
    public static class DarkColors
    {
        public const string Primary = "#90CAF9";
        public const string PrimaryDark = "#1565C0";
        public const string PrimaryLight = "#E3F2FD";
        public const string Secondary = "#A5D6A7";
        public const string SecondaryDark = "#2E7D32";
        public const string SecondaryLight = "#C8E6C9";
        public const string Error = "#EF5350";
        public const string Warning = "#FFB74D";
        public const string Info = "#64B5F6";
        public const string Success = "#81C784";
        public const string Background = "#121212";
        public const string Surface = "#1E1E1E";
        public const string OnPrimary = "#000000";
        public const string OnSecondary = "#000000";
        public const string OnBackground = "#FFFFFF";
        public const string OnSurface = "#FFFFFF";
    }
    
    // Sizes
    public static class Sizes
    {
        public const double IconSmall = 16;
        public const double IconMedium = 24;
        public const double IconLarge = 32;
        public const double IconXLarge = 48;
        
        public const double SpacingTiny = 4;
        public const double SpacingSmall = 8;
        public const double SpacingMedium = 16;
        public const double SpacingLarge = 24;
        public const double SpacingXLarge = 32;
        
        public const double ButtonHeight = 36;
        public const double ButtonHeightSmall = 28;
        public const double ButtonHeightLarge = 44;
        
        public const double TextBoxHeight = 32;
        public const double ComboBoxHeight = 32;
        public const double DatePickerHeight = 32;
        
        public const double CardPadding = 16;
        public const double CardMargin = 8;
        public const double CardCornerRadius = 8;
        
        public const double WindowMinWidth = 1024;
        public const double WindowMinHeight = 768;
        public const double DialogMinWidth = 400;
        public const double DialogMinHeight = 300;
    }
    
    // Typography
    public static class Typography
    {
        public const double FontSizeSmall = 12;
        public const double FontSizeBody = 14;
        public const double FontSizeSubheading = 16;
        public const double FontSizeHeading = 20;
        public const double FontSizeTitle = 24;
        public const double FontSizeDisplay = 32;
        
        public const string FontFamilyDefault = "Segoe UI";
        public const string FontFamilyMonospace = "Consolas";
        public const string FontFamilyIcon = "Segoe MDL2 Assets";
    }
    
    // Animation Durations
    public static class Animation
    {
        public const int DurationFast = 150;
        public const int DurationNormal = 300;
        public const int DurationSlow = 500;
        public const int DurationVerySlow = 1000;
        
        public const double EasingQuadratic = 0.25;
        public const double EasingCubic = 0.55;
        public const double EasingQuart = 0.76;
        public const double EasingQuint = 0.84;
    }
    
    // Z-Index Layers
    public static class ZIndex
    {
        public const int Background = 0;
        public const int Content = 1;
        public const int Navigation = 10;
        public const int Sidebar = 20;
        public const int FloatingButton = 30;
        public const int AppBar = 40;
        public const int Drawer = 50;
        public const int Modal = 100;
        public const int SnackBar = 200;
        public const int Tooltip = 300;
        public const int Overlay = 1000;
    }
    
    // Icons (Material Design Icons)
    public static class Icons
    {
        public const string Add = "&#xE710;";
        public const string Edit = "&#xE70F;";
        public const string Delete = "&#xE74D;";
        public const string Save = "&#xE74E;";
        public const string Cancel = "&#xE711;";
        public const string Search = "&#xE721;";
        public const string Filter = "&#xE71C;";
        public const string Sort = "&#xE8CB;";
        public const string Refresh = "&#xE72C;";
        public const string Print = "&#xE749;";
        public const string Export = "&#xE7C7;";
        public const string Import = "&#xE8B5;";
        public const string Settings = "&#xE713;";
        public const string User = "&#xE77B;";
        public const string Company = "&#xE7EE;";
        public const string Invoice = "&#xE7B8;";
        public const string TkaWorker = "&#xE77B;";
        public const string Dashboard = "&#xE80F;";
        public const string Reports = "&#xE7C3;";
        public const string Calendar = "&#xE787;";
        public const string Clock = "&#xE916;";
        public const string Money = "&#xE8A6;";
        public const string Check = "&#xE73E;";
        public const string Close = "&#xE711;";
        public const string ChevronDown = "&#xE70D;";
        public const string ChevronUp = "&#xE70E;";
        public const string ChevronLeft = "&#xE76B;";
        public const string ChevronRight = "&#xE76C;";
        public const string Menu = "&#xE700;";
        public const string More = "&#xE712;";
        public const string Info = "&#xE946;";
        public const string Warning = "&#xE7BA;";
        public const string Error = "&#xE783;";
        public const string Success = "&#xE73E;";
    }
    
    // Page Sizes for Pagination
    public static readonly int[] PageSizeOptions = { 10, 20, 50, 100, 200 };
    
    // Date Formats
    public static class DateFormats
    {
        public const string ShortDate = "dd/MM/yyyy";
        public const string LongDate = "dd MMMM yyyy";
        public const string DateTime = "dd/MM/yyyy HH:mm";
        public const string Time = "HH:mm";
        public const string Month = "MMMM yyyy";
        public const string Year = "yyyy";
        public const string ISO = "yyyy-MM-dd";
    }
    
    // Number Formats
    public static class NumberFormats
    {
        public const string Currency = "N0";
        public const string CurrencyWithDecimals = "N2";
        public const string Percentage = "P2";
        public const string Integer = "N0";
        public const string Decimal = "N2";
    }
    
    // Status Colors
    public static readonly Dictionary<string, string> StatusColors = new()
    {
        ["Draft"] = Colors.Warning,
        ["Finalized"] = Colors.Info,
        ["Paid"] = Colors.Success,
        ["Cancelled"] = Colors.Error,
        ["Active"] = Colors.Success,
        ["Inactive"] = Colors.Error
    };
    
    // Default Window Settings
    public static class Window
    {
        public const double DefaultWidth = 1200;
        public const double DefaultHeight = 800;
        public const double MinWidth = 800;
        public const double MinHeight = 600;
        public const bool AllowsTransparency = false;
        public const bool ShowInTaskbar = true;
        public const string StartupLocation = "CenterScreen";
    }
}