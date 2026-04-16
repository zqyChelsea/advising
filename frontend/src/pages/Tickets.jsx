import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Tickets = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    category: 'other'
  });

  const getReplyDisplayName = (reply) => {
    if (reply.isTeacher) {
      return 'Staff';
    }
    return reply.from || user?.fullName || 'You';
  };

  const toggleSelectTicket = (ticketId) => {
    setSelectedIds((prev) =>
      prev.includes(ticketId)
        ? prev.filter((id) => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === tickets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tickets.map((t) => t._id));
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Handle reply from email link - separate effect
  useEffect(() => {
    const replyTicketId = searchParams.get('reply');
    if (replyTicketId && tickets.length > 0) {
      const ticket = tickets.find(t => t.ticketId === replyTicketId);
      if (ticket) {
        setSelectedTicket(ticket);
        setShowDetailModal(true);
      }
    }
  }, [searchParams, tickets]);

  const fetchTickets = async () => {
    try {
      const response = await api.get('/tickets');
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([
        {
          _id: '1',
          title: 'Appeal for COMP3121 Credit Transfer',
          category: 'credit_transfer',
          status: 'in_progress',
          ticketId: 'TIC-20260102-04',
          assignedTo: 'Dept Office',
          updatedAt: '2026-01-03T09:12:00Z',
          replies: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'in_progress': return 'bg-amber-100 text-amber-700';
      case 'resolved': return 'bg-emerald-100 text-emerald-700';
      case 'closed': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'in_progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      case 'closed': return 'Completed';
      default: return status;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'credit_transfer': return 'solar:shield-warning-bold-duotone';
      case 'wie': return 'solar:check-circle-bold-duotone';
      default: return 'solar:ticket-bold-duotone';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'credit_transfer': return 'bg-amber-50 text-amber-500';
      case 'wie': return 'bg-emerald-50 text-emerald-500';
      default: return 'bg-slate-50 text-slate-500';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const handleCreateTicket = async () => {
    if (!newTicket.title.trim()) {
      alert('Please enter a title');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/tickets', newTicket);
      setTickets([response.data, ...tickets]);
      setShowModal(false);
      setNewTicket({ title: '', description: '', category: 'other' });
      alert('Issue report submitted successfully! An email has been sent to the teacher.');
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert(error.response?.data?.message || 'Error submitting issue report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewTicket = async (ticket) => {
    try {
      const response = await api.get(`/tickets/${ticket._id}`);
      setSelectedTicket(response.data);
    } catch (error) {
      setSelectedTicket(ticket);
    }
    setShowDetailModal(true);
  };

  const handleAddReply = async () => {
    if (!replyContent.trim() || !selectedTicket) return;

    setSubmitting(true);
    try {
      const response = await api.post(`/tickets/${selectedTicket._id}/reply`, {
        content: replyContent
      });
      setSelectedTicket(response.data);
      setReplyContent('');
      fetchTickets();
    } catch (error) {
      console.error('Error adding reply:', error);
      alert(error.response?.data?.message || 'Error sending reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!selectedTicket) return;

    if (!window.confirm('Mark this issue report as completed and end the conversation?')) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.put(`/tickets/${selectedTicket._id}`, {
        title: selectedTicket.title,
        description: selectedTicket.description,
        category: selectedTicket.category,
        status: 'closed'
      });

      const updated = response.data;
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    } catch (error) {
      console.error('Error marking ticket as completed:', error);
      alert(error.response?.data?.message || 'Error marking issue as completed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected issue report(s)?`)) {
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/tickets/batch-delete', { ids: selectedIds });
      setTickets((prev) => prev.filter((t) => !selectedIds.includes(t._id)));
      setSelectedIds([]);
    } catch (error) {
      console.error('Error deleting tickets:', error);
      alert(error.response?.data?.message || 'Error deleting selected issue reports');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-full flex flex-col">
      <div className="flex flex-col flex-1 animate-slide-in">
        <header className="mb-6 lg:mb-8 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900">Issue Report and Contact Us</h2>
            <p className="text-slate-500 mt-2 text-sm lg:text-base">Formal escalation when the AI advisor cannot solve your specific issue.</p>
          </div>
          <button
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-[#8EB19D] text-white rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#8EB19D]/20 hover:bg-[#7B9D8A] hover:scale-105 transition-all flex-shrink-0"
            onClick={() => setShowModal(true)}
          >
            <span className="iconify" data-icon="solar:add-bold"></span>
            Contact Us
          </button>
        </header>

        <div className="grid grid-cols-1 gap-4 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <span className="iconify text-4xl text-[#8EB19D] animate-spin" data-icon="solar:loading-bold"></span>
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-slate-50 border-2 border-slate-100 border-dashed rounded-3xl p-10 text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4">
                <span className="iconify text-4xl" data-icon="solar:inbox-bold"></span>
              </div>
              <p className="text-slate-400">No issue reports yet. Click "Contact Us" to create one.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tickets.length > 0 && selectedIds.length === tickets.length}
                    onChange={handleSelectAll}
                  />
                  <span>Select all</span>
                  {selectedIds.length > 0 && (
                    <span className="text-xs text-slate-400">
                      {selectedIds.length} selected
                    </span>
                  )}
                </div>
                <button
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={handleBatchDelete}
                  disabled={selectedIds.length === 0 || submitting}
                >
                  Delete Selected
                </button>
              </div>

              {tickets.map((ticket) => (
                <div
                  key={ticket._id}
                  onClick={() => handleViewTicket(ticket)}
                  className="bg-white w-full rounded-2xl border border-slate-100 p-5 hover:border-[#8EB19D] hover:shadow-md transition-all shadow-sm group cursor-pointer"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(ticket._id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectTicket(ticket._id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className={`p-3 rounded-2xl group-hover:scale-110 transition-transform ${getCategoryColor(ticket.category)}`}>
                        <span className="iconify text-2xl" data-icon={getCategoryIcon(ticket.category)}></span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg group-hover:text-[#6B8E7B] transition-colors">{ticket.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <span className="iconify" data-icon="solar:users-group-rounded-bold"></span>
                            {ticket.assignedTo || 'Pending'}
                          </span>
                          <span>-</span>
                          <span className="flex items-center gap-1 uppercase font-bold tracking-tighter">{ticket.ticketId}</span>
                          {ticket.replies?.length > 0 && (
                            <>
                              <span>-</span>
                              <span className="flex items-center gap-1 text-[#6B8E7B]">
                                <span className="iconify" data-icon="solar:chat-round-dots-bold"></span>
                                {ticket.replies.length} {ticket.replies.length === 1 ? 'reply' : 'replies'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 lg:gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-400 mb-1 uppercase font-bold tracking-widest">Last Update</p>
                        <p className="text-sm font-semibold text-slate-700">{formatDate(ticket.updatedAt)}</p>
                      </div>
                      <div className={`px-3 lg:px-4 py-2 rounded-xl text-xs font-black uppercase ${getStatusColor(ticket.status)}`}>
                        {getStatusText(ticket.status)}
                      </div>
                      <span className="iconify text-xl text-slate-300 group-hover:text-[#6B8E7B] transition-colors" data-icon="solar:arrow-right-bold"></span>
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-8 bg-slate-50 border-2 border-slate-100 border-dashed rounded-3xl p-10 text-center">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4">
                  <span className="iconify text-4xl" data-icon="solar:history-bold"></span>
                </div>
                <p className="text-slate-400">No more Issue Report in recent 30 days.</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-8 w-full max-w-lg mx-4 animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Send us messages</h3>
              <button
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                onClick={() => setShowModal(false)}
              >
                <span className="iconify text-xl" data-icon="solar:close-bold"></span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Title</label>
                <input
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-[#6B8E7B] focus:ring-0 outline-none transition-all font-medium"
                  type="text"
                  placeholder="Brief description of your issue"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Category</label>
                <select
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-[#6B8E7B] focus:ring-0 outline-none transition-all font-medium"
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                >
                  <option value="credit_transfer">Credit Transfer</option>
                  <option value="wie">WIE (Work-Integrated Education)</option>
                  <option value="exchange">Exchange</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Description</label>
                <textarea
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-[#6B8E7B] focus:ring-0 outline-none transition-all font-medium resize-none"
                  rows="4"
                  placeholder="Detailed description of your issue..."
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-6 py-2.5 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-all"
                onClick={() => setShowModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="px-8 py-2.5 rounded-xl bg-[#6B8E7B] text-white font-bold shadow-lg shadow-[#6B8E7B]/10 hover:bg-[#5A7A69] transition-all flex items-center gap-2"
                onClick={handleCreateTicket}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="iconify animate-spin" data-icon="solar:loading-bold"></span>
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {showDetailModal && selectedTicket && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${getStatusColor(selectedTicket.status)}`}>
                    {getStatusText(selectedTicket.status)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{selectedTicket.ticketId}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{selectedTicket.title}</h3>
              </div>
              <button
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                onClick={() => setShowDetailModal(false)}
              >
                <span className="iconify text-xl" data-icon="solar:close-bold"></span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Original Description */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-[#8EB19D] rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {user?.firstName?.[0] || 'S'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{user?.fullName || 'You'}</p>
                    <p className="text-xs text-slate-400">{formatDate(selectedTicket.createdAt)}</p>
                  </div>
                </div>
                <p className="text-slate-600 text-sm whitespace-pre-wrap">
                  {selectedTicket.description || 'No description provided.'}
                </p>
              </div>

              {/* Replies */}
              {selectedTicket.replies?.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Conversation</h4>
                  {selectedTicket.replies.map((reply, index) => (
                    <div
                      key={index}
                      className={`rounded-2xl p-4 ${reply.isTeacher ? 'bg-[#E8F0EB] border-l-4 border-[#6B8E7B]' : 'bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${reply.isTeacher ? 'bg-[#6B8E7B]' : 'bg-slate-400'}`}>
                          {reply.isTeacher ? 'T' : user?.firstName?.[0] || 'S'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">
                            {getReplyDisplayName(reply)}
                            {reply.isTeacher && <span className="ml-2 text-xs text-[#6B8E7B] font-normal">(Teacher)</span>}
                          </p>
                          <p className="text-xs text-slate-400">{formatDate(reply.createdAt)}</p>
                        </div>
                      </div>
                      <p className="text-slate-600 text-sm whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedTicket.replies?.length === 0 && (
                <div className="text-center py-8">
                  <span className="iconify text-4xl text-slate-200 mb-2" data-icon="solar:chat-round-dots-bold"></span>
                  <p className="text-slate-400 text-sm">No replies yet. The teacher will respond via email.</p>
                </div>
              )}
            </div>

            {/* Reply Input & Complete Control */}
            {selectedTicket.status !== 'closed' && (
              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                  <div className="flex-1 flex flex-col gap-2">
                    <textarea
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-[#6B8E7B] focus:ring-0 outline-none transition-all text-sm resize-none bg-white"
                      rows="2"
                      placeholder="Type your reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                    />
                    <button
                      type="button"
                      className="self-start text-xs font-bold text-slate-500 hover:text-slate-700 underline underline-offset-4"
                      onClick={handleMarkCompleted}
                      disabled={submitting}
                    >
                      Mark this issue as Completed and end conversation
                    </button>
                  </div>
                  <button
                    className="px-4 py-2 bg-[#6B8E7B] text-white rounded-xl font-bold hover:bg-[#5A7A69] transition-all flex items-center gap-2 self-end disabled:opacity-50"
                    onClick={handleAddReply}
                    disabled={!replyContent.trim() || submitting}
                  >
                    {submitting ? (
                      <span className="iconify animate-spin" data-icon="solar:loading-bold"></span>
                    ) : (
                      <span className="iconify" data-icon="solar:send-bold"></span>
                    )}
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
