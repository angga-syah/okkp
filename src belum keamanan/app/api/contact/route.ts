import { NextRequest, NextResponse } from 'next/server';
import nodemailer from "nodemailer";
import { z } from 'zod';

export const runtime = 'nodejs';

const contactTranslations = {
  en: {
    validation: {
      nameMin: "Name must be at least 2 characters",
      nameMax: "Name cannot exceed 100 characters",
      nameFormat: "Name can only contain letters",
      emailInvalid: "Invalid email format",
      emailTooLong: "Email is too long",
      messageMin: "Message must be at least 10 characters",
      messageMax: "Message cannot exceed 1000 characters",
      tokenRequired: "Security token is required"
    },
    errors: {
      methodNotAllowed: "Method not allowed",
      invalidContentType: "Invalid content type",
      invalidFormat: "Invalid data format",
      processingFailed: "Failed to process data",
      validationFailed: "Data validation failed",
      serverConfig: "Incomplete server configuration",
      securityVerification: "Security verification failed. Please try again.",
      sendingFailed: "Failed to send message. Please try again later."
    },
    success: {
      messageSent: "Thank you, your message has been sent successfully"
    },
    email: {
      subject: "New Contact Form Submission from",
      heading: "New Contact Form Submission",
      nameLabel: "Name:",
      emailLabel: "Email:",
      messageLabel: "Message:"
    }
  },
  id: {
    validation: {
      nameMin: "Nama minimal 2 karakter",
      nameMax: "Nama maksimal 100 karakter",
      nameFormat: "Nama hanya boleh berisi huruf",
      emailInvalid: "Format email tidak valid",
      emailTooLong: "Email terlalu panjang",
      messageMin: "Pesan minimal 10 karakter",
      messageMax: "Pesan maksimal 1000 karakter",
      tokenRequired: "Token keamanan diperlukan"
    },
    errors: {
      methodNotAllowed: "Metode tidak diizinkan",
      invalidContentType: "Format data tidak valid",
      invalidFormat: "Format data tidak valid",
      processingFailed: "Gagal memproses data",
      validationFailed: "Validasi data gagal",
      serverConfig: "Konfigurasi server tidak lengkap",
      securityVerification: "Verifikasi keamanan gagal. Silakan coba lagi.",
      sendingFailed: "Gagal mengirim pesan. Silakan coba lagi nanti."
    },
    success: {
      messageSent: "Terima kasih, pesan Anda berhasil dikirim"
    },
    email: {
      subject: "Kiriman Formulir Kontak Baru dari",
      heading: "Kiriman Formulir Kontak Baru",
      nameLabel: "Nama:",
      emailLabel: "Email:",
      messageLabel: "Pesan:"
    }
  }
};

// validasi input
const createContactSchema = (lang: 'en' | 'id' = 'en') => {
  const t = contactTranslations[lang].validation;
  
  return z.object({
    name: z.string()
      .trim()
      .min(2, { message: t.nameMin })
      .max(100, { message: t.nameMax })
      .refine(value => /^[a-zA-Z\s]+$/.test(value), { 
        message: t.nameFormat
      }),
    
    email: z.string()
      .trim()
      .email({ message: t.emailInvalid })
      .max(100, { message: t.emailTooLong }),
    
    message: z.string()
      .trim()
      .min(10, { message: t.messageMin })
      .max(1000, { message: t.messageMax }),
    
    turnstileToken: z.string()
      .min(1, { message: t.tokenRequired }),
      
    language: z.enum(['en', 'id']).default('en')
  });
};

// tipe response
type ResponseData = {
  success?: boolean;
  message?: string;
  error?: string;
  validationErrors?: Array<{
    field: string;
    message: string;
  }>;
}

// Define types for the error details
type TurnstileErrorDetails = string[] | string | undefined;

