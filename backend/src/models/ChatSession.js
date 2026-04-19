import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true, unique: true },
  title: { type: String, default: '' },
  firstUserMessage: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('ChatSession', chatSessionSchema);
