import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.mailgun.org';
const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_NAME = process.env.SMTP_FROM_NAME || 'PolyU Advising';
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || SMTP_USER;

let transporter = null;

const initTransporter = () => {
  console.log('=== Email Service Initialization (SMTP) ===');
  console.log('SMTP_HOST:', SMTP_HOST);
  console.log('SMTP_PORT:', SMTP_PORT);
  console.log('SMTP_USER:', SMTP_USER ? '(set)' : '(not set)');
  console.log('SMTP_PASS:', SMTP_PASS ? '(set)' : '(not set)');

  if (!SMTP_USER || !SMTP_PASS) {
    console.log('SMTP credentials not configured. Email features disabled.');
    console.log('====================================');
    return false;
  }

  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    console.log('SMTP transporter created successfully');
    console.log('====================================');
    return true;
  } catch (error) {
    console.error('SMTP transporter error:', error.message);
    return false;
  }
};

initTransporter();

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

const getBaseUrl = () => {
  return process.env.PUBLIC_URL || process.env.NGROK_URL || 'http://localhost:5001';
};

const getWebReplyUrl = (ticketId) => {
  return `${getBaseUrl()}/tickets?reply=${ticketId}`;
};

const escapeHtml = (text) => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const mailOptionsBase = (to, subject, html, text) => ({
  from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
  to,
  subject,
  html,
  text
});