// verifikasi token turnstile 
async function verifyTurnstileToken(token: string, retries = 2): Promise<{
  success: boolean;
  reason?: string;
  details?: TurnstileErrorDetails;
}> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const formData = new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY || '',
        response: token
      });

      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'ContactFormAPI/1.0'
          },
          body: formData
        }
      );

      clearTimeout(timeoutId);

      // cek respon status
      if (!response.ok) {
        console.error(`Turnstile verification HTTP error: ${response.status}`);
        return {
          success: false,
          reason: `HTTP Error ${response.status}`,
          details: await response.text()
        };
      }

      const data = await response.json();
      
      if (data.success) {
        return { success: true };
      }
      return {
        success: false,
        reason: 'Verification failed',
        details: data['error-codes']
      };

    } catch (error) {
      console.error(`Turnstile verification network error:`, error);
      
      if (attempt === retries) {
        return {
          success: false,
          reason: 'Network error',
          details: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  }

  return {
    success: false,
    reason: 'Unexpected verification failure'
  };
}

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await request.json();
    // deteksi bahasa
    const lang = (parsedBody?.language || 'en') as 'en' | 'id';
    const t = contactTranslations[lang].errors;
    const successMsg = contactTranslations[lang].success;
    const emailT = contactTranslations[lang].email;

    // validasi konten
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json<ResponseData>({ 
        error: t.invalidContentType, 
        validationErrors: [{ 
          field: 'general', 
          message: t.invalidContentType 
        }]
      }, { status: 400 });
    }

    // skema bahasa
    const ContactSchema = createContactSchema(lang);
    
    // validasi zod
    const validationResult = ContactSchema.safeParse(parsedBody);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        field: err.path[0] as string,
        message: err.message
      }));

      return NextResponse.json<ResponseData>({ 
        error: t.validationFailed,
        validationErrors: errors
      }, { status: 400 });
    }

    const { name, email, message, turnstileToken } = validationResult.data;

    // turnstile verifikasi
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      console.error("Missing TURNSTILE_SECRET_KEY environment variable");
      return NextResponse.json<ResponseData>({ 
        error: t.serverConfig,
        validationErrors: [{ 
          field: 'general', 
          message: t.serverConfig 
        }]
      }, { status: 500 });
    }

    const tokenVerification = await verifyTurnstileToken(turnstileToken);
    
    if (!tokenVerification.success) {
      return NextResponse.json<ResponseData>({ 
        error: t.securityVerification,
        validationErrors: [{ 
          field: 'turnstileToken', 
          message: t.securityVerification 
        }]
      }, { status: 403 });
    }

    // konfigurasi email
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // isi email
    const mailOptions = {
      from: `"Website Contact Form" <${process.env.EMAIL}>`,
      to: process.env.EMAIL,
      replyTo: email, //reply email sender
      subject: `${emailT.subject} ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${emailT.heading}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>${emailT.nameLabel}</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>${emailT.emailLabel}</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;" colspan="2"><strong>${emailT.messageLabel}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;" colspan="2">
                ${message.replace(/\n/g, '<br>')}
              </td>
            </tr>
          </table>
        </div>
      `,
      text: `
        ${emailT.heading}
        
        ${emailT.nameLabel} ${name}
        ${emailT.emailLabel} ${email}
        
        ${emailT.messageLabel} ${message}
      `
    };

    // kirim email dan tidak perlu menyimpan info
    await transporter.sendMail(mailOptions);
    
    // respon sukses
    return NextResponse.json<ResponseData>({ 
      success: true, 
      message: successMsg.messageSent 
    }, { status: 200 });

  } catch (error) {
     if (error instanceof SyntaxError) {
      return NextResponse.json<ResponseData>({
        error: "Invalid JSON format",
        validationErrors: [{ 
          field: 'general', 
          message: "Failed to process data" 
        }]
      }, { status: 400 });
    }

    // error log
    console.error("Detailed error:", {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });

    return NextResponse.json<ResponseData>({ 
      error: "An unexpected error occurred",
      validationErrors: [{ 
        field: 'general', 
        message: "Failed to process your request" 
      }]
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}