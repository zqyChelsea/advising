import express from 'express';
import ChatMessage from '../models/ChatMessage.js';
import ChatSession from '../models/ChatSession.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Dify chatbot integration
router.post('/dify', protect, async (req, res) => {
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

    // Check if streaming is requested
    const isStreaming = req.headers.accept?.includes('text/event-stream') || req.body.streaming === true;

    const requestBody = {
      query,
      user: req.user?.id || 'anonymous',
      response_mode: isStreaming ? 'streaming' : 'blocking',
      inputs: inputs || {}
    };
    if (conversationId) {
      requestBody.conversation_id = conversationId;
    }

    const url = `${DIFY_BASE_URL.replace(/\/$/, '')}/chat-messages`;

    if (isStreaming) {
      // Streaming mode - use Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      let fullAnswer = '';
      let difyConversationId = conversationId || '';
      // Create a temporary session ID immediately if this is a new conversation
      const tempSessionId = difyConversationId || `temp_${Date.now()}`;
      let sessionCreated = false;
      let sessionIdToUse = tempSessionId;

      try {
        // Create session record immediately for new conversations
        if (!difyConversationId) {
          try {
            await ChatSession.findOneAndUpdate(
              { sessionId: tempSessionId },
              {
                user: req.user?.id,
                sessionId: tempSessionId,
                title: query.slice(0, 50) + (query.length > 50 ? '...' : ''),
                firstUserMessage: query
              },
              { upsert: true, new: true }
            );
            sessionCreated = true;
            // Notify frontend about the temp session ID immediately
            res.write(`data: ${JSON.stringify({ event: 'session_created', session_id: tempSessionId })}\n\n`);
          } catch (err) {
            console.error('Failed to create initial session:', err);
          }
        }

        const difyResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${DIFY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!difyResponse.ok) {
          const errorData = await difyResponse.json().catch(() => ({}));
          res.write(`event: error\ndata: ${JSON.stringify({ message: errorData?.message || 'Dify API error', code: errorData?.code || 'dify_error' })}\n\n`);
          res.end();
          return;
        }

        // Read the SSE stream and forward to client
        if (!difyResponse.body) {
          res.write(`event: error\ndata: ${JSON.stringify({ message: 'No response body' })}\n\n`);
          res.end();
          return;
        }

        const reader = difyResponse.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr === '[DONE]') {
                res.write(`event: done\ndata: ${JSON.stringify({ conversation_id: sessionIdToUse, answer: fullAnswer })}\n\n`);
                break;
              }

              try {
                const eventData = JSON.parse(dataStr);
                if (eventData.event === 'message' || eventData.event === 'agent_message') {
                  if (eventData.answer) {
                    fullAnswer += eventData.answer;
                  }
                  if (eventData.conversation_id && eventData.conversation_id !== difyConversationId) {
                    difyConversationId = eventData.conversation_id;
                    sessionIdToUse = difyConversationId;
                    // Update session with real Dify conversation_id if we used a temp ID
                    if (sessionCreated) {
                      // Migrate temp session to real session
                      await ChatSession.findOneAndDelete({ sessionId: tempSessionId }).catch(() => {});
                    }
                    try {
                      await ChatSession.findOneAndUpdate(
                        { sessionId: difyConversationId },
                        {
                          user: req.user?.id,
                          sessionId: difyConversationId,
                          title: query.slice(0, 50) + (query.length > 50 ? '...' : ''),
                          firstUserMessage: query
                        },
                        { upsert: true, new: true }
                      );
                      sessionCreated = true;
                    } catch (err) {
                      console.error('Failed to create session with real ID:', err);
                    }
                  }
                  res.write(`data: ${JSON.stringify({ event: eventData.event, answer: eventData.answer, conversation_id: sessionIdToUse })}\n\n`);
                } else if (eventData.event === 'agent_thought') {
                  res.write(`data: ${JSON.stringify({ event: 'thinking', thought: eventData.thought })}\n\n`);
                } else if (eventData.event === 'message_end') {
                  // Ensure session exists
                  if (!sessionCreated && sessionIdToUse) {
                    try {
                      await ChatSession.findOneAndUpdate(
                        { sessionId: sessionIdToUse },
                        {
                          user: req.user?.id,
                          sessionId: sessionIdToUse,
                          title: query.slice(0, 50) + (query.length > 50 ? '...' : ''),
                          firstUserMessage: query
                        },
                        { upsert: true, new: true }
                      );
                      sessionCreated = true;
                    } catch (err) {
                      console.error('Failed to create session at message_end:', err);
                    }
                  }
                  res.write(`data: ${JSON.stringify({ event: 'message_end', conversation_id: sessionIdToUse })}\n\n`);
                }
              } catch (parseError) {
                // Ignore malformed JSON in stream
              }
            }
          }
        }

        // Save messages to database after stream completes
        if (fullAnswer) {
          try {
            await ChatMessage.create({
              user: req.user?.id,
              sessionId: sessionIdToUse,
              role: 'user',
              content: query
            });
            await ChatMessage.create({
              user: req.user?.id,
              sessionId: sessionIdToUse,
              role: 'assistant',
              content: fullAnswer
            });
          } catch (dbError) {
            console.error('Failed to save streaming messages:', dbError);
          }
        }

        res.end();
      } catch (streamError) {
        console.error('Streaming error:', streamError);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Streaming failed' });
        } else {
          res.write(`event: error\ndata: ${JSON.stringify({ message: streamError.message })}\n\n`);
          res.end();
        }
      }
      return;
    }

    // Blocking mode (original behavior)
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
    const sessionId = conversationId || (data?.conversation_id ?? String(Date.now()));
    const userMsg = await ChatMessage.create({
      user: req.user?.id,
      sessionId,
      role: 'user',
      content: query
    }).catch(err => { console.error('Failed to save user message:', err); return null; });

    // 保存助手回复
    const assistantMsg = await ChatMessage.create({
      user: req.user?.id,
      sessionId,
      role: 'assistant',
      content: data?.answer || data?.message || ''
    }).catch(err => { console.error('Failed to save assistant message:', err); return null; });

    // Create or update session record
    await ChatSession.findOneAndUpdate(
      { sessionId },
      {
        user: req.user?.id,
        sessionId,
        title: query.slice(0, 50) + (query.length > 50 ? '...' : ''),
        firstUserMessage: query
      },
      { upsert: true, new: true }
    ).catch(err => { console.error('Failed to save session:', err); });

    res.json({
      ...data,
      _savedUserMsgId: userMsg?._id,
      _savedAssistantMsgId: assistantMsg?._id,
      _sessionId: sessionId
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
// NOTE: This route must be AFTER more specific routes like /sessions/list
router.get('/sessions/list', protect, async (req, res) => {
  try {
    // Get sessions with titles
    const sessions = await ChatSession.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Get message counts from ChatMessage
    const sessionIds = sessions.map(s => s.sessionId);
    const messageCounts = await ChatMessage.aggregate([
      { $match: { user: req.user.id, sessionId: { $in: sessionIds } } },
      { $group: { _id: '$sessionId', messageCount: { $sum: 1 } } }
    ]);

    const countMap = new Map(messageCounts.map(m => [m._id, m.messageCount]));

    const result = sessions.map(s => ({
      _id: s.sessionId,
      sessionId: s.sessionId,
      title: s.title || s.firstUserMessage?.slice(0, 50) || 'Untitled',
      firstUserMessage: s.firstUserMessage,
      createdAt: s.createdAt,
      messageCount: countMap.get(s.sessionId) || 0
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update session title
router.patch('/sessions/:sessionId', protect, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ message: 'Title is required' });
    }
    const session = await ChatSession.findOneAndUpdate(
      { user: req.user.id, sessionId: req.params.sessionId },
      { title: title.slice(0, 100) },
      { new: true }
    );
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    res.json(session);
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
    await ChatSession.deleteOne({
      user: req.user.id,
      sessionId: req.params.sessionId
    });
    res.json({ message: 'Session deleted successfully' });
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

// Get chat history for a session (generic route - must be last)
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

export default router;
