import express from 'express';
import ChatMessage from '../models/ChatMessage.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Dify chatbot integration
router.post('/dify', async (req, res) => {
  try {
    const DIFY_API_KEY = process.env.DIFY_API_KEY;
    const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';

    if (!DIFY_API_KEY || DIFY_API_KEY.trim() === '') {
      console.error('Dify: DIFY_API_KEY is not set');
      return res.status(503).json({
        message: 'Chat service is not configured. Please set DIFY_API_KEY.',
        code: 'dify_not_configured'
      });
    }

    const { query, conversationId, inputs } = req.body;

    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }

    const requestBody = {
      query,
      user: req.user?.id || 'anonymous',
      response_mode: 'blocking',
      inputs: inputs || {}
    };
    if (conversationId) {
      requestBody.conversation_id = conversationId;
    }

    const url = `${DIFY_BASE_URL.replace(/\/$/, '')}/chat-messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const contentType = response.headers.get('content-type') || '';
    let data;
    try {
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Dify returned non-JSON:', contentType, text?.slice(0, 300));
        return res.status(502).json({
          message: 'Chat service returned an invalid response. Try again or contact support.',
          code: 'dify_invalid_response'
        });
      }
    } catch (parseError) {
      console.error('Dify response parse error:', parseError);
      return res.status(502).json({
        message: 'Could not read chat service response. Please try again.',
        code: 'dify_parse_error'
      });
    }

    if (!response.ok) {
      const message = data?.message || data?.msg || 'Dify API error';
      const code = data?.code || 'dify_error';
      console.error('Dify API error:', response.status, code, message, data);
      return res.status(response.status >= 500 ? 502 : response.status).json({
        message,
        code,
        error: data
      });
    }

    // 保存用户消息
    const userMsg = await ChatMessage.create({
      user: req.user?.id,
      sessionId: conversationId || (data?.conversation_id ?? String(Date.now())),
      role: 'user',
      content: query
    }).catch(err => { console.error('Failed to save user message:', err); return null; });

    // 保存助手回复
    const assistantSessionId = conversationId || (data?.conversation_id ?? String(Date.now()));
    const assistantMsg = await ChatMessage.create({
      user: req.user?.id,
      sessionId: assistantSessionId,
      role: 'assistant',
      content: data?.answer || data?.message || ''
    }).catch(err => { console.error('Failed to save assistant message:', err); return null; });

    res.json({
      ...data,
      _savedUserMsgId: userMsg?._id,
      _savedAssistantMsgId: assistantMsg?._id,
      _sessionId: assistantSessionId
    });
  } catch (error) {
    console.error('Dify chat error:', error);
    const isNetwork = error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND' || error.name === 'TypeError';
    return res.status(isNetwork ? 502 : 500).json({
      message: isNetwork
        ? 'Cannot reach chat service. Check DIFY_BASE_URL and network.'
        : (error.message || 'Chat service error. Please try again.'),
      code: 'dify_request_failed'
    });
  }
});

// Get chat history for a session
router.get('/:sessionId', protect, async (req, res) => {
  try {
    const messages = await ChatMessage.find({
      user: req.user.id,
      sessionId: req.params.sessionId
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Save chat message
router.post('/', protect, async (req, res) => {
  try {
    const { sessionId, role, content, references } = req.body;

    const message = await ChatMessage.create({
      user: req.user.id,
      sessionId,
      role,
      content,
      references
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all sessions for user
router.get('/sessions/list', protect, async (req, res) => {
  try {
    const sessions = await ChatMessage.aggregate([
      { $match: { user: req.user.id } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$sessionId',
          lastMessage: { $last: '$content' },
          lastRole: { $last: '$role' },
          createdAt: { $last: '$createdAt' },
          messageCount: { $sum: 1 }
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: 20 }
    ]);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a session
router.delete('/sessions/:sessionId', protect, async (req, res) => {
  try {
    await ChatMessage.deleteMany({
      user: req.user.id,
      sessionId: req.params.sessionId
    });
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
