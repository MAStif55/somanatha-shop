import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;
const EMAIL_TO = process.env.EMAIL_TO || SMTP_USER; // Default to sending to self if not specified

interface EmailOptions {
    to?: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        console.warn('SMTP credentials not configured, skipping email');
        return false;
    }

    try {
        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465, // true for 465, false for other ports
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: EMAIL_FROM,
            to: to || EMAIL_TO,
            subject,
            html,
        });

        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}
