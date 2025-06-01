// E:\kp\4 invoice\Application\Mappers\AutoMapperProfile.cs
using AutoMapper;
using InvoiceApp.Application.Commands;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;

namespace InvoiceApp.Application.Mappers;

public class AutoMapperProfile : Profile
{
    public AutoMapperProfile()
    {
        CreateMap<User, UserDto>()
            .ForMember(dest => dest.RoleName, opt => opt.MapFrom(src => src.Role.ToString()));

        CreateMap<UserDto, User>()
            .ForMember(dest => dest.Role, opt => opt.MapFrom(src => 
                Enum.Parse<Core.Enums.UserRole>(src.RoleName, true)));

        CreateMap<Company, CompanyDto>()
            .ForMember(dest => dest.InvoiceCount, opt => opt.MapFrom(src => src.Invoices.Count))
            .ForMember(dest => dest.TotalInvoiceAmount, opt => opt.MapFrom(src => 
                src.Invoices.Where(i => i.Status == InvoiceStatus.Finalized || i.Status == InvoiceStatus.Paid)
                           .Sum(i => i.TotalAmount)))
            .ForMember(dest => dest.ActiveTkaCount, opt => opt.MapFrom(src => 
                src.CompanyTkaAssignments.Count(a => a.IsActive && 
                    (a.EndDate == null || a.EndDate > DateTime.Now))));

        CreateMap<CompanyDto, Company>()
            .ForMember(dest => dest.Invoices, opt => opt.Ignore())
            .ForMember(dest => dest.JobDescriptions, opt => opt.Ignore())
            .ForMember(dest => dest.CompanyTkaAssignments, opt => opt.Ignore());

        CreateMap<TkaWorker, TkaWorkerDto>()
            .ForMember(dest => dest.JenisKelaminText, opt => opt.MapFrom(src => src.JenisKelamin.ToString()))
            .ForMember(dest => dest.FamilyMemberCount, opt => opt.MapFrom(src => 
                src.FamilyMembers.Count(f => f.IsActive)))
            .ForMember(dest => dest.ActiveCompanyAssignments, opt => opt.MapFrom(src =>
                src.CompanyTkaAssignments.Count(a => a.IsActive && 
                    (a.EndDate == null || a.EndDate > DateTime.Now))));

        CreateMap<TkaWorkerDto, TkaWorker>()
            .ForMember(dest => dest.JenisKelamin, opt => opt.MapFrom(src => 
                Enum.Parse<Core.Enums.Gender>(src.JenisKelaminText, true)))
            .ForMember(dest => dest.FamilyMembers, opt => opt.Ignore())
            .ForMember(dest => dest.CompanyTkaAssignments, opt => opt.Ignore())
            .ForMember(dest => dest.InvoiceLines, opt => opt.Ignore());

        CreateMap<TkaFamilyMember, TkaFamilyMemberDto>()
            .ForMember(dest => dest.TkaName, opt => opt.MapFrom(src => src.TkaWorker.Nama))
            .ForMember(dest => dest.RelationshipText, opt => opt.MapFrom(src => src.Relationship.ToString()))
            .ForMember(dest => dest.JenisKelaminText, opt => opt.MapFrom(src => src.JenisKelamin.ToString()));

        CreateMap<TkaFamilyMemberDto, TkaFamilyMember>()
            .ForMember(dest => dest.Relationship, opt => opt.MapFrom(src => 
                Enum.Parse<Core.Enums.FamilyRelationship>(src.RelationshipText, true)))
            .ForMember(dest => dest.JenisKelamin, opt => opt.MapFrom(src => 
                Enum.Parse<Core.Enums.Gender>(src.JenisKelaminText, true)))
            .ForMember(dest => dest.TkaWorker, opt => opt.Ignore());

        CreateMap<JobDescription, JobDescriptionDto>()
            .ForMember(dest => dest.CompanyName, opt => opt.MapFrom(src => src.Company.CompanyName));

        CreateMap<JobDescriptionDto, JobDescription>()
            .ForMember(dest => dest.Company, opt => opt.Ignore())
            .ForMember(dest => dest.InvoiceLines, opt => opt.Ignore());

        CreateMap<Invoice, InvoiceDto>()
            .ForMember(dest => dest.CompanyName, opt => opt.MapFrom(src => src.Company.CompanyName))
            .ForMember(dest => dest.CompanyNpwp, opt => opt.MapFrom(src => src.Company.Npwp))
            .ForMember(dest => dest.CompanyAddress, opt => opt.MapFrom(src => src.Company.Address))
            .ForMember(dest => dest.StatusText, opt => opt.MapFrom(src => src.Status.ToString()))
            .ForMember(dest => dest.BankAccountName, opt => opt.MapFrom(src => 
                src.BankAccount != null ? src.BankAccount.BankName : null))
            .ForMember(dest => dest.LineCount, opt => opt.MapFrom(src => src.InvoiceLines.Count))
            .ForMember(dest => dest.CreatedByName, opt => opt.MapFrom(src => src.CreatedByUser.FullName))
            .ForMember(dest => dest.AmountInWords, opt => opt.MapFrom(src => 
                ConvertAmountToWords(src.TotalAmount)));

        CreateMap<InvoiceDto, Invoice>()
            .ForMember(dest => dest.Company, opt => opt.Ignore())
            .ForMember(dest => dest.BankAccount, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedByUser, opt => opt.Ignore())
            .ForMember(dest => dest.InvoiceLines, opt => opt.Ignore())
            .ForMember(dest => dest.Status, opt => opt.MapFrom(src => 
                Enum.Parse<InvoiceStatus>(src.StatusText, true)));

        CreateMap<InvoiceLine, InvoiceLineDto>()
            .ForMember(dest => dest.TkaName, opt => opt.MapFrom(src => src.TkaWorker.Nama))
            .ForMember(dest => dest.TkaPassport, opt => opt.MapFrom(src => src.TkaWorker.Passport))
            .ForMember(dest => dest.JobName, opt => opt.MapFrom(src => src.JobDescription.JobName))
            .ForMember(dest => dest.JobDescriptionText, opt => opt.MapFrom(src => 
                !string.IsNullOrEmpty(src.CustomJobDescription) ? 
                src.CustomJobDescription : src.JobDescription.JobDescription))
            .ForMember(dest => dest.DisplayJobName, opt => opt.MapFrom(src => 
                !string.IsNullOrEmpty(src.CustomJobName) ? 
                src.CustomJobName : src.JobDescription.JobName));

        CreateMap<InvoiceLineDto, InvoiceLine>()
            .ForMember(dest => dest.TkaWorker, opt => opt.Ignore())
            .ForMember(dest => dest.JobDescription, opt => opt.Ignore())
            .ForMember(dest => dest.Invoice, opt => opt.Ignore());

        CreateMap<BankAccount, BankAccountDto>();
        CreateMap<BankAccountDto, BankAccount>();

        CreateMap<Setting, SettingDto>();
        CreateMap<SettingDto, Setting>();

        CreateMap<UserPreference, UserPreferenceDto>();
        CreateMap<UserPreferenceDto, UserPreference>();

        CreateMap<ImportLog, ImportLogDto>()
            .ForMember(dest => dest.ImportedByName, opt => opt.MapFrom(src => src.ImportedByUser.FullName));

        CreateMap<CompanyTkaAssignment, CompanyTkaAssignmentDto>()
            .ForMember(dest => dest.CompanyName, opt => opt.MapFrom(src => src.Company.CompanyName))
            .ForMember(dest => dest.TkaName, opt => opt.MapFrom(src => src.TkaWorker.Nama))
            .ForMember(dest => dest.TkaPassport, opt => opt.MapFrom(src => src.TkaWorker.Passport))
            .ForMember(dest => dest.TkaDivisi, opt => opt.MapFrom(src => src.TkaWorker.Divisi));

        // Command to Entity mappings
        CreateMap<CreateInvoiceCommand, Invoice>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.InvoiceUuid, opt => opt.Ignore())
            .ForMember(dest => dest.Subtotal, opt => opt.Ignore())
            .ForMember(dest => dest.VatAmount, opt => opt.Ignore())
            .ForMember(dest => dest.TotalAmount, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.Company, opt => opt.Ignore())
            .ForMember(dest => dest.BankAccount, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedByUser, opt => opt.Ignore())
            .ForMember(dest => dest.InvoiceLines, opt => opt.Ignore());

