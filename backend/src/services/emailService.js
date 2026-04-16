import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import dotenv from 'dotenv';

dotenv.config();

// Mailgun 配置
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_URL = process.env.MAILGUN_URL || 'https://api.mailgun.net';

// 初始化 Mailgun 客户端
let mailgun = null;
let mg = null;

const initMailgun = () => {
  console.log('=== Mailgun Email Service Initialization ===');
  console.log('MAILGUN_API_KEY:', MAILGUN_API_KEY ? '(set)' : '(not set)');
  console.log('MAILGUN_DOMAIN:', MAILGUN_DOMAIN);
  console.log('MAILGUN_URL:', MAILGUN_URL);

  if (!MAILGUN_API_KEY) {
    console.log('Mailgun API key not configured. Email features disabled.');
    console.log('====================================');
    return false;
  }

  try {
    mailgun = new Mailgun(FormData);
    mg = mailgun.client({
      username: 'api',
      key: MAILGUN_API_KEY,
      url: MAILGUN_URL
    });
    console.log('Mailgun client initialized successfully');
    console.log('====================================');
    return true;
  } catch (error) {
    console.error('Mailgun initialization error:', error.message);
    return false;
  }
};

// 初始化
initMailgun();

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;
// 固定的回复邮箱地址（必须在 Mailgun 域名下存在）
const REPLY_ADDRESS = process.env.MAILGUN_REPLY_TO;

// 获取基础 URL（用于生成回复链接）
const getBaseUrl = () => {
  return process.env.PUBLIC_URL || process.env.NGROK_URL || 'http://localhost:5001';
};

// 生成邮件回复链接
const getWebReplyUrl = (ticketId) => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/tickets?reply=${ticketId}`;
};

// HTML 转义函数，防止 XSS
const escapeHtml = (text) => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// 发送工单通知邮件（给学生创建工单后发送给老师）
export const sendTicketNotification = async (ticket, user) => {
  const categoryLabels = {
    credit_transfer: 'Credit Transfer',
    wie: 'WIE (Work-Integrated Education)',
    exchange: 'Exchange Programme',
    appeal: 'Appeal',
    other: 'Other'
  };

  const emailSubject = `[Issue Report ${ticket.ticketId}] ${ticket.title}`;

  const emailHtml = `
<!DOCTYPE html>
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
        <span class="label">Submitted:</span> ${new Date(ticket.createdAt).toLocaleString('en-US', { 
          dateStyle: 'full', 
          timeStyle: 'short' 
        })}
      </div>
    </div>
    <div class="footer">
      <p><strong>To reply to this issue report:</strong></p>
      <p><a href="${getWebReplyUrl(ticket.ticketId)}" style="display: inline-block; background: #6B8E7B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Reply on Web</a></p>
      <p style="margin-top: 15px; color: #999;">
        Or reply directly to this email. Your reply will be automatically added to the ticket.
      </p>
      <p style="margin-top: 15px; color: #999;">
        This is an automated message from the PolyU Advising & Wellness Platform.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const emailText = `
PolyU Advising - New Issue Report

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
To reply to this issue report:
1. Visit: ${getWebReplyUrl(ticket.ticketId)}
2. Or reply directly to this email - your reply will be automatically added to the ticket.
  `;

  // 使用固定的 Mailgun 邮箱作为回复地址，方便在 sandbox 域名上接收回复
  const replyToAddress = REPLY_ADDRESS;

  try {
    if (!mg) {
      console.log('Email not sent - Mailgun not initialized');
      return { success: false, error: 'Mailgun not initialized' };
    }

    console.log('Attempting to send email:');
    console.log('  From:', `PolyU Advising <postmaster@${MAILGUN_DOMAIN}>`);
    console.log('  To:', TEACHER_EMAIL);
    console.log('  Reply-To:', replyToAddress);
    console.log('  Subject:', emailSubject);

    const data = await mg.messages.create(MAILGUN_DOMAIN, {
      from: `PolyU Advising <postmaster@${MAILGUN_DOMAIN}>`,
      to: [TEACHER_EMAIL],
      'h:Reply-To': replyToAddress,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      'v: ticket-id': ticket.ticketId,
      'v: ticket-object-id': ticket._id.toString()
    });

    console.log('Email sent successfully:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Error sending email:', error.message);
    if (error.details) {
      console.error('Error details:', JSON.stringify(error.details, null, 2));
    }
    return { success: false, error: error.message };
  }
};