export const sendTicketNotification = async (ticket, user) => {
  const categoryLabels = {
    credit_transfer: 'Credit Transfer',
    wie: 'WIE (Work-Integrated Education)',
    exchange: 'Exchange Programme',
    appeal: 'Appeal',
    other: 'Other'
  };

  const emailSubject = `[Issue Report ${ticket.ticketId}] ${ticket.title}`;

  const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #8EB19D; color: white; padding: 20px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .footer { background: #f0f0f0; padding: 15px; border-radius: 0 0 10px 10px; font-size: 12px; color: #666; }
    .label { font-weight: bold; color: #6B8E7B; }
    .ticket-id { background: #6B8E7B; color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px; }
    .info-row { margin: 10px 0; padding: 10px; background: white; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">PolyU Advising - New Issue Report</h2>
      <span class="ticket-id">${ticket.ticketId}</span>
    </div>
    <div class="content">
      <p>A new issue report has been submitted by a student.</p>
      <div class="info-row">
        <span class="label">Student:</span> ${user.fullName || `${user.firstName} ${user.familyName}`}
      </div>
      <div class="info-row">
        <span class="label">Student ID:</span> ${user.studentId}
      </div>
      <div class="info-row">
        <span class="label">Email:</span> ${user.email}
      </div>
      <div class="info-row">
        <span class="label">Category:</span> ${categoryLabels[ticket.category] || ticket.category}
      </div>
      <div class="info-row">
        <span class="label">Title:</span> ${ticket.title}
      </div>
      <div class="info-row">
        <span class="label">Description:</span><br/>
        <p style="margin: 10px 0 0 0; white-space: pre-wrap;">${ticket.description || 'No description provided.'}</p>
      </div>
      <div class="info-row">
        <span class="label">Submitted:</span> ${new Date(ticket.createdAt).toLocaleString()}
      </div>
    </div>
    <div class="footer">
      <p><strong>To reply to this issue report:</strong></p>
      <p><a href="${getWebReplyUrl(ticket.ticketId)}" style="display: inline-block; background: #6B8E7B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Reply on Web</a></p>
      <p style="margin-top: 15px; color: #999;">
        This is an automated message from the PolyU Advising & Wellness Platform.
      </p>
    </div>
  </div>
</body>
</html>`;

  const emailText = `PolyU Advising - New Issue Report

Ticket ID: ${ticket.ticketId}

Student: ${user.fullName || `${user.firstName} ${user.familyName}`}
Student ID: ${user.studentId}
Email: ${user.email}
Category: ${categoryLabels[ticket.category] || ticket.category}

Title: ${ticket.title}

Description:
${ticket.description || 'No description provided.'}

Submitted: ${new Date(ticket.createdAt).toLocaleString()}

---
To reply, visit: ${getWebReplyUrl(ticket.ticketId)}`;

  try {
    if (!transporter) {
      console.log('Email not sent - SMTP transporter not initialized');
      return { success: false, error: 'SMTP transporter not initialized' };
    }

    console.log('Attempting to send email:');
    console.log('  From:', `"${FROM_NAME}" <${FROM_EMAIL}>`);
    console.log('  To:', TEACHER_EMAIL);
    console.log('  Subject:', emailSubject);

    const info = await transporter.sendMail(mailOptionsBase(TEACHER_EMAIL, emailSubject, emailHtml, emailText));
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error.message);
    return { success: false, error: error.message };
  }
};

export const sendTicketReplyNotification = async (ticket, reply, user) => {
  const emailSubject = `Re: [Issue Report ${ticket.ticketId}] ${ticket.title}`;

  const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6B8E7B; color: white; padding: 15px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .reply-box { background: white; padding: 15px; border-left: 4px solid #6B8E7B; margin: 15px 0; }
    .footer { background: #f0f0f0; padding: 15px; border-radius: 0 0 10px 10px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h3 style="margin: 0;">Reply to Your Issue Report</h3>
      <small>${ticket.ticketId}</small>
    </div>
    <div class="content">
      <p>Dear ${user.firstName},</p>
      <p>You have received a reply to your issue report "<strong>${ticket.title}</strong>":</p>
      <div class="reply-box">
        <p style="margin: 0; white-space: pre-wrap;">${reply.content}</p>
        <small style="color: #666; margin-top: 10px; display: block;">
          - ${reply.from} | ${new Date(reply.createdAt).toLocaleString()}
        </small>
      </div>
    </div>
    <div class="footer">
      <p style="color: #999;">
        This is an automated message from the PolyU Advising & Wellness Platform.
      </p>
    </div>
  </div>
</body>
</html>`;

  const emailText = `Reply to Your Issue Report

Ticket ID: ${ticket.ticketId}
Title: ${ticket.title}

${reply.content}

- ${reply.from} | ${new Date(reply.createdAt).toLocaleString()}`;

  try {
    if (!transporter) {
      return { success: false, error: 'SMTP transporter not initialized' };
    }
    const info = await transporter.sendMail(mailOptionsBase(user.email, emailSubject, emailHtml, emailText));
    console.log('Reply notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending reply notification:', error.message);
    return { success: false, error: error.message };
  }
};

export const sendStudentReplyNotification = async (ticket, reply, user) => {
  const emailSubject = `Re: [Issue Report ${ticket.ticketId}] ${ticket.title}`;

  const buildConversationHistory = () => {
    let historyHtml = '';
    let historyText = '';

    if (ticket.description) {
      historyHtml += `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
          <p style="margin: 0 0 5px; font-weight: bold; color: #666; font-size: 12px;">Original Question:</p>
          <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(ticket.description)}</p>
        </div>`;
      historyText += `\n--- Original Question ---\n${ticket.description}\n`;
    }

    const previousReplies = ticket.replies.slice(0, -1);
    if (previousReplies.length > 0) {
      previousReplies.forEach((r) => {
        const label = r.isTeacher ? 'Staff replied' : 'Student asked';
        historyHtml += `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
          <p style="margin: 0 0 5px; font-weight: bold; color: #666; font-size: 12px;">${label}:</p>
          <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(r.content)}</p>
        </div>`;
        historyText += `\n--- ${label} ---\n${r.content}\n`;
      });
    }

    return { historyHtml, historyText };
  };

  const { historyHtml, historyText } = buildConversationHistory();

  const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #8EB19D; color: white; padding: 15px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .reply-box { background: white; padding: 15px; border-left: 4px solid #8EB19D; margin: 15px 0; }
    .footer { background: #f0f0f0; padding: 15px; border-radius: 0 0 10px 10px; font-size: 12px; color: #666; }
    .history-section { margin-top: 20px; padding-top: 15px; border-top: 2px solid #ddd; }
    .history-title { font-weight: bold; color: #666; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h3 style="margin: 0;">Student follow-up</h3>
      <small>${ticket.ticketId} · ${ticket.title}</small>
    </div>
    <div class="content">
      <p>A student has responded to your earlier reply.</p>
      <div class="reply-box">
        <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(reply.content)}</p>
        <small style="color: #666; margin-top: 10px; display: block;">
          - ${user.fullName || `${user.firstName} ${user.familyName}`} | ${new Date(reply.createdAt).toLocaleString()}
        </small>
      </div>
      ${historyHtml}
      <div class="history-section">
        <p class="history-title">To respond:</p>
        <p>
          <a href="${getWebReplyUrl(ticket.ticketId)}"
             style="display:inline-block;background:#6B8E7B;color:white;padding:10px 20px;
                    text-decoration:none;border-radius:5px;margin:10px 0;">
            Reply on Web
          </a>
        </p>
      </div>
    </div>
    <div class="footer">
      <p style="color: #999;">
        This is an automated message from the PolyU Advising & Wellness Platform.
      </p>
    </div>
  </div>
</body>
</html>`;

  const emailText = `Student follow-up

Ticket ID: ${ticket.ticketId}
Title: ${ticket.title}

Latest message:
${reply.content}

- ${user.fullName || `${user.firstName} ${user.familyName}`} | ${new Date(reply.createdAt).toLocaleString()}

${historyText}
---
To respond, visit: ${getWebReplyUrl(ticket.ticketId)}`;

  try {
    if (!transporter) {
      console.log('Email not sent - SMTP transporter not initialized');
      return { success: false, error: 'SMTP transporter not initialized' };
    }

    console.log('Attempting to send student reply email to teacher:');
    console.log('  To:', TEACHER_EMAIL);
    console.log('  Subject:', emailSubject);

    const info = await transporter.sendMail(mailOptionsBase(TEACHER_EMAIL, emailSubject, emailHtml, emailText));
    console.log('Student reply email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending student reply email:', error.message);
    return { success: false, error: error.message };
  }
};

export const verifyEmailConfig = async () => {
  if (!transporter) {
    console.error('SMTP transporter not initialized');
    return false;
  }
  try {
    const verified = await transporter.verify();
    console.log('SMTP configuration verified:', verified);
    return verified;
  } catch (error) {
    console.error('SMTP verify error:', error);
    return false;
  }
};

export default {
  sendTicketNotification,
  sendTicketReplyNotification,
  sendStudentReplyNotification,
  verifyEmailConfig
};