        CreateMap<CreateInvoiceLineDto, InvoiceLine>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.LineUuid, opt => opt.Ignore())
            .ForMember(dest => dest.InvoiceId, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.Invoice, opt => opt.Ignore())
            .ForMember(dest => dest.TkaWorker, opt => opt.Ignore())
            .ForMember(dest => dest.JobDescription, opt => opt.Ignore());

        // Search result mappings
        CreateMap<Invoice, SearchResultDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id.ToString()))
            .ForMember(dest => dest.Title, opt => opt.MapFrom(src => $"Invoice {src.InvoiceNumber}"))
            .ForMember(dest => dest.Subtitle, opt => opt.MapFrom(src => src.Company.CompanyName))
            .ForMember(dest => dest.Description, opt => opt.MapFrom(src => 
                $"{src.InvoiceDate:dd/MM/yyyy} - {src.TotalAmount:C}"))
            .ForMember(dest => dest.EntityType, opt => opt.MapFrom(src => "Invoice"))
            .ForMember(dest => dest.Url, opt => opt.MapFrom(src => $"/invoices/{src.Id}"));

        CreateMap<Company, SearchResultDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id.ToString()))
            .ForMember(dest => dest.Title, opt => opt.MapFrom(src => src.CompanyName))
            .ForMember(dest => dest.Subtitle, opt => opt.MapFrom(src => $"NPWP: {src.Npwp}"))
            .ForMember(dest => dest.Description, opt => opt.MapFrom(src => src.Address))
            .ForMember(dest => dest.EntityType, opt => opt.MapFrom(src => "Company"))
            .ForMember(dest => dest.Url, opt => opt.MapFrom(src => $"/companies/{src.Id}"));

        CreateMap<TkaWorker, SearchResultDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id.ToString()))
            .ForMember(dest => dest.Title, opt => opt.MapFrom(src => src.Nama))
            .ForMember(dest => dest.Subtitle, opt => opt.MapFrom(src => $"Passport: {src.Passport}"))
            .ForMember(dest => dest.Description, opt => opt.MapFrom(src => src.Divisi))
            .ForMember(dest => dest.EntityType, opt => opt.MapFrom(src => "TKA"))
            .ForMember(dest => dest.Url, opt => opt.MapFrom(src => $"/tka/{src.Id}"));

        // TkaSelectionItem mapping
        CreateMap<TkaWorker, TkaSelectionItem>()
            .ForMember(dest => dest.DisplayName, opt => opt.MapFrom(src => 
                $"{src.Nama} (TKA - {src.Divisi} - {src.Passport})"))
            .ForMember(dest => dest.TkaMainName, opt => opt.MapFrom(src => src.Nama))
            .ForMember(dest => dest.Relationship, opt => opt.MapFrom(src => "TKA"))
            .ForMember(dest => dest.IsMainTka, opt => opt.MapFrom(src => true));

        CreateMap<TkaFamilyMember, TkaSelectionItem>()
            .ForMember(dest => dest.DisplayName, opt => opt.MapFrom(src => 
                $"{src.Nama} ({src.Relationship} of {src.TkaWorker.Nama} - {src.Passport})"))
            .ForMember(dest => dest.TkaMainName, opt => opt.MapFrom(src => src.TkaWorker.Nama))
            .ForMember(dest => dest.Nama, opt => opt.MapFrom(src => src.Nama))
            .ForMember(dest => dest.Passport, opt => opt.MapFrom(src => src.Passport))
            .ForMember(dest => dest.Divisi, opt => opt.MapFrom(src => src.TkaWorker.Divisi))
            .ForMember(dest => dest.Relationship, opt => opt.MapFrom(src => src.Relationship.ToString()))
            .ForMember(dest => dest.IsMainTka, opt => opt.MapFrom(src => false));
    }

    private static string ConvertAmountToWords(decimal amount)
    {
        // Simplified implementation - in real app, this would be a comprehensive
        // Indonesian number-to-words converter
        return $"{amount:N0} Rupiah";
    }
}