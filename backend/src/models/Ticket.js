import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  from: { type: String, required: true },
  fromEmail: { type: String },
  content: { type: String, required: true },
  isTeacher: { type: Boolean, default: false },
  emailMessageId: { type: String }
}, { timestamps: true });

const ticketSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, enum: ['credit_transfer', 'wie', 'exchange', 'appeal', 'other'], required: true },
  status: { type: String, enum: ['pending', 'in_progress', 'resolved', 'closed'], default: 'pending' },
  ticketId: { type: String, unique: true },
  assignedTo: { type: String },
  slaDeadline: { type: Date },
  attachments: [{ name: String, url: String }],
  replies: [replySchema],
  emailSent: { type: Boolean, default: false },
  emailMessageId: { type: String }
}, { timestamps: true });

// Generate unique ticket ID before saving
ticketSchema.pre('save', async function(next) {
  if (!this.ticketId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.ticketId = `TIC-${year}${month}${this.category.substring(0, 3).toUpperCase()}-${random}`;
  }
  next();
});

export default mongoose.model('Ticket', ticketSchema);
