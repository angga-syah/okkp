import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/sb_client';
import { sendMail } from '@/lib/mail';
import path from 'path';
import fs from 'fs';

// Logo path for email
const LOGO_PATH = path.join(process.cwd(), 'public', 'images', 'logo', 'logo_email.png');

// Define the attachment interface
interface EmailAttachment {
  filename: string;
  path: string;
  cid?: string;
}

// Email translation content for revision request
interface EmailTranslations {
  subject: string;
  title: string;
  greeting: string;
  message: string;
  actionNeeded: string;
  uploadInstructions: string;
  trackOrder: string;
  support: string;
  footer: string;
}

const translations: Record<string, EmailTranslations> = {
  en: {
    subject: "Document Revision Required - ",
    title: "Document Revision Required",
    greeting: "Hello",
    message: "Our team has reviewed your documents and we need you to make some changes before we can proceed with your application.",
    actionNeeded: "Action needed",
    uploadInstructions: "Please upload a revised document through our customer portal by clicking the button below:",
    trackOrder: "Upload",
    support: "If you have any questions, please contact our support team via email or WhatsApp listed on our website.",
    footer: "This message was sent automatically, please do not reply to this email."
  },
  id: {
    subject: "Revisi Dokumen Diperlukan - ",
    title: "Revisi Dokumen Diperlukan",
    greeting: "Halo",
    message: "Tim kami telah mereview dokumen Anda dan kami memerlukan beberapa perubahan sebelum dapat melanjutkan aplikasi Anda.",
    actionNeeded: "Tindakan diperlukan",
    uploadInstructions: "Silakan unggah dokumen revisi melalui portal pelanggan kami dengan mengklik tombol di bawah ini:",
    trackOrder: "Unggah",
    support: "Jika Anda memiliki pertanyaan, silakan hubungi tim dukungan kami melalui email atau WhatsApp yang tercantum di website.",
    footer: "Pesan ini dikirim secara otomatis, mohon jangan membalas email ini."
  }
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Check if required environment variables are set for email
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email configuration missing' 
      }, { status: 500 });
    }
    
    // Parse request body
    const body = await req.json();
    const { orderId, revisionMessage } = body;
    
    if (!orderId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Order ID is required' 
      }, { status: 400 });
    }
    
    if (!revisionMessage) {
      return NextResponse.json({ 
        success: false, 
        message: 'Revision message is required' 
      }, { status: 400 });
    }
    
    // Get order data from Supabase
    const { data: orderData, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
      
    if (orderError || !orderData) {
      return NextResponse.json({ 
        success: false, 
        message: 'Order not found',
        error: orderError?.message 
      }, { status: 404 });
    }
    
    // Use the language from the order data, falling back to 'en' if not available
    const customerLanguage = orderData.language || 'en';
    // Make sure we have translations for this language, otherwise fallback to English
    const t = translations[customerLanguage] || translations.en;
    
    // Set up attachments - logo file
    let logoAttachment: EmailAttachment | undefined;
    try {
      if (fs.existsSync(LOGO_PATH)) {
        logoAttachment = {
          filename: 'logo.png',
          path: LOGO_PATH,
          cid: 'company-logo'
        };
      }
    } catch (error) {
      // Continue without logo if there's an error
      console.error('Error loading logo file:', error);
    }
    
    // Prepare email attachments
    const attachments: EmailAttachment[] = [];
    if (logoAttachment) {
      attachments.push(logoAttachment);
    }
    
    // Base URL for customer portal
    const baseUrl = process.env.NEXT_PUBLIC_TRACK_URL || 'https://demo.fortunasadanioga.com/track';
    
    // Send email to customer with Nodemailer
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const emailResult = await sendMail({
      from: `"E-Visa Service" <${fromEmail}>`,
      to: orderData.email,
      subject: `${t.subject}${orderData.service_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header with Logo -->
          <div style="background-color: #fff3e0; padding: 25px; text-align: center; border-bottom: 1px solid #e2e8f0;">
            ${logoAttachment ? `<img src="cid:company-logo" alt="E-Visa Service Logo" style="max-height: 70px; margin-bottom: 15px;">` : ''}
            <h2 style="color: #ed8936; margin: 0; font-size: 24px;">${t.title}</h2>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; margin-bottom: 25px;">${t.greeting} <strong>${orderData.name}</strong>,</p>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">${t.message}</p>
            
            <div style="background-color: #fffaf0; border-left: 4px solid #ed8936; padding: 15px; margin-bottom: 25px;">
              <p style="margin: 0 0 10px 0; font-weight: bold; font-size: 16px; color: #ed8936;">${t.actionNeeded}</p>
              <p style="margin: 0; font-size: 16px;">${revisionMessage}</p>
            </div>
            
            <p style="font-size: 16px; margin-bottom: 20px;">${t.uploadInstructions}</p>
            
            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}?email=${encodeURIComponent(orderData.email)}&invoiceId=${encodeURIComponent(orderData.invoice_id)}" style="display: inline-block; background-color: #ed8936; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; letter-spacing: 0.5px; transition: background-color 0.3s ease;">${t.trackOrder}</a>
            </div>
            
            <!-- Support Info -->
            <div style="background-color: #f0f7ff; padding: 15px; border-radius: 6px; margin-top: 25px;">
              <p style="margin: 0; font-size: 15px;">${t.support}</p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="padding: 20px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="color: #64748b; font-size: 13px; margin: 0;">${t.footer}</p>
          </div>
        </div>
      `,
      attachments
    });
    
    if (!emailResult.success) {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to send revision request email',
        error: emailResult.error
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Revision request email sent successfully',
      messageId: emailResult.messageId
    }, { status: 200 });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to send revision request email',
      error: process.env.NODE_ENV === 'development' ? String(error) : 'Server error'
    }, { status: 500 });
  }
}