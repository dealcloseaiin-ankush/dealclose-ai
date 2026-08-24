import React, { useState, useRef, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Phone, PhoneOff, Mic, PlayCircle, History, Bot, Volume2, Database,
  FileText, Clock, Radio, Smartphone, Zap, Calendar, User, CheckCircle2,
  AlertTriangle, RefreshCw, X, ArrowRight, MessageSquare, ChevronRight,
  Plus, Check, Sparkles, Filter, Layers, PhoneCall, Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import useWorkspaceStore from '../store/workspaceStore';
import { DndContext, closestCorners, PointerSensor, KeyboardSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const BUCKET_DEFINITIONS = [
  { id: 'fresh_pool', title: '🟢 Fresh Pool (Uncalled)', color: 'border-emerald-500', desc: 'Raw untouched leads waiting to be called' },
  { id: 'today_queue', title: '⚡ Today\'s Active Queue', color: 'border-blue-500', desc: 'Today\'s batch of calls to make' },
  { id: 'scheduled_followup', title: '⏰ Scheduled Follow-ups', color: 'border-amber-500', desc: 'Time-locked urgent follow-up calls' },
  { id: 'busy_retry', title: '🔄 Busy / No Answer', color: 'border-purple-500', desc: 'Unreachable leads pending 2nd attempt' },
  { id: 'lost_archive', title: '❌ Lost / Wrong Number', color: 'border-rose-500', desc: 'Closed or unresponsive leads' },
];

function SortableLeadCard({ lead, onCall, onLogCall }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead._id || lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isOverdue = useMemo(() => {
    if (!lead.followUpDate) return false;
    return new Date(lead.followUpDate).getTime() < new Date().getTime();
  }, [lead.followUpDate]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-[#141414] hover:bg-[#191919] border border-gray-800 hover:border-gray-700 p-4 rounded-2xl shadow-md transition-all cursor-grab active:cursor-grabbing space-y-3 select-none"
    >
      {/* Top Header: Name + Badge */}
      <div className="flex justify-between items-start gap-2">
        <div>
          <h4 className="font-bold text-white text-sm">{lead.name || 'Lead'}</h4>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{lead.phoneNumber || lead.phone || 'No Phone'}</p>
        </div>
        {lead.lastCallerType ? (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
            lead.lastCallerType === 'ai' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}>
            {lead.lastCallerType === 'ai' ? <Bot size={11} /> : <User size={11} />}
            {lead.lastCallerType === 'ai' ? 'AI Bot' : (lead.lastCallerName || 'Staff')}
          </span>
        ) : (
          <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded-md text-[10px] font-medium">Uncalled</span>
        )}
      </div>

      {/* Follow-up Time Pill (Crucial for Bucket 3) */}
      {lead.followUpDate && (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
          isOverdue ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
        }`}>
          <Clock size={12} />
          <span>{isOverdue ? '⚠️ Overdue:' : '⏰ Scheduled:'} {new Date(lead.followUpDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}

      {/* 2-Line Niskoor / Call Summary */}
      {lead.lastCallSummary && (
        <div className="bg-[#0c0c0c] border border-gray-800/80 p-2 rounded-xl text-xs text-gray-300">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Niskoor (Summary):</p>
          <p className="line-clamp-2 italic text-gray-300">&ldquo;{lead.lastCallSummary}&rdquo;</p>
        </div>
      )}

      {/* Card Footer: Action Buttons */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-800/60" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onCall(lead)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
        >
          <Phone size={12} /> Call
        </button>
        <button
          onClick={() => onLogCall(lead)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[#202020] hover:bg-gray-800 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-all border border-gray-700"
        >
          <FileText size={12} /> Log Call
        </button>
      </div>
    </div>
  );
}

function CallingBucketColumn({ bucketDef, leads, onCall, onLogCall }) {
  const { setNodeRef, isOver } = useDroppable({ id: bucketDef.id });

  return (
    <div
      ref={setNodeRef}
      className={`min-w-[300px] w-[300px] bg-[#101010] border rounded-3xl flex flex-col max-h-full transition-all ${
        isOver ? 'ring-2 ring-indigo-500 bg-[#161616]' : 'border-gray-800'
      }`}
    >
      {/* Column Header */}
      <div className={`p-4 border-b border-gray-800 rounded-t-3xl border-t-4 ${bucketDef.color}`}>
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-bold text-white text-sm">{bucketDef.title}</h3>
          <span className="text-xs font-bold bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full border border-gray-700">
            {leads.length}
          </span>
        </div>
        <p className="text-[11px] text-gray-500">{bucketDef.desc}</p>
      </div>

      {/* Card List (Droppable & Sortable) */}
      <div className="p-3 flex-1 overflow-y-auto min-h-[300px] space-y-3">
        <SortableContext id={bucketDef.id} items={leads.map(l => l._id || l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <SortableLeadCard key={lead._id || lead.id} lead={lead} onCall={onCall} onLogCall={onLogCall} />
          ))}
          {leads.length === 0 && (
            <div className="text-center text-xs text-gray-600 py-12 border border-dashed border-gray-800 rounded-2xl flex flex-col items-center gap-2">
              <Layers size={20} className="text-gray-700" />
              Drop leads here
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export default function Calls() {
  const { user } = useAuth() || {};
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspaceStore();
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])]);
  const [activeWorkspace, setActiveWorkspace] = useState(activeWorkspaceId || 'main');

  const [loading, setLoading] = useState(true);
  const [buckets, setBuckets] = useState({
    fresh_pool: [],
    today_queue: [],
    scheduled_followup: [],
    busy_retry: [],
    lost_archive: []
  });

  // Modal States
  const [activeDialLead, setActiveDialLead] = useState(null);
  const [logModalLead, setLogModalLead] = useState(null);
  const [logFormData, setLogFormData] = useState({
    outcome: 'connected',
    summary: '',
    followUpDate: '',
    targetBucket: 'today_queue'
  });
  const [submittingLog, setSubmittingLog] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const fetchBuckets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/calls/buckets', { params: { workspaceId: activeWorkspace } });
      if (res.data?.buckets) {
        setBuckets(res.data.buckets);
      }
    } catch (err) {
      console.error('Fetch Calling Buckets Error:', err);
      toast.error('Failed to load calling queues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/users/profile').then(res => {
      const u = res.data.user || res.data;
      if (u) setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);
    }).catch(console.error);

    fetchBuckets();
  }, [activeWorkspace]);

  // Handle Drag and Drop between buckets
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id;
    const fromBucket = active.data.current?.sortable?.containerId;
    const toBucket = over.data.current?.sortable?.containerId || over.id;

    if (!fromBucket || !toBucket || fromBucket === toBucket) return;

    // Optimistic UI Update
    setBuckets(prev => {
      const fromItems = [...(prev[fromBucket] || [])];
      const toItems = [...(prev[toBucket] || [])];

      const itemIdx = fromItems.findIndex(i => (i._id || i.id) === leadId);
      if (itemIdx === -1) return prev;

      const [movedLead] = fromItems.splice(itemIdx, 1);
      movedLead.callingBucket = toBucket;
      toItems.unshift(movedLead);

      return { ...prev, [fromBucket]: fromItems, [toBucket]: toItems };
    });

    try {
      await api.put('/calls/bucket-move', { leadId, targetBucket: toBucket });
      toast.success(`Lead moved to ${toBucket.replace(/_/g, ' ').toUpperCase()}`);
    } catch (err) {
      console.error('Bucket move failed:', err);
      toast.error('Failed to move lead. Reverting...');
      fetchBuckets();
    }
  };

  // 1-Click Batch Move: 50 Fresh leads to Today's Queue
  const handleBatchAssign = async (count = 50) => {
    const toastId = toast.loading(`Moving next ${count} fresh leads to Today's Queue...`);
    try {
      const res = await api.post('/calls/batch-assign-today', { count, workspaceId: activeWorkspace });
      toast.success(res.data?.message || `Moved ${count} leads!`, { id: toastId });
      fetchBuckets();
    } catch (err) {
      toast.error('Failed to assign batch.', { id: toastId });
    }
  };

  // Open Log Call Modal
  const handleOpenLogModal = (lead) => {
    setLogModalLead(lead);
    setLogFormData({
      outcome: lead.lastCallOutcome || 'connected',
      summary: lead.lastCallSummary || '',
      followUpDate: lead.followUpDate ? new Date(lead.followUpDate).toISOString().slice(0, 16) : '',
      targetBucket: lead.callingBucket || 'today_queue'
    });
  };

  // Submit Manual Call Log
  const handleSaveCallLog = async (e) => {
    e.preventDefault();
    if (!logModalLead) return;
    setSubmittingLog(true);

    try {
      const res = await api.post('/calls/log-manual', {
        leadId: logModalLead._id || logModalLead.id,
        outcome: logFormData.outcome,
        summary: logFormData.summary,
        followUpDate: logFormData.followUpDate || null,
        targetBucket: logFormData.targetBucket,
        callerType: 'staff'
      });

      toast.success('Call notes & follow-up saved! 📝');
      setLogModalLead(null);
      fetchBuckets();
    } catch (err) {
      console.error('Save log error:', err);
      toast.error(err.response?.data?.message || 'Failed to save call log.');
    } finally {
      setSubmittingLog(false);
    }
  };

  // Handle Call Initiation
  const handleStartDial = (lead) => {
    setActiveDialLead(lead);
    toast.success(`Dialing ${lead.name} (${lead.phoneNumber || lead.phone})... 📞`);
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-[calc(100vh-4rem)] text-gray-100 font-sans flex flex-col">
      {/* Top Header & Actions Bar */}
      <div className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-blue-500 to-indigo-400">
              Telephony &amp; Calling Hub
            </h1>
            <select
              value={activeWorkspace}
              onChange={(e) => {
                setActiveWorkspace(e.target.value);
                setActiveWorkspaceId(e.target.value);
              }}
              className="bg-[#111] border border-gray-800 text-white text-sm font-semibold rounded-xl px-3 py-1.5 outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
            >
              {workspaces.map(ws => (
                <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>
              ))}
            </select>
          </div>
          <p className="text-gray-400 text-sm">
            Manage your daily calling batches, time-locked scheduled follow-ups, and auto-segregated queues with drag &amp; drop.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleBatchAssign(50)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Zap size={14} /> + Select 50 for Today
          </button>
          <Link
            to="/campaigns"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] hover:bg-gray-800 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all"
          >
            <Bot size={14} /> AI Voice Broadcast
          </Link>
          <button
            onClick={fetchBuckets}
            className="p-2.5 bg-[#111] border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white rounded-xl transition-all"
            title="Refresh Queues"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* 5-Bucket Telephony Kanban Board (Drag and Drop) */}
      <div className="flex-1 overflow-x-auto pb-6">
        {loading ? (
          <div className="flex justify-center items-center h-64 text-gray-500">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mr-3"></div>
            Loading Calling Queues...
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 items-start min-w-max h-[calc(100vh-230px)]">
              {BUCKET_DEFINITIONS.map(bDef => (
                <CallingBucketColumn
                  key={bDef.id}
                  bucketDef={bDef}
                  leads={buckets[bDef.id] || []}
                  onCall={handleStartDial}
                  onLogCall={handleOpenLogModal}
                />
              ))}
            </div>
          </DndContext>
        )}
      </div>

      {/* Log Manual Call Modal */}
      {logModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-gray-800 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setLogModalLead(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white p-1 rounded-lg"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center">
                <PhoneCall size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Log Call Notes</h2>
                <p className="text-xs text-gray-400">Recording call details for {logModalLead.name} ({logModalLead.phoneNumber || logModalLead.phone})</p>
              </div>
            </div>

            <form onSubmit={handleSaveCallLog} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-xs font-semibold mb-1">Call Outcome</label>
                <select
                  value={logFormData.outcome}
                  onChange={(e) => {
                    const outcome = e.target.value;
                    let targetBucket = 'today_queue';
                    if (outcome === 'callback_scheduled') targetBucket = 'scheduled_followup';
                    else if (outcome === 'busy' || outcome === 'no_answer') targetBucket = 'busy_retry';
                    else if (outcome === 'not_interested' || outcome === 'wrong_number') targetBucket = 'lost_archive';
                    setLogFormData({ ...logFormData, outcome, targetBucket });
                  }}
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500"
                >
                  <option value="connected">✅ Connected (Baat Hui &amp; Interested)</option>
                  <option value="callback_scheduled">⏰ Callback Scheduled (Specific Time)</option>
                  <option value="busy">🔄 Phone Busy / Line Busy</option>
                  <option value="no_answer">📵 No Answer (Ring Kat Gayi)</option>
                  <option value="not_interested">❌ Not Interested</option>
                  <option value="wrong_number">⚠️ Wrong Number / Invalid</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-semibold mb-1">Baat-cheet Ka Niskoor (Summary)</label>
                <textarea
                  required
                  rows={3}
                  value={logFormData.summary}
                  onChange={(e) => setLogFormData({ ...logFormData, summary: e.target.value })}
                  placeholder="e.g. Client requested 2BHK brochure on WhatsApp. Ready to visit office on Friday."
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500"
                />
              </div>

              {logFormData.outcome === 'callback_scheduled' && (
                <div>
                  <label className="block text-amber-400 text-xs font-semibold mb-1 flex items-center gap-1">
                    <Clock size={13} /> Next Callback Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={logFormData.followUpDate}
                    onChange={(e) => setLogFormData({ ...logFormData, followUpDate: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-amber-500/50 rounded-xl p-3 text-white text-sm outline-none focus:border-amber-400"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">This lead will appear in the &quot;Scheduled Follow-ups&quot; bucket sorted by time.</p>
                </div>
              )}

              <div>
                <label className="block text-gray-400 text-xs font-semibold mb-1">Target Bucket</label>
                <select
                  value={logFormData.targetBucket}
                  onChange={(e) => setLogFormData({ ...logFormData, targetBucket: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500"
                >
                  <option value="today_queue">⚡ Today&apos;s Active Queue</option>
                  <option value="scheduled_followup">⏰ Scheduled Follow-ups</option>
                  <option value="busy_retry">🔄 Busy / No Answer (Re-try)</option>
                  <option value="lost_archive">❌ Lost / Wrong Number</option>
                  <option value="fresh_pool">🟢 Fresh Pool</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submittingLog}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:opacity-95 text-white font-bold rounded-xl text-sm transition-all shadow-lg mt-2 disabled:opacity-50"
              >
                {submittingLog ? 'Saving Call Notes...' : 'Save Notes & Update Bucket'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3-Channel Call Pathway Selection Modal */}
      {activeDialLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-gray-800 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setActiveDialLead(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white p-1 rounded-lg"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Phone size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Call {activeDialLead.name}</h2>
              <p className="text-xs text-gray-400 font-mono mt-1">{activeDialLead.phoneNumber || activeDialLead.phone}</p>
            </div>

            <div className="space-y-3">
              {/* Option 1: Office Phone / SIM (Staff Calls Directly) */}
              <button
                onClick={() => {
                  const num = activeDialLead.phoneNumber || activeDialLead.phone;
                  const leadToLog = activeDialLead;
                  setActiveDialLead(null);
                  if (num) window.location.href = `tel:${num}`;
                  handleOpenLogModal(leadToLog);
                }}
                className="w-full p-4 bg-[#1a1a1a] hover:bg-[#222] border border-gray-700 hover:border-emerald-500 rounded-2xl flex items-center gap-4 transition-all text-left group"
              >
                <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Smartphone size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white flex items-center justify-between">
                    📱 Office Phone / SIM (Staff Call)
                    <ArrowRight size={14} className="text-gray-500 group-hover:text-emerald-400" />
                  </h4>
                  <p className="text-xs text-gray-400">Call from your mobile/office phone and write notes manually.</p>
                </div>
              </button>

              {/* Option 2: AI Voice Bot (Web Mic / Browser) */}
              <button
                onClick={() => {
                  toast.success(`🤖 AI Voice Assistant starting call with ${activeDialLead.name}...`);
                  setActiveDialLead(null);
                }}
                className="w-full p-4 bg-[#1a1a1a] hover:bg-[#222] border border-gray-700 hover:border-indigo-500 rounded-2xl flex items-center gap-4 transition-all text-left group"
              >
                <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Bot size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white flex items-center justify-between">
                    🤖 AI Voice Bot (Auto-Transcribe & Niskoor)
                    <ArrowRight size={14} className="text-gray-500 group-hover:text-indigo-400" />
                  </h4>
                  <p className="text-xs text-gray-400">AI speaks, qualifies lead, and auto-writes the summary & follow-up.</p>
                </div>
              </button>

              {/* Option 3: System Twilio / Exotel Outbound API */}
              <button
                onClick={async () => {
                  const toastId = toast.loading('Initiating Cloud Outbound Call...');
                  try {
                    await api.post('/calls/dial', {
                      phoneNumber: activeDialLead.phoneNumber || activeDialLead.phone,
                      leadId: activeDialLead._id || activeDialLead.id
                    });
                    toast.success('Cloud Outbound Call Connected via Twilio/Exotel! 📡', { id: toastId });
                    setActiveDialLead(null);
                    fetchBuckets();
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Failed to trigger cloud call.', { id: toastId });
                  }
                }}
                className="w-full p-4 bg-[#1a1a1a] hover:bg-[#222] border border-gray-700 hover:border-blue-500 rounded-2xl flex items-center gap-4 transition-all text-left group"
              >
                <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Radio size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white flex items-center justify-between">
                    📡 Twilio / Exotel Cloud Call
                    <ArrowRight size={14} className="text-gray-500 group-hover:text-blue-400" />
                  </h4>
                  <p className="text-xs text-gray-400">System dials virtual number and connects directly to AI/Staff.</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}