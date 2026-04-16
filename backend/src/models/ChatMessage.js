import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  references: [{
    document: String,
    page: String,
    confidence: String
  }]
}, { timestamps: true });

export default mongoose.model('ChatMessage', chatMessageSchema);
