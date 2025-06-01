using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;

namespace InvoiceApp.WPF.Helpers;

public static class ValidationHelper
{
    #region Form Validation

    public static bool ValidateForm(DependencyObject container, bool showFirstError = true)
    {
        var errors = new List<ValidationError>();
        CollectValidationErrors(container, errors);

        if (errors.Any() && showFirstError)
        {
            var firstError = errors.First();
            if (firstError.Element is FrameworkElement element)
            {
                element.Focus();
                ShowValidationTooltip(element, firstError.Message);
            }
        }

        return !errors.Any();
    }

    public static List<ValidationError> GetValidationErrors(DependencyObject container)
    {
        var errors = new List<ValidationError>();
        CollectValidationErrors(container, errors);
        return errors;
    }

    private static void CollectValidationErrors(DependencyObject obj, List<ValidationError> errors)
    {
        // Check current object
        if (obj is FrameworkElement element)
        {
            var binding = BindingOperations.GetBinding(element, GetValidationProperty(element));
            if (binding != null)
            {
                var validationError = Validation.GetErrors(element).FirstOrDefault();
                if (validationError != null)
                {
                    errors.Add(new ValidationError
                    {
                        Element = element,
                        Property = GetValidationProperty(element).Name,
                        Message = validationError.ErrorContent?.ToString() ?? "Validation error",
                        Value = GetElementValue(element)
                    });
                }
            }
        }

        // Check children
        var childrenCount = System.Windows.Media.VisualTreeHelper.GetChildrenCount(obj);
        for (int i = 0; i < childrenCount; i++)
        {
            var child = System.Windows.Media.VisualTreeHelper.GetChild(obj, i);
            CollectValidationErrors(child, errors);
        }
    }

    private static DependencyProperty GetValidationProperty(FrameworkElement element)
    {
        return element switch
        {
            TextBox => TextBox.TextProperty,
            ComboBox => ComboBox.SelectedValueProperty,
            CheckBox => CheckBox.IsCheckedProperty,
            DatePicker => DatePicker.SelectedDateProperty,
            _ => TextBox.TextProperty
        };
    }

    private static object? GetElementValue(FrameworkElement element)
    {
        return element switch
        {
            TextBox textBox => textBox.Text,
            ComboBox comboBox => comboBox.SelectedValue,
            CheckBox checkBox => checkBox.IsChecked,
            DatePicker datePicker => datePicker.SelectedDate,
            _ => null
        };
    }

    #endregion

    #region Data Validation

    public static ValidationResult ValidateObject<T>(T obj) where T : class
    {
        var context = new ValidationContext(obj);
        var results = new List<System.ComponentModel.DataAnnotations.ValidationResult>();
        
        var isValid = Validator.TryValidateObject(obj, context, results, true);
        
        return new ValidationResult
        {
            IsValid = isValid,
            Errors = results.Select(r => new ValidationError
            {
                Property = r.MemberNames.FirstOrDefault() ?? "Unknown",
                Message = r.ErrorMessage ?? "Validation error"
            }).ToList()
        };
    }

    public static ValidationResult ValidateInvoice(InvoiceDto invoice)
    {
        var errors = new List<ValidationError>();

        // Basic validation
        if (string.IsNullOrWhiteSpace(invoice.InvoiceNumber))
            errors.Add(new ValidationError { Property = nameof(invoice.InvoiceNumber), Message = "Invoice number is required" });

        if (string.IsNullOrWhiteSpace(invoice.CompanyName))
            errors.Add(new ValidationError { Property = nameof(invoice.CompanyName), Message = "Company name is required" });

        if (invoice.InvoiceDate == default)
            errors.Add(new ValidationError { Property = nameof(invoice.InvoiceDate), Message = "Invoice date is required" });

        if (invoice.InvoiceDate > DateTime.Today)
            errors.Add(new ValidationError { Property = nameof(invoice.InvoiceDate), Message = "Invoice date cannot be in the future" });

        if (invoice.DueDate.HasValue && invoice.DueDate < invoice.InvoiceDate)
            errors.Add(new ValidationError { Property = nameof(invoice.DueDate), Message = "Due date cannot be before invoice date" });

        if (invoice.VatPercentage < 0 || invoice.VatPercentage > 100)
            errors.Add(new ValidationError { Property = nameof(invoice.VatPercentage), Message = "VAT percentage must be between 0 and 100" });

        if (invoice.Subtotal < 0)
            errors.Add(new ValidationError { Property = nameof(invoice.Subtotal), Message = "Subtotal cannot be negative" });

        if (invoice.TotalAmount < 0)
            errors.Add(new ValidationError { Property = nameof(invoice.TotalAmount), Message = "Total amount cannot be negative" });

        // Lines validation
        if (invoice.Lines == null || !invoice.Lines.Any())
        {
            errors.Add(new ValidationError { Property = nameof(invoice.Lines), Message = "Invoice must have at least one line item" });
        }
        else
        {
            for (int i = 0; i < invoice.Lines.Count; i++)
            {
                var lineErrors = ValidateInvoiceLine(invoice.Lines[i], i + 1);
                errors.AddRange(lineErrors.Errors);
            }
        }

        return new ValidationResult
        {
            IsValid = !errors.Any(),
            Errors = errors
        };
    }

