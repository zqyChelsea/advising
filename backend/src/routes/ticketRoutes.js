import express from 'express';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { sendTicketNotification, sendTicketReplyNotification, sendStudentReplyNotification } from '../services/emailService.js';

const router = express.Router();

// 测试邮件发送（无需登录，用于排查 Mailgun 配置）
router.get('/test-email', async (req, res) => {
  try {
    const teacherEmail = process.env.TEACHER_EMAIL;
    if (!teacherEmail) {
      return res.status(500).json({ error: 'TEACHER_EMAIL not configured' });
    }
    // 创建模拟的 ticket 和 user 对象用于测试
    const mockTicket = {
      _id: 'test_' + Date.now(),
      ticketId: 'TIC-TEST-' + Date.now().toString().slice(-4),
      title: 'Test Email',
      description: 'This is a test email from the advising platform.',
      category: 'other',
      createdAt: new Date()
    };
    const mockUser = {
      fullName: 'Test Student',
      firstName: 'Test',
      familyName: 'Student',
      studentId: '12345678',
      email: 'test@connect.polyu.hk'
    };
    console.log('[test-email] Sending test email to:', teacherEmail);
    const result = await sendTicketNotification(mockTicket, mockUser);
    if (result.success) {
      console.log('[test-email] Success:', result.messageId);
      return res.json({ success: true, messageId: result.messageId, to: teacherEmail });
    } else {
      console.error('[test-email] Failed:', result.error);
      return res.status(500).json({ success: false, error: result.error, to: teacherEmail });
    }
  } catch (error) {
    console.error('[test-email] Error:', error);
    return res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

// Get all tickets for user
router.get('/', protect, async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single ticket with replies
router.get('/:id', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, user: req.user.id });
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new ticket and send email notification
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, category } = req.body;

    const ticket = await Ticket.create({
      user: req.user.id,
      title,
      description,
      category
    });

    // Fetch user details for email
    const user = await User.findById(req.user.id);
    
    // Send email notification to teacher (async, don't wait)
    console.log('[ticket] Created ticket', ticket.ticketId, '- sending email to', process.env.TEACHER_EMAIL);
    sendTicketNotification(ticket, user)
      .then(result => {
        if (result.success) {
          console.log('[ticket] Email sent successfully for', ticket.ticketId);
          Ticket.findByIdAndUpdate(ticket._id, { 
            emailSent: true, 
            emailMessageId: result.messageId 
          }).exec();
        } else {
          console.error('[ticket] Email failed for', ticket.ticketId, ':', result.error);
        }
      })
      .catch(err => {
        console.error('[ticket] Email send error for', ticket.ticketId, ':', err.message);
        if (err.response) console.error('[ticket] API response:', err.response?.data);
      });

    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Batch delete tickets
router.post('/batch-delete', protect, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No tickets selected for deletion' });
    }

    const result = await Ticket.deleteMany({
      _id: { $in: ids },
      user: req.user.id
    });

    res.json({
      message: 'Tickets deleted successfully',
      deletedCount: result.deletedCount || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update ticket
router.put('/:id', protect, async (req, res) => {
  try {
    const { title, description, category, status } = req.body;

    const ticket = await Ticket.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { title, description, category, status },
      { new: true, runValidators: true }
    );

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add reply to ticket (for student)
router.post('/:id/reply', protect, async (req, res) => {
  try {
    const { content } = req.body;
    const user = await User.findById(req.user.id);

    let ticket = await Ticket.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      {
        $push: {
          replies: {
            from: user.fullName || `${user.firstName} ${user.familyName}`,
            fromEmail: user.email,
            content,
            isTeacher: false
          }
        }
      },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // 重新获取最新的 ticket（带上刚刚插入的回复）
    ticket = await Ticket.findById(ticket._id);

    // 取出最新一条学生回复
    const latestReply = ticket.replies[ticket.replies.length - 1];

    // 发送邮件给老师，包含这条最新学生提问
    sendStudentReplyNotification(ticket, latestReply, user).catch(err => 
      console.error('Error sending student follow-up notification:', err)
    );

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete ticket
router.delete('/:id', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findOneAndDelete({ _id: req.params.id, user: req.user.id });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Webhook for inbound email replies (from email service like SendGrid/Mailgun)
router.post('/webhook/email-reply', async (req, res) => {
  try {
    const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET;
    
    // Verify webhook secret if configured
    if (webhookSecret && req.headers['x-webhook-secret'] !== webhookSecret) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('Received inbound email webhook:', JSON.stringify(req.body, null, 2));

    // Parse the inbound email data - support both SendGrid and Mailgun formats
    // SendGrid format: from, to, subject, text, html
    // Mailgun format: sender, recipient, subject, body-plain, body-html, stripped-text
    const sender = req.body.sender || req.body.from;
    const recipient = req.body.recipient || req.body.to;
    const subject = req.body.subject;
    // 对于 Mailgun，优先使用 stripped-text，它已经去掉大部分引用内容
    const text = req.body['stripped-text'] || req.body['body-plain'] || req.body.text;
    const html = req.body['stripped-html'] || req.body['body-html'] || req.body.html;

    // Extract ticket ID from subject line [Issue Report TIC-XXXXXXXX-XXXX]
    const ticketIdMatch = subject?.match(/\[Issue Report (TIC-[A-Z0-9-]+)\]/);
    
    // Or extract from reply-to/recipient address (ticket-{objectId}@domain.com)
    const objectIdMatch = recipient?.match(/ticket-([a-f0-9]+)@/i);

    let ticket = null;

    if (ticketIdMatch) {
      console.log('Found ticket ID from subject:', ticketIdMatch[1]);
      ticket = await Ticket.findOne({ ticketId: ticketIdMatch[1] });
    } else if (objectIdMatch) {
      console.log('Found object ID from recipient:', objectIdMatch[1]);
      ticket = await Ticket.findById(objectIdMatch[1]);
    }

    if (!ticket) {
      console.log('No matching ticket found for email:', { sender, recipient, subject });
      return res.status(200).json({ message: 'No matching ticket found' });
    }

    // Extract sender name from email
    const fromMatch = sender?.match(/^"?([^"<]+)"?\s*<(.+)>$/);
    const senderName = fromMatch ? fromMatch[1].trim() : sender;
    const senderEmail = fromMatch ? fromMatch[2] : sender;

    // Clean up the reply text (remove quoted content)
    let replyContent = text || '';
    // Remove common email quote patterns（英文 "On ... wrote:"，以及中文 "写道："）
    replyContent = replyContent
      .split(/\n\s*On .* wrote:/)[0]
      .split(/\n.*写道：/)[0]
      .split(/\n\s*-{3,}/)[0]
      .split(/\n\s*_{3,}/)[0];

    // 去掉以 ">" 开头的引用行
    replyContent = replyContent
      .split('\n')
      .filter(line => !line.trim().startsWith('>'))
      .join('\n')
      .trim();

    // Check if this is a teacher reply (not a student reply)
    // Teachers reply from their email, students reply from the system
    const teacherEmail = process.env.TEACHER_EMAIL;
    const isTeacherReply = senderEmail && (
      senderEmail.includes(teacherEmail.split('@')[1]) || 
      senderEmail !== ticket.user?.email
    );

    // Add reply to ticket
    ticket.replies.push({
      from: senderName,
      fromEmail: senderEmail,
      content: replyContent,
      isTeacher: isTeacherReply
    });

    // Update status to in_progress if it was pending
    if (ticket.status === 'pending') {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    console.log('Reply added to ticket:', ticket.ticketId, 'from:', senderName, 'isTeacher:', isTeacherReply);

    // Notify student about the teacher reply
    const user = await User.findById(ticket.user);
    if (user && isTeacherReply) {
      const latestReply = ticket.replies[ticket.replies.length - 1];
      sendTicketReplyNotification(ticket, latestReply, user).catch(err =>
        console.error('Error sending reply notification to student:', err)
      );
    }

    res.status(200).json({ message: 'Reply processed successfully' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Manual endpoint to add teacher reply (for testing or admin use)
router.post('/admin/reply/:ticketId', async (req, res) => {
  try {
    const adminSecret = process.env.ADMIN_SECRET;
    
    // Simple authentication for admin endpoint
    if (adminSecret && req.headers['x-admin-secret'] !== adminSecret) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { content, from, fromEmail } = req.body;
    const { ticketId } = req.params;

    const ticket = await Ticket.findOne({ ticketId });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.replies.push({
      from: from || 'Teacher',
      fromEmail: fromEmail || process.env.TEACHER_EMAIL,
      content,
      isTeacher: true
    });

    if (ticket.status === 'pending') {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    // Notify student
    const user = await User.findById(ticket.user);
    if (user) {
      const latestReply = ticket.replies[ticket.replies.length - 1];
      sendTicketReplyNotification(ticket, latestReply, user).catch(err =>
        console.error('Error sending reply notification:', err)
      );
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
