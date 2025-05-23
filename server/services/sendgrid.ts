import { MailService } from '@sendgrid/mail';

// Initialize SendGrid
const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY || "");

const DEFAULT_FROM_EMAIL = "jm@analyticphilosophy.ai";

interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
  fromEmail?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  const { to, subject, text, html, fromEmail = DEFAULT_FROM_EMAIL } = params;
  
  try {
    await mailService.send({
      to,
      from: fromEmail,
      subject,
      text,
      html: html || text
    });
    
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export async function sendDocumentEmail(params: {
  to: string;
  subject: string;
  text: string;
  originalText: string;
  transformedText: string;
}): Promise<boolean> {
  const { to, subject, text, originalText, transformedText } = params;
  
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3b82f6; color: white; padding: 10px 20px; border-radius: 4px; }
          .content { padding: 20px 0; }
          .text-block { border: 1px solid #e5e7eb; border-radius: 4px; padding: 15px; margin-bottom: 20px; }
          .footer { font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>EZ Reader Document</h1>
          </div>
          <div class="content">
            <p>${text}</p>
            
            <h2>Transformed Text</h2>
            <div class="text-block">
              ${transformedText.replace(/\n/g, '<br>')}
            </div>
            
            <h2>Original Text</h2>
            <div class="text-block">
              ${originalText.replace(/\n/g, '<br>')}
            </div>
          </div>
          <div class="footer">
            <p>This email was sent from EZ Reader - a text transformation application.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return sendEmail({
    to,
    subject,
    text: `${text}\n\nTransformed Text:\n${transformedText}\n\nOriginal Text:\n${originalText}`,
    html
  });
}