    public static ValidationResult ValidateInvoiceLine(InvoiceLineDto line, int lineNumber)
    {
        var errors = new List<ValidationError>();
        var prefix = $"Line {lineNumber}";

        if (string.IsNullOrWhiteSpace(line.TkaName))
            errors.Add(new ValidationError { Property = $"{prefix}.TkaName", Message = "TKA name is required" });

        if (string.IsNullOrWhiteSpace(line.JobName) && string.IsNullOrWhiteSpace(line.CustomJobName))
            errors.Add(new ValidationError { Property = $"{prefix}.JobName", Message = "Job description is required" });

        if (line.Quantity <= 0)
            errors.Add(new ValidationError { Property = $"{prefix}.Quantity", Message = "Quantity must be greater than 0" });

        if (line.UnitPrice < 0)
            errors.Add(new ValidationError { Property = $"{prefix}.UnitPrice", Message = "Unit price cannot be negative" });

        if (line.LineTotal < 0)
            errors.Add(new ValidationError { Property = $"{prefix}.LineTotal", Message = "Line total cannot be negative" });

        // Check if calculated total matches
        var calculatedTotal = line.UnitPrice * line.Quantity;
        if (Math.Abs(line.LineTotal - calculatedTotal) > 0.01m)
            errors.Add(new ValidationError { Property = $"{prefix}.LineTotal", Message = "Line total does not match unit price × quantity" });

        return new ValidationResult
        {
            IsValid = !errors.Any(),
            Errors = errors
        };
    }

    public static ValidationResult ValidateCompany(CompanyDto company)
    {
        var errors = new List<ValidationError>();

        if (string.IsNullOrWhiteSpace(company.CompanyName))
            errors.Add(new ValidationError { Property = nameof(company.CompanyName), Message = "Company name is required" });

        if (string.IsNullOrWhiteSpace(company.Npwp))
            errors.Add(new ValidationError { Property = nameof(company.Npwp), Message = "NPWP is required" });
        else if (!IsValidNpwp(company.Npwp))
            errors.Add(new ValidationError { Property = nameof(company.Npwp), Message = "Invalid NPWP format" });

        if (string.IsNullOrWhiteSpace(company.Idtku))
            errors.Add(new ValidationError { Property = nameof(company.Idtku), Message = "IDTKU is required" });

        if (string.IsNullOrWhiteSpace(company.Address))
            errors.Add(new ValidationError { Property = nameof(company.Address), Message = "Address is required" });

        if (!string.IsNullOrWhiteSpace(company.Email) && !IsValidEmail(company.Email))
            errors.Add(new ValidationError { Property = nameof(company.Email), Message = "Invalid email format" });

        if (!string.IsNullOrWhiteSpace(company.Phone) && !IsValidPhoneNumber(company.Phone))
            errors.Add(new ValidationError { Property = nameof(company.Phone), Message = "Invalid phone number format" });

        return new ValidationResult
        {
            IsValid = !errors.Any(),
            Errors = errors
        };
    }

    public static ValidationResult ValidateTkaWorker(TkaWorkerDto tka)
    {
        var errors = new List<ValidationError>();

        if (string.IsNullOrWhiteSpace(tka.Nama))
            errors.Add(new ValidationError { Property = nameof(tka.Nama), Message = "Name is required" });

        if (string.IsNullOrWhiteSpace(tka.Passport))
            errors.Add(new ValidationError { Property = nameof(tka.Passport), Message = "Passport number is required" });
        else if (!IsValidPassportNumber(tka.Passport))
            errors.Add(new ValidationError { Property = nameof(tka.Passport), Message = "Invalid passport number format" });

        if (string.IsNullOrWhiteSpace(tka.Divisi))
            errors.Add(new ValidationError { Property = nameof(tka.Divisi), Message = "Division is required" });

        return new ValidationResult
        {
            IsValid = !errors.Any(),
            Errors = errors
        };
    }

    #endregion

    #region Format Validation

    public static bool IsValidEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;
        
        try
        {
            var emailRegex = new Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase);
            return emailRegex.IsMatch(email);
        }
        catch
        {
            return false;
        }
    }

    public static bool IsValidPhoneNumber(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return false;
        
        // Indonesian phone number patterns
        var phoneRegex = new Regex(@"^(\+62|62|0)[0-9]{8,12}$");
        var cleanPhone = phone.Replace("-", "").Replace(" ", "").Replace("(", "").Replace(")", "");
        
        return phoneRegex.IsMatch(cleanPhone);
    }

    public static bool IsValidNpwp(string npwp)
    {
        if (string.IsNullOrWhiteSpace(npwp)) return false;
        
        // Indonesian NPWP format: XX.XXX.XXX.X-XXX.XXX
        var npwpRegex = new Regex(@"^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$");
        var cleanNpwp = npwp.Replace(" ", "");
        
        return npwpRegex.IsMatch(cleanNpwp);
    }

    public static bool IsValidPassportNumber(string passport)
    {
        if (string.IsNullOrWhiteSpace(passport)) return false;
        
        // General passport format: 2-3 letters followed by 6-9 digits
        var passportRegex = new Regex(@"^[A-Z]{2,3}[0-9]{6,9}$", RegexOptions.IgnoreCase);
        var cleanPassport = passport.Replace(" ", "").Replace("-", "");
        
        return passportRegex.IsMatch(cleanPassport);
    }

    public static bool IsValidCurrency(string currency)
    {
        if (string.IsNullOrWhiteSpace(currency)) return false;
        
        var cleanCurrency = currency.Replace("Rp", "").Replace(".", "").Replace(",", "").Trim();
        return decimal.TryParse(cleanCurrency, out _) && decimal.Parse(cleanCurrency) >= 0;
    }

    public static bool IsValidPercentage(string percentage)
    {
        if (string.IsNullOrWhiteSpace(percentage)) return false;
        
        var cleanPercentage = percentage.Replace("%", "").Trim();
        return decimal.TryParse(cleanPercentage, out var value) && value >= 0 && value <= 100;
    }

    #endregion

    #region Number Validation

    public static bool IsValidInteger(string value, int? min = null, int? max = null)
    {
        if (!int.TryParse(value, out var intValue)) return false;
        
        if (min.HasValue && intValue < min.Value) return false;
        if (max.HasValue && intValue > max.Value) return false;
        
        return true;
    }

    public static bool IsValidDecimal(string value, decimal? min = null, decimal? max = null)
    {
        if (!decimal.TryParse(value, NumberStyles.Number, CultureInfo.CurrentCulture, out var decimalValue)) 
            return false;
        
        if (min.HasValue && decimalValue < min.Value) return false;
        if (max.HasValue && decimalValue > max.Value) return false;
        
        return true;
    }

    public static bool IsValidDate(string value, DateTime? min = null, DateTime? max = null)
    {
        if (!DateTime.TryParse(value, CultureInfo.CurrentCulture, DateTimeStyles.None, out var dateValue)) 
            return false;
        
        if (min.HasValue && dateValue < min.Value) return false;
        if (max.HasValue && dateValue > max.Value) return false;
        
        return true;
    }

    #endregion

    #region Validation Rules (for WPF Binding)

    public class RequiredValidationRule : ValidationRule
    {
        public string ErrorMessage { get; set; } = "This field is required";

        public override System.Windows.Controls.ValidationResult Validate(object value, CultureInfo cultureInfo)
        {
            var stringValue = value?.ToString();
            
            if (string.IsNullOrWhiteSpace(stringValue))
                return new System.Windows.Controls.ValidationResult(false, ErrorMessage);
            
            return System.Windows.Controls.ValidationResult.ValidResult;
        }
    }

    public class EmailValidationRule : ValidationRule
    {
        public string ErrorMessage { get; set; } = "Invalid email format";

        public override System.Windows.Controls.ValidationResult Validate(object value, CultureInfo cultureInfo)
        {
            var email = value?.ToString();
            
            if (string.IsNullOrWhiteSpace(email))
                return System.Windows.Controls.ValidationResult.ValidResult;
            
            if (!IsValidEmail(email))
                return new System.Windows.Controls.ValidationResult(false, ErrorMessage);
            
            return System.Windows.Controls.ValidationResult.ValidResult;
        }
    }

    public class PhoneValidationRule : ValidationRule
    {
        public string ErrorMessage { get; set; } = "Invalid phone number format";

        public override System.Windows.Controls.ValidationResult Validate(object value, CultureInfo cultureInfo)
        {
            var phone = value?.ToString();
            
            if (string.IsNullOrWhiteSpace(phone))
                return System.Windows.Controls.ValidationResult.ValidResult;
            
            if (!IsValidPhoneNumber(phone))
                return new System.Windows.Controls.ValidationResult(false, ErrorMessage);
            
            return System.Windows.Controls.ValidationResult.ValidResult;
        }
    }

    public class NpwpValidationRule : ValidationRule
    {
        public string ErrorMessage { get; set; } = "Invalid NPWP format";

        public override System.Windows.Controls.ValidationResult Validate(object value, CultureInfo cultureInfo)
        {
            var npwp = value?.ToString();
            
            if (string.IsNullOrWhiteSpace(npwp))
                return System.Windows.Controls.ValidationResult.ValidResult;
            
            if (!IsValidNpwp(npwp))
                return new System.Windows.Controls.ValidationResult(false, ErrorMessage);
            
            return System.Windows.Controls.ValidationResult.ValidResult;
        }
    }

    public class RangeValidationRule : ValidationRule
    {
        public double Min { get; set; } = double.MinValue;
        public double Max { get; set; } = double.MaxValue;
        public string ErrorMessage { get; set; } = "Value is out of range";

        public override System.Windows.Controls.ValidationResult Validate(object value, CultureInfo cultureInfo)
        {
            if (!double.TryParse(value?.ToString(), out var doubleValue))
                return new System.Windows.Controls.ValidationResult(false, "Invalid number format");
            
            if (doubleValue < Min || doubleValue > Max)
                return new System.Windows.Controls.ValidationResult(false, $"{ErrorMessage} ({Min} - {Max})");
            
            return System.Windows.Controls.ValidationResult.ValidResult;
        }
    }

    #endregion

    #region UI Helpers

    public static void ShowValidationTooltip(FrameworkElement element, string message)
    {
        element.ToolTip = message;
        
        // Auto-hide tooltip after 3 seconds
        var timer = new System.Windows.Threading.DispatcherTimer
        {
            Interval = TimeSpan.FromSeconds(3)
        };
        timer.Tick += (s, e) =>
        {
            element.ToolTip = null;
            timer.Stop();
        };
        timer.Start();
    }

    public static void ClearValidationErrors(DependencyObject container)
    {
        ClearValidationErrorsRecursive(container);
    }

    private static void ClearValidationErrorsRecursive(DependencyObject obj)
    {
        if (obj is FrameworkElement element)
        {
            Validation.ClearInvalid(BindingOperations.GetBinding(element, GetValidationProperty(element)));
            element.ToolTip = null;
        }

        var childrenCount = System.Windows.Media.VisualTreeHelper.GetChildrenCount(obj);
        for (int i = 0; i < childrenCount; i++)
        {
            var child = System.Windows.Media.VisualTreeHelper.GetChild(obj, i);
            ClearValidationErrorsRecursive(child);
        }
    }

    #endregion
}

public class ValidationResult
{
    public bool IsValid { get; set; }
    public List<ValidationError> Errors { get; set; } = new();
    
    public string GetErrorsAsString(string separator = "\n")
    {
        return string.Join(separator, Errors.Select(e => e.Message));
    }
}

public class ValidationError
{
    public FrameworkElement? Element { get; set; }
    public string Property { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public object? Value { get; set; }
    public ValidationSeverity Severity { get; set; } = ValidationSeverity.Error;
}