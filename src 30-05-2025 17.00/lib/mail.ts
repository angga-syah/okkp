// lib/mail.ts
import nodemailer from 'nodemailer';

// Create a reusable transporter object using SMTP
export const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    // Improve deliverability and prevent spam flags
    tls: {
      rejectUnauthorized: false // Helps with some SMTP servers
    },
    // Additional anti-spam measures
    pool: true, // Use pooled connections
    maxConnections: 5, // Limit concurrent connections
    maxMessages: 100 // Limit messages per connection
  });
};

// Helper function for sending emails with error handling and retry
export const sendMail = async (options: nodemailer.SendMailOptions, retries = 2) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      ...options,
      // Set common headers to improve deliverability
      headers: {
        'X-Priority': '1', // High priority
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
        ...options.headers
      }
    });
    
    return { success: true, messageId: info.messageId, error: null };
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Implement simple retry logic
    if (retries > 0) {
      // Wait a short time before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      return sendMail(options, retries - 1);
    }
    
    return { success: false, messageId: null, error: error };
  }
};