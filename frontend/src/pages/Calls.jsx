import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Phone, PhoneOff, Mic, PlayCircle, History, Bot, Volume2, Database,
  FileText, Clock, Radio, Smartphone, Zap, Calendar, User, CheckCircle2,
  AlertTriangle, RefreshCw, X, ArrowRight, MessageSquare, ChevronRight,
  Plus, Check, Sparkles, Filter, Layers, PhoneCall, Shield, Search,
  Square, CheckSquare, Settings2, Play, Users, Flame, Send
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

const PREBUILT_SCRIPTS = [
  {
    id: 'real_estate',
    title: '🏡 Real Estate Site Visit Confirmation',
    agent: 'Priya (Hindi / Hinglish)',
    tag: 'High Conversion',
    pitch: 'Namaste! Main DealClose Real Estate se baat kar rahi hoon. Kya aap iss Sunday 11 AM Site Visit par aakar sample flat dekhna pasand karenge? Special pre-launch discount available hai.',
    action: 'Auto sends WhatsApp location pin & brochure'
  },
  {
    id: 'retail_fashion',
    title: '🛍️ VIP Festive Exclusive Discount',
    agent: 'Aman (Hinglish Male)',
    tag: 'Retail & E-commerce',
    pitch: 'Hello! Aapke account par Flat 25% OFF ka exclusive festive voucher activate hua hai. Valid till this Sunday only! Kya main coupon WhatsApp par share kar doon?',
    action: 'Sends coupon code & catalog link'
  },
  {
    id: 'gym_fitness',
    title: '💪 Free VIP Workout Pass & Demo',
    agent: 'Rohit (Fitness Coach)',
    tag: 'Gym & Wellness',
    pitch: 'Hey! Aapka 3-Day Free VIP Gym Trial Pass confirm ho chuka hai. Aap morning 7 AM ya evening 6 PM kab aana pasand karenge?',
    action: 'Sends VIP QR Pass to WhatsApp'
  },
  {
    id: 'payment_reminder',
    title: '💳 Payment & Due Invoice Reminder',
    agent: 'Neha (Account Manager)',
    tag: 'Accounts & Billing',
    pitch: 'Namaste! Accounts department se Neha baat kar rahi hoon. Aapka recent invoice payment balance pending hai. Kya main instant UPI link share kar doon?',
    action: 'Sends direct UPI / Payment link'
  },
  {
    id: 'service_feedback',
    title: '⭐ 5-Star Customer Feedback & Review',
    agent: 'Priya (Happiness Lead)',
    tag: 'Reputation & Growth',
    pitch: 'Hello! Hamare service experience ke feedback ke liye call kiya hai. Agar aapko pasand aaya ho toh 10 second nikal kar Google par review zaroor dein!',
    action: 'Sends Google Review link on WhatsApp'
  },
  {
    id: 'custom',
    title: '✍️ Custom Pitch / Own Business Script',
    agent: 'Priya (AI Voice Bot)',
    tag: 'Fully Customizable',
    pitch: '',
    action: 'AI speaks your exact custom script and answers questions'
  }
];

function SortableLeadCard({ lead, onCall, onLogCall, onAiCall, isSelected, onToggleSelect }) {
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
      className={`bg-[#141414] hover:bg-[#191919] border ${
        isSelected ? 'border-indigo-500 ring-1 ring-indigo-500/50 bg-[#161622]' : 'border-gray-800 hover:border-gray-700'
      } p-3.5 rounded-2xl shadow-md transition-all cursor-grab active:cursor-grabbing space-y-2.5 select-none`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-start gap-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(lead._id || lead.id);
            }}
            className="mt-0.5 text-gray-400 hover:text-indigo-400 transition-colors"
          >
            {isSelected ? (
              <CheckSquare size={16} className="text-indigo-400 fill-indigo-500/20" />
            ) : (
              <Square size={16} />
            )}
          </button>
          <div>
            <h4 className="font-bold text-white text-sm leading-snug">{lead.name || 'Lead'}</h4>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{lead.phoneNumber || lead.phone || 'No Phone'}</p>
          </div>
        </div>

        {lead.status === 'hot' || lead.status === 'vip' ? (
          <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-md text-[10px] font-black uppercase flex items-center gap-1">
            <Flame size={10} /> HOT
          </span>
        ) : lead.lastCallerType ? (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
            lead.lastCallerType === 'ai' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}>
            {lead.lastCallerType === 'ai' ? <Bot size={11} /> : <User size={11} />}
            {lead.lastCallerType === 'ai' ? 'AI Call' : (lead.lastCallerName || 'Staff')}
          </span>
        ) : (
          <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded-md text-[10px] font-medium">Uncalled</span>
        )}
      </div>

      {lead.followUpDate && (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
          isOverdue ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
        }`}>
          <Clock size={12} />
          <span>{isOverdue ? '⚠️ Overdue:' : '⏰ Scheduled:'} {new Date(lead.followUpDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}

      {lead.lastCallSummary && (
        <div className="bg-[#0c0c0c] border border-gray-800/80 p-2 rounded-xl text-xs text-gray-300">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Last Summary:</p>
          <p className="line-clamp-2 italic text-gray-300">&ldquo;{lead.lastCallSummary}&rdquo;</p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-gray-800/60" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onAiCall(lead)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
          title="Instant AI Voice Agent Call"
        >
          <Bot size={13} /> AI Call
        </button>
        <button
          onClick={() => onCall(lead)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-all border border-emerald-500/40"
          title="Staff Direct Call"
        >
          <Phone size={12} /> Manual
        </button>
        <button
          onClick={() => onLogCall(lead)}
          className="p-1.5 bg-[#202020] hover:bg-gray-800 text-gray-300 hover:text-white rounded-xl text-xs transition-all border border-gray-700"
          title="Log Notes"
        >
          <FileText size={13} />
        </button>
      </div>
    </div>
  );
}

function CallingBucketColumn({ bucketDef, leads, onCall, onLogCall, onAiCall, selectedLeadIds, onToggleSelect }) {
  const { setNodeRef, isOver } = useDroppable({ id: bucketDef.id });

  return (
    <div
      ref={setNodeRef}
      className={`min-w-[290px] w-[290px] bg-[#101010] border rounded-3xl flex flex-col max-h-full transition-all ${
        isOver ? 'ring-2 ring-indigo-500 bg-[#161620]' : 'border-gray-800'
      }`}
    >
      <div className={`p-3.5 border-b border-gray-800 rounded-t-3xl border-t-4 ${bucketDef.color}`}>
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-bold text-white text-xs md:text-sm">{bucketDef.title}</h3>
          <span className="text-xs font-bold bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full border border-gray-700">
            {leads.length}
          </span>
        </div>
        <p className="text-[10px] text-gray-500">{bucketDef.desc}</p>
      </div>

      <div className="p-2.5 flex-1 overflow-y-auto min-h-[300px] space-y-2.5">
        <SortableContext id={bucketDef.id} items={leads.map(l => l._id || l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <SortableLeadCard
              key={lead._id || lead.id}
              lead={lead}
              onCall={onCall}
              onLogCall={onLogCall}
              onAiCall={onAiCall}
              isSelected={selectedLeadIds.includes(lead._id || lead.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
          {leads.length === 0 && (
            <div className="text-center text-xs text-gray-600 py-12 border border-dashed border-gray-800 rounded-2xl flex flex-col items-center gap-2">
              <Layers size={18} className="text-gray-700" />
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

  const [viewMode, setViewMode] = useState('batch_list');
  const [activeTab, setActiveTab] = useState('calling');

  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [leadFilterTab, setLeadFilterTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedScriptId, setSelectedScriptId] = useState('real_estate');
  const [customPitchText, setCustomPitchText] = useState('');
  const [selectedVoiceAgent, setSelectedVoiceAgent] = useState('Priya (Indian Female - Natural Hindi)');
  const [showScriptStudioModal, setShowScriptStudioModal] = useState(false);
  const [isLaunchingCampaign, setIsLaunchingCampaign] = useState(false);

  const [liveCallingStatus, setLiveCallingStatus] = useState(null);

  const [callHistory, setCallHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [logModalLead, setLogModalLead] = useState(null);
  const [logFormData, setLogFormData] = useState({
    outcome: 'connected',
    summary: '',
    followUpDate: '',
    targetBucket: 'today_queue',
    callerIdentity: 'staff',
    customCallerName: '',
    customCallerPhone: '',
    durationMinutes: 2,
    durationSeconds: 30
  });
  const [submittingLog, setSubmittingLog] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const allLeadsList = useMemo(() => {
    const list = [
      ...(buckets.fresh_pool || []),
      ...(buckets.today_queue || []),
      ...(buckets.scheduled_followup || []),
      ...(buckets.busy_retry || []),
      ...(buckets.lost_archive || [])
    ];
    const seen = new Set();
    return list.filter(item => {
      const id = item._id || item.id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [buckets]);

  const filteredLeads = useMemo(() => {
    return allLeadsList.filter(l => {
      if (leadFilterTab === 'hot' && l.status !== 'hot' && l.status !== 'vip') return false;
      if (leadFilterTab === 'fresh' && l.callingBucket && l.callingBucket !== 'fresh_pool') return false;
      if (leadFilterTab === 'today' && l.callingBucket !== 'today_queue') return false;
      if (leadFilterTab === 'followup' && l.callingBucket !== 'scheduled_followup') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (l.name || '').toLowerCase().includes(q);
        const phoneMatch = (l.phoneNumber || l.phone || '').includes(q);
        if (!nameMatch && !phoneMatch) return false;
      }
      return true;
    });
  }, [allLeadsList, leadFilterTab, searchQuery]);

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

  const fetchCallHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/calls', { params: { workspaceId: activeWorkspace } });
      setCallHistory(res.data || []);
    } catch (err) {
      console.error('Fetch Call History Error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    api.get('/users/profile').then(res => {
      const u = res.data.user || res.data;
      if (u) setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);
    }).catch(console.error);

    fetchBuckets();
    fetchCallHistory();
  }, [activeWorkspace]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id;
    const fromBucket = active.data.current?.sortable?.containerId;
    const toBucket = over.data.current?.sortable?.containerId || over.id;

    if (!fromBucket || !toBucket || fromBucket === toBucket) return;

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

  const handleToggleSelect = (leadId) => {
    setSelectedLeadIds(prev => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const handleQuickSelectCount = (count) => {
    const targetIds = filteredLeads.slice(0, count).map(l => l._id || l.id);
    setSelectedLeadIds(targetIds);
    toast.success(`Selected top ${targetIds.length} leads! 🎯`);
  };

  const handleSelectAllFiltered = () => {
    const allIds = filteredLeads.map(l => l._id || l.id);
    setSelectedLeadIds(allIds);
    toast.success(`Selected all ${allIds.length} leads in view!`);
  };

  const handleClearSelection = () => {
    setSelectedLeadIds([]);
  };

  const handleLaunchAiCampaign = async () => {
    if (selectedLeadIds.length === 0) {
      toast.error('Please select at least 1 lead to call!');
      return;
    }

    setShowScriptStudioModal(false);
    setIsLaunchingCampaign(true);
    setLiveCallingStatus({
      active: true,
      total: selectedLeadIds.length,
      current: 1,
      currentLeadName: 'Initializing AI Voice Line...',
      step: 'Connecting with Voice Gateway'
    });

    try {
      const res = await api.post('/calls/trigger-ai-campaign', {
        scriptType: selectedScriptId,
        customPitch: customPitchText,
        customAgent: selectedVoiceAgent,
        leadIds: selectedLeadIds,
        workspaceId: activeWorkspace
      });

      for (let i = 0; i < selectedLeadIds.length; i++) {
        const leadObj = allLeadsList.find(l => (l._id || l.id) === selectedLeadIds[i]);
        setLiveCallingStatus({
          active: true,
          total: selectedLeadIds.length,
          current: i + 1,
          currentLeadName: leadObj?.name || `Lead #${i+1}`,
          step: i % 2 === 0 ? '🎙️ Speaking with customer & pitching...' : '📝 AI Transcribing & auto-tagging CRM...'
        });
        await new Promise(r => setTimeout(r, 600));
      }

      setLiveCallingStatus({
        active: false,
        total: selectedLeadIds.length,
        current: selectedLeadIds.length,
        currentLeadName: 'Done!',
        step: 'All calls completed and logged to CRM!'
      });

      toast.success(res.data?.message || `AI Voice Agent called ${selectedLeadIds.length} leads! 🎙️🚀`, { duration: 5000 });
      setSelectedLeadIds([]);
      fetchBuckets();
      fetchCallHistory();
    } catch (err) {
      console.error('Launch AI campaign error:', err);
      toast.error(err.response?.data?.message || 'Failed to trigger AI voice campaign.');
      setLiveCallingStatus(null);
    } finally {
      setIsLaunchingCampaign(false);
    }
  };

  const handleSingleLeadAiCall = async (lead) => {
    const leadId = lead._id || lead.id;
    const toastId = toast.loading(`🤖 AI Voice Agent dialing ${lead.name}...`);
    try {
      await api.post('/calls/trigger-ai-campaign', {
        scriptType: selectedScriptId,
        customPitch: customPitchText,
        customAgent: selectedVoiceAgent,
        leadIds: [leadId],
        workspaceId: activeWorkspace
      });
      toast.success(`✅ Call completed with ${lead.name}! Summary recorded in CRM timeline.`, { id: toastId, duration: 4000 });
      fetchBuckets();
      fetchCallHistory();
    } catch (err) {
      toast.error('Call failed to initiate.', { id: toastId });
    }
  };

  const handleOpenLogModal = (lead) => {
    setLogModalLead(lead);
    setLogFormData({
      outcome: lead.lastCallOutcome || 'connected',
      summary: lead.lastCallSummary || '',
      followUpDate: lead.followUpDate ? new Date(lead.followUpDate).toISOString().slice(0, 16) : '',
      targetBucket: lead.callingBucket || 'today_queue',
      callerIdentity: 'staff',
      customCallerName: '',
      customCallerPhone: user?.phone || user?.ownerPhone || '',
      durationMinutes: 2,
      durationSeconds: 15
    });
  };

  const handleSaveCallLog = async (e) => {
    e.preventDefault();
    if (!logModalLead) return;
    setSubmittingLog(true);

    try {
      let callerLabel = user?.fullName || 'Staff Member';
      let originPhone = user?.phone || user?.ownerPhone || '';

      if (logFormData.callerIdentity === 'office') {
        callerLabel = `Office Desk [${user?.businessName || 'HQ'}]`;
        originPhone = user?.brandKit?.phone || user?.officePhone || '';
      } else if (logFormData.callerIdentity === 'custom') {
        callerLabel = logFormData.customCallerName || 'Custom Staff';
        originPhone = logFormData.customCallerPhone || '';
      }

      const totalDuration = (Number(logFormData.durationMinutes) || 0) * 60 + (Number(logFormData.durationSeconds) || 0);

      await api.post('/calls/log-manual', {
        leadId: logModalLead._id || logModalLead.id,
        outcome: logFormData.outcome,
        summary: logFormData.summary,
        followUpDate: logFormData.followUpDate || null,
        targetBucket: logFormData.targetBucket,
        callerType: 'staff',
        calledFromNumber: originPhone,
        callerIdentityLabel: callerLabel,
        durationSeconds: totalDuration
      });

      toast.success('Call notes & duration saved! 📝');
      setLogModalLead(null);
      fetchBuckets();
      fetchCallHistory();
    } catch (err) {
      console.error('Save log error:', err);
      toast.error(err.response?.data?.message || 'Failed to save call log.');
    } finally {
      setSubmittingLog(false);
    }
  };

  const currentScriptObj = PREBUILT_SCRIPTS.find(s => s.id === selectedScriptId) || PREBUILT_SCRIPTS[0];

  return (
    <div className="p-3 md:p-8 bg-[#050505] min-h-[calc(100vh-4rem)] text-gray-100 font-sans flex flex-col pb-24 md:pb-12">
      
      <div className="mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
            <h1 className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-blue-500 to-indigo-400 flex items-center gap-2">
              <PhoneCall className="text-emerald-400" size={24} /> AI Calling Hub
            </h1>
            <select
              value={activeWorkspace}
              onChange={(e) => {
                setActiveWorkspace(e.target.value);
                setActiveWorkspaceId(e.target.value);
              }}
              className="bg-[#111] border border-gray-800 text-white text-xs md:text-sm font-semibold rounded-xl px-2.5 py-1 outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
            >
              {workspaces.map(ws => (
                <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>
              ))}
            </select>
          </div>
          <p className="text-gray-400 text-xs md:text-sm hidden md:block">
            Select leads, choose AI calling scripts, and launch automated voice outreach with auto-transcription &amp; WhatsApp follow-up.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex bg-[#121216] border border-gray-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('calling')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'calling' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Bot size={13} /> Dialer &amp; Leads
            </button>
            <button
              onClick={() => setActiveTab('call_logs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'call_logs' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <History size={13} /> Call Logs ({callHistory.length})
            </button>
          </div>

          {activeTab === 'calling' && (
            <div className="flex bg-[#121216] border border-gray-800 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('batch_list')}
                className={`p-1.5 md:px-2.5 md:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'batch_list' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
                title="Mobile / Batch Selection View"
              >
                <Smartphone size={14} /> <span className="hidden md:inline">Quick List</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 md:px-2.5 md:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'kanban' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
                title="Kanban Board View"
              >
                <Layers size={14} /> <span className="hidden md:inline">Kanban</span>
              </button>
            </div>
          )}

          <button
            onClick={() => { fetchBuckets(); fetchCallHistory(); toast.success('Refreshed data!'); }}
            className="p-2 bg-[#111] border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white rounded-xl transition-all"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {activeTab === 'calling' && (
        <div className="space-y-4 flex-1 flex flex-col">
          
          <div className="bg-gradient-to-r from-blue-950/70 via-indigo-950/60 to-purple-950/70 border border-blue-500/30 rounded-2xl p-3.5 md:p-4 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                <Bot size={22} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-1.5">
                    {currentScriptObj.title}
                  </h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
                    ● Agent: {selectedVoiceAgent.split(' (')[0]}
                  </span>
                </div>
                <p className="text-xs text-gray-300 mt-0.5 line-clamp-1 italic">
                  &ldquo;{selectedScriptId === 'custom' && customPitchText ? customPitchText : currentScriptObj.pitch}&rdquo;
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setShowScriptStudioModal(true)}
                className="flex-1 md:flex-none px-3 py-2 bg-[#1a1a24] hover:bg-[#252535] border border-blue-400/40 text-blue-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md"
              >
                <Settings2 size={14} /> Change Script / Voice
              </button>
            </div>
          </div>

          <div className="bg-[#101014] border border-gray-800/80 p-3 rounded-2xl space-y-3 shadow-md">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 custom-scrollbar">
                {[
                  { id: 'all', label: `All (${allLeadsList.length})` },
                  { id: 'hot', label: `🔥 Hot (${allLeadsList.filter(l => l.status === 'hot' || l.status === 'vip').length})` },
                  { id: 'fresh', label: `🆕 Fresh (${buckets.fresh_pool?.length || 0})` },
                  { id: 'today', label: `⚡ Today (${buckets.today_queue?.length || 0})` },
                  { id: 'followup', label: `⏰ Follow-up (${buckets.scheduled_followup?.length || 0})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setLeadFilterTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      leadFilterTab === tab.id
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                        : 'bg-[#18181f] text-gray-400 hover:text-white border border-gray-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-64">
                <Search size={14} className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#18181f] border border-gray-800 text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-indigo-500"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-gray-500 hover:text-white">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-800/60">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-gray-400 mr-1 flex items-center gap-1">
                  <Zap size={12} className="text-amber-400" /> Select:
                </span>
                <button
                  onClick={() => handleQuickSelectCount(5)}
                  className="px-2.5 py-1 bg-[#1a1a24] hover:bg-indigo-900/40 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold transition-all"
                >
                  +5 Leads
                </button>
                <button
                  onClick={() => handleQuickSelectCount(10)}
                  className="px-2.5 py-1 bg-[#1a1a24] hover:bg-indigo-900/40 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold transition-all"
                >
                  +10 Leads
                </button>
                <button
                  onClick={() => handleQuickSelectCount(25)}
                  className="px-2.5 py-1 bg-[#1a1a24] hover:bg-indigo-900/40 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold transition-all"
                >
                  +25 Leads
                </button>
                <button
                  onClick={handleSelectAllFiltered}
                  className="px-2.5 py-1 bg-[#202028] hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold transition-all"
                >
                  Select All
                </button>
                {selectedLeadIds.length > 0 && (
                  <button
                    onClick={handleClearSelection}
                    className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold transition-all"
                  >
                    Clear ({selectedLeadIds.length})
                  </button>
                )}
              </div>

              <div className="text-xs font-bold text-gray-300 flex items-center gap-2">
                <span className="text-indigo-400 font-mono">{selectedLeadIds.length}</span> of {filteredLeads.length} leads selected
              </div>
            </div>
          </div>

          {viewMode === 'batch_list' ? (
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center py-16 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mr-3"></div>
                  Loading Leads...
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-16 bg-[#101014] border border-gray-800 rounded-3xl p-6 space-y-2">
                  <Users size={32} className="mx-auto text-gray-600 mb-2" />
                  <h4 className="text-sm font-bold text-white">No leads found in this view</h4>
                  <p className="text-xs text-gray-500">Try changing filter tabs or clearing search query.</p>
                </div>
              ) : (
                filteredLeads.map((lead) => {
                  const leadId = lead._id || lead.id;
                  const isSelected = selectedLeadIds.includes(leadId);

                  return (
                    <div
                      key={leadId}
                      onClick={() => handleToggleSelect(leadId)}
                      className={`p-3 md:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#141424] border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                          : 'bg-[#101014] hover:bg-[#15151a] border-gray-800/80 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSelect(leadId);
                          }}
                          className="mt-1 text-gray-400 hover:text-indigo-400 transition-colors shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare size={18} className="text-indigo-400 fill-indigo-500/20" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                        
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-white text-sm">{lead.name || 'Lead'}</h4>
                            <span className="text-xs font-mono text-gray-400">{lead.phoneNumber || lead.phone || 'No Phone'}</span>
                            
                            {lead.status === 'hot' || lead.status === 'vip' ? (
                              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-md text-[10px] font-black uppercase flex items-center gap-0.5">
                                <Flame size={10} /> HOT
                              </span>
                            ) : null}

                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              lead.callingBucket === 'today_queue' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                              lead.callingBucket === 'scheduled_followup' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              lead.callingBucket === 'busy_retry' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                              'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {lead.callingBucket ? lead.callingBucket.replace(/_/g, ' ') : 'Fresh Pool'}
                            </span>
                          </div>

                          {lead.lastCallSummary ? (
                            <p className="text-xs text-gray-400 italic line-clamp-1">
                              &ldquo;{lead.lastCallSummary}&rdquo;
                            </p>
                          ) : lead.followUpDate ? (
                            <p className="text-xs text-amber-400 flex items-center gap-1 font-semibold">
                              <Clock size={11} /> Next Call: {new Date(lead.followUpDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          ) : (
                            <p className="text-[11px] text-gray-500">Uncalled fresh lead ready for AI campaign.</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleSingleLeadAiCall(lead)}
                          className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1"
                          title="Instant AI Call"
                        >
                          <Bot size={13} /> AI Call
                        </button>
                        <button
                          onClick={() => {
                            const num = lead.phoneNumber || lead.phone;
                            if (num) window.location.href = `tel:${num}`;
                            handleOpenLogModal(lead);
                          }}
                          className="px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-all border border-emerald-500/40 flex items-center gap-1"
                          title="Call via Phone & Log"
                        >
                          <Phone size={12} /> Direct
                        </button>
                        <button
                          onClick={() => handleOpenLogModal(lead)}
                          className="p-1.5 bg-[#1e1e24] hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs transition-all border border-gray-700"
                          title="Add Call Notes"
                        >
                          <FileText size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto pb-6">
              {loading ? (
                <div className="flex justify-center items-center h-64 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mr-3"></div>
                  Loading Calling Queues...
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                  <div className="flex gap-4 items-start min-w-max h-[calc(100vh-290px)]">
                    {BUCKET_DEFINITIONS.map(bDef => (
                      <CallingBucketColumn
                        key={bDef.id}
                        bucketDef={bDef}
                        leads={buckets[bDef.id] || []}
                        onCall={(lead) => {
                          const num = lead.phoneNumber || lead.phone;
                          if (num) window.location.href = `tel:${num}`;
                          handleOpenLogModal(lead);
                        }}
                        onLogCall={handleOpenLogModal}
                        onAiCall={handleSingleLeadAiCall}
                        selectedLeadIds={selectedLeadIds}
                        onToggleSelect={handleToggleSelect}
                      />
                    ))}
                  </div>
                </DndContext>
              )}
            </div>
          )}

          {selectedLeadIds.length > 0 && (
            <div className="fixed bottom-3 left-3 right-3 md:left-64 md:right-8 z-40 bg-[#12121c]/95 backdrop-blur-md border border-indigo-500/50 p-3 rounded-2xl shadow-2xl shadow-indigo-950/60 flex items-center justify-between gap-3 animate-slide-up">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-sm font-mono border border-indigo-500/30">
                  {selectedLeadIds.length}
                </div>
                <div>
                  <h4 className="text-xs md:text-sm font-bold text-white">
                    {selectedLeadIds.length} Leads Selected for AI Call
                  </h4>
                  <p className="text-[10px] text-gray-400">
                    Script: <span className="text-blue-300 font-semibold">{currentScriptObj.title.split(' ')[1] || 'Real Estate'}</span> • {selectedVoiceAgent.split(' (')[0]}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowScriptStudioModal(true)}
                  className="hidden sm:flex px-3 py-2 bg-[#202030] hover:bg-[#282840] text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-gray-700"
                >
                  <Settings2 size={13} className="mr-1" /> Script
                </button>

                <button
                  onClick={handleLaunchAiCampaign}
                  disabled={isLaunchingCampaign}
                  className="px-4 md:px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white font-black text-xs md:text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
                >
                  <PhoneCall size={16} />
                  <span>Launch AI Voice Calling ({selectedLeadIds.length}) 🚀</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'call_logs' && (
        <div className="space-y-3 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center bg-[#101014] border border-gray-800 p-3 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <History size={16} className="text-indigo-400" /> Recent Call Recordings &amp; Logs
              </h3>
              <p className="text-xs text-gray-400">Live outcomes, duration and AI transcription notes.</p>
            </div>
            <button
              onClick={fetchCallHistory}
              className="px-3 py-1.5 bg-[#18181f] hover:bg-gray-800 text-gray-300 rounded-xl text-xs font-semibold transition-all border border-gray-700 flex items-center gap-1"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {loadingHistory ? (
            <div className="flex justify-center items-center py-16 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mr-3"></div>
              Loading History...
            </div>
          ) : callHistory.length === 0 ? (
            <div className="text-center py-16 bg-[#101014] border border-gray-800 rounded-3xl p-6 space-y-2">
              <PhoneOff size={32} className="mx-auto text-gray-600 mb-2" />
              <h4 className="text-sm font-bold text-white">No calls logged yet</h4>
              <p className="text-xs text-gray-500">Launch an AI Voice Campaign or log a manual call to see recordings here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {callHistory.map((call, idx) => (
                <div
                  key={call._id || idx}
                  className="bg-[#101014] border border-gray-800/80 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                      {call.provider === 'ai_voice_agent' ? <Bot size={18} /> : <Phone size={16} />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-white text-xs md:text-sm">{call.to || 'Customer'}</h4>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md font-mono">
                          {call.status ? call.status.toUpperCase() : 'COMPLETED'}
                        </span>
                        <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-md">
                          ⏱️ {call.duration ? `${call.duration}s` : '45s'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Provider: <span className="text-indigo-300 font-semibold">{call.provider ? call.provider.replace(/_/g, ' ') : 'AI Voice Agent'}</span> • {new Date(call.createdAt || Date.now()).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => toast.success('Playing call audio recording simulation... 🎧')}
                      className="px-3 py-1.5 bg-[#181822] hover:bg-indigo-900/40 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <PlayCircle size={13} /> Listen Recording
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showScriptStudioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#111118] border border-gray-800 rounded-3xl p-5 md:p-7 w-full max-w-2xl shadow-2xl relative my-8">
            <button
              onClick={() => setShowScriptStudioModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white p-1 rounded-lg"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center">
                <Bot size={22} />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-white">AI Voice Agent &amp; Script Studio</h2>
                <p className="text-xs text-gray-400">Choose an industry pitch or write your custom voice campaign.</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-400 text-xs font-bold mb-2">Select Voice Persona &amp; Accent:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'priya', name: 'Priya (Indian Female)', desc: 'Natural Hindi / Hinglish • Warm & Friendly' },
                  { id: 'aman', name: 'Aman (Indian Male)', desc: 'Dynamic Hinglish • Retail & Sales' },
                  { id: 'neha', name: 'Neha (Professional)', desc: 'English & Hindi • Corporate & Accounts' }
                ].map(persona => (
                  <div
                    key={persona.id}
                    onClick={() => setSelectedVoiceAgent(persona.name)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedVoiceAgent.includes(persona.name.split(' ')[0])
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-[#161620] border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-bold text-white">{persona.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{persona.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1 mb-4">
              <label className="block text-gray-400 text-xs font-bold">Select Campaign Pitch &amp; Script:</label>
              
              {PREBUILT_SCRIPTS.map(script => (
                <div
                  key={script.id}
                  onClick={() => setSelectedScriptId(script.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                    selectedScriptId === script.id
                      ? 'bg-[#18182c] border-blue-500 shadow-md ring-1 ring-blue-500/40'
                      : 'bg-[#14141c] hover:bg-[#1a1a24] border-gray-800 text-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs md:text-sm text-white">{script.title}</span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono">
                      {script.tag}
                    </span>
                  </div>

                  {script.id !== 'custom' ? (
                    <p className="text-xs text-gray-300 bg-black/50 p-2.5 rounded-xl border border-gray-800/80 leading-relaxed italic">
                      &ldquo;{script.pitch}&rdquo;
                    </p>
                  ) : (
                    <div className="space-y-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        rows={3}
                        value={customPitchText}
                        onChange={(e) => setCustomPitchText(e.target.value)}
                        placeholder="Type your own custom voice pitch here in Hindi or Hinglish (e.g. Namaste! Main xyz company se baat kar raha hoon...)"
                        className="w-full bg-black/60 border border-gray-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500 leading-relaxed"
                      />
                    </div>
                  )}

                  <p className="text-[10px] text-gray-400">⚡ Action: {script.action}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setShowScriptStudioModal(false);
                toast.success('AI Script & Voice Persona updated!');
              }}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold rounded-xl text-xs md:text-sm shadow-lg"
            >
              Save &amp; Apply Script
            </button>
          </div>
        </div>
      )}

      {liveCallingStatus && liveCallingStatus.active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#11111a] border border-blue-500/50 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl text-center space-y-4 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 text-blue-400 border-2 border-blue-500 flex items-center justify-center mx-auto animate-pulse">
              <Bot size={32} />
            </div>

            <div>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono px-2.5 py-1 rounded-full border border-blue-500/40 uppercase font-bold">
                AI Voice Calling In Progress
              </span>
              <h3 className="text-lg font-bold text-white mt-2">
                Calling Lead {liveCallingStatus.current} of {liveCallingStatus.total}
              </h3>
              <p className="text-sm font-semibold text-emerald-400 mt-1">
                {liveCallingStatus.currentLeadName}
              </p>
            </div>

            <div className="bg-black/60 border border-gray-800 p-3 rounded-2xl text-xs text-gray-300 flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent"></div>
              <span>{liveCallingStatus.step}</span>
            </div>

            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300"
                style={{ width: `${(liveCallingStatus.current / liveCallingStatus.total) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {logModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-gray-800 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setLogModalLead(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white p-1 rounded-lg"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center">
                <PhoneCall size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Log Call Notes</h2>
                <p className="text-xs text-gray-400">Recording call details for {logModalLead.name} ({logModalLead.phoneNumber || logModalLead.phone})</p>
              </div>
            </div>

            <form onSubmit={handleSaveCallLog} className="space-y-3.5">
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
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-2.5 text-white text-xs outline-none focus:border-indigo-500"
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
                <label className="block text-gray-400 text-xs font-semibold mb-1">Call Summary (Niskoor)</label>
                <textarea
                  required
                  rows={3}
                  value={logFormData.summary}
                  onChange={(e) => setLogFormData({ ...logFormData, summary: e.target.value })}
                  placeholder="e.g. Client requested 2BHK brochure on WhatsApp. Ready to visit on Sunday."
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-2.5 text-white text-xs outline-none focus:border-indigo-500"
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
                    className="w-full bg-[#1a1a1a] border border-amber-500/50 rounded-xl p-2.5 text-white text-xs outline-none focus:border-amber-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-gray-400 text-xs font-semibold mb-1">Target Bucket</label>
                <select
                  value={logFormData.targetBucket}
                  onChange={(e) => setLogFormData({ ...logFormData, targetBucket: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-2.5 text-white text-xs outline-none focus:border-indigo-500"
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
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:opacity-95 text-white font-bold rounded-xl text-xs transition-all shadow-lg mt-2 disabled:opacity-50"
              >
                {submittingLog ? 'Saving...' : 'Save Notes & Update Bucket'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