// 发送回复通知邮件（老师回复后通知学生）
export const sendTicketReplyNotification = async (ticket, reply, user) => {
  const emailSubject = `Re: [Issue Report ${ticket.ticketId}] ${ticket.title}`;

  const emailHtml = `
<!DOCTYPE html>
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
      
      <p>You can reply to this email to continue the conversation.</p>
    </div>
    <div class="footer">
      <p style="color: #999;">
        This is an automated message from the PolyU Advising & Wellness Platform.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  // 使用固定的 Mailgun 邮箱作为回复地址
  const replyToAddress = REPLY_ADDRESS;

  try {
    if (!mg) {
      return { success: false, error: 'Mailgun not initialized' };
    }

    const data = await mg.messages.create(MAILGUN_DOMAIN, {
      from: `PolyU Advising <postmaster@${MAILGUN_DOMAIN}>`,
      to: [user.email],
      'h:Reply-To': replyToAddress,
      subject: emailSubject,
      html: emailHtml,
      'v: ticket-id': ticket.ticketId
    });

    console.log('Reply notification sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Error sending reply notification:', error.message);
    return { success: false, error: error.message };
  }
};

// 学生在系统里追加提问时，通知老师（包含历史对话）
export const sendStudentReplyNotification = async (ticket, reply, user) => {
  // 主题用 Re: 开头，形成邮件对话链
  const emailSubject = `Re: [Issue Report ${ticket.ticketId}] ${ticket.title}`;

  // 构建历史对话摘要（用于追加在邮件末尾）
  const buildConversationHistory = () => {
    let historyHtml = '';
    let historyText = '';

    // 添加原始问题描述
    if (ticket.description) {
      historyHtml += `
        <div class="history-item" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
          <p style="margin: 0 0 5px; font-weight: bold; color: #666; font-size: 12px;">Original Question:</p>
          <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(ticket.description)}</p>
        </div>
      `;
      historyText += `\n--- Original Question ---\n${ticket.description}\n`;
    }

    // 添加之前的对话（排除刚发的这条）
    const previousReplies = ticket.replies.slice(0, -1);
    if (previousReplies.length > 0) {
      previousReplies.forEach((r, idx) => {
        const senderName = r.isTeacher ? 'Staff' : (user.fullName || 'Student');
        const label = r.isTeacher ? 'Staff replied' : 'Student asked';

        historyHtml += `
          <div class="history-item" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
            <p style="margin: 0 0 5px; font-weight: bold; color: #666; font-size: 12px;">${label}:</p>
            <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(r.content)}</p>
          </div>
        `;

        historyText += `\n--- ${label} ---\n${r.content}\n`;
      });
    }

    return { historyHtml, historyText };
  };

  const { historyHtml, historyText } = buildConversationHistory();

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #8EB19D; color: white; padding: 15px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .reply-box { background: white; padding: 15px; border-left: 4px solid #8EB19D; margin: 15px 0; }
    .footer { background: #f0f0f0; padding: 15px; border-radius: 0 0 10px 10px; font-size: 12px; color: #666; }
    .label { font-weight: bold; color: #6B8E7B; }
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
        <p style="margin-top: 15px; color: #999;">
          Or reply directly to this email. Your reply will be automatically added to the ticket.
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
</html>
  `;

  const emailText = `
Student follow-up

Ticket ID: ${ticket.ticketId}
Title: ${ticket.title}

Latest message:
${reply.content}

- ${user.fullName || `${user.firstName} ${user.familyName}`} | ${new Date(reply.createdAt).toLocaleString()}

${historyText}
---
To respond:
1. Visit: ${getWebReplyUrl(ticket.ticketId)}
2. Or reply directly to this email - your reply will be automatically added to the ticket.
  `;

  const replyToAddress = REPLY_ADDRESS;

  try {
    if (!mg) {
      console.log('Email not sent - Mailgun not initialized');
      return { success: false, error: 'Mailgun not initialized' };
    }

    console.log('Attempting to send student reply email to teacher:');
    console.log('  To:', TEACHER_EMAIL);
    console.log('  Subject:', emailSubject);

    const data = await mg.messages.create(MAILGUN_DOMAIN, {
      from: `PolyU Advising <postmaster@${MAILGUN_DOMAIN}>`,
      to: [TEACHER_EMAIL],
      'h:Reply-To': replyToAddress,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      'v: ticket-id': ticket.ticketId,
      'v: ticket-object-id': ticket._id.toString()
    });

    console.log('Student reply email sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Error sending student reply email:', error.message);
    return { success: false, error: error.message };
  }
};

// 验证邮件配置
export const verifyEmailConfig = async () => {
  if (!mg) {
    console.error('Mailgun not initialized');
    return false;
  }
  try {
    const domains = await mg.domains.list();
    console.log('Mailgun configuration verified. Available domains:', domains.items.map(d => d.name).join(', '));
    return true;
  } catch (error) {
    console.error('Mailgun configuration error:', error);
    return false;
  }
};

export default { sendTicketNotification, sendTicketReplyNotification, verifyEmailConfig };
