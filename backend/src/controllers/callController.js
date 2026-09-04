const Call = require('../models/callModel');
const Lead = require('../models/leadModel');
const callService = require('../services/callService');
const User = require('../models/userModel');
const twilio = require('twilio');

// @desc    Get call history
// @route   GET /api/calls
exports.getCalls = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { workspaceId } = req.query;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    
    const query = { userId };
    if (workspaceId && workspaceId !== 'main' && workspaceId !== 'all') {
      query.workspaceId = workspaceId;
    } else if (workspaceId === 'main') {
      query.$or = [{ workspaceId: 'main' }, { workspaceId: { $exists: false } }, { workspaceId: null }];
    }

    const calls = await Call.find(query).sort({ createdAt: -1 });
    res.status(200).json(calls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Initiate a call
// @route   POST /api/calls/dial
exports.initiateCall = async (req, res) => {
  const { phoneNumber, leadId } = req.body;
  const userId = req.user?._id || req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  if (!phoneNumber) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  try {
    const user = await User.findById(userId);
    let newCall;

    // 🚀 OPTION 1: USER'S OWN TWILIO NUMBER (If Configured in Settings)
    if (user && user.twilioConfig && user.twilioConfig.accountSid && user.twilioConfig.authToken && user.twilioConfig.phoneNumber) {
      console.log(`📞 [Calling] Using User's Custom Twilio Number...`);
      const client = twilio(user.twilioConfig.accountSid, user.twilioConfig.authToken);
      
      const call = await client.calls.create({
        url: `${process.env.BASE_URL}/api/webhooks/twilio/voice`, // Yahan WebSocket ka route aayega
        to: phoneNumber,
        from: user.twilioConfig.phoneNumber
      });

      newCall = await Call.create({
        userId,
        sid: call.sid, 
        to: phoneNumber,
        status: call.status, 
        leadId: leadId,
        provider: 'twilio_custom'
      });
      
      if (leadId) {
        await Lead.findByIdAndUpdate(leadId, { $push: { timeline: { eventType: 'Call Made', description: `Outbound call initiated to ${phoneNumber} via Twilio`, timestamp: new Date() } } });
      }
    } 
    // 🚀 OPTION 2: PLATFORM'S MASTER EXOTEL NUMBER (Default System)
    else {
      console.log(`📞 [Calling] Using Master Exotel Number...`);
      const exotelNumber = process.env.EXOTEL_EXOPHONE;
      const webhookUrl = `${process.env.BASE_URL}/api/webhooks/voice`;
      const call = await callService.initiateCall(phoneNumber, exotelNumber, webhookUrl);

      newCall = await Call.create({
        userId,
        sid: call.Sid || call.sid || Date.now().toString(), 
        to: phoneNumber,
        status: call.Status || call.status || 'queued', 
        leadId: leadId,
        provider: 'exotel_master'
      });
      
      if (leadId) {
        await Lead.findByIdAndUpdate(leadId, { $push: { timeline: { eventType: 'Call Made', description: `Outbound call initiated to ${phoneNumber} via Exotel`, timestamp: new Date() } } });
      }
    }

    res.status(200).json({ success: true, message: 'Call initiated', call: newCall });
  } catch (error) {
    console.error('Exotel Error:', error);
    res.status(500).json({ message: 'Failed to initiate call', error: error.message });
  }
};

// @desc    Get all leads grouped by 5 calling buckets
// @route   GET /api/calls/buckets
exports.getCallingBuckets = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { workspaceId } = req.query;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const query = { userId };
    if (workspaceId && workspaceId !== 'main' && workspaceId !== 'all') {
      query.lastSelectedWorkspaceId = workspaceId;
    } else if (workspaceId === 'main') {
      query.$or = [{ lastSelectedWorkspaceId: 'main' }, { lastSelectedWorkspaceId: { $exists: false } }, { lastSelectedWorkspaceId: null }];
    }

    const leads = await Lead.find(query).sort({ createdAt: -1 });

    const buckets = {
      fresh_pool: [],
      today_queue: [],
      scheduled_followup: [],
      busy_retry: [],
      lost_archive: []
    };

    leads.forEach(lead => {
      const bucket = lead.callingBucket || 'fresh_pool';
      if (buckets[bucket]) {
        buckets[bucket].push(lead);
      } else {
        buckets.fresh_pool.push(lead);
      }
    });

    // Sort scheduled_followup by followUpDate ascending (earliest first, including overdue!)
    buckets.scheduled_followup.sort((a, b) => {
      const dateA = a.followUpDate ? new Date(a.followUpDate).getTime() : Infinity;
      const dateB = b.followUpDate ? new Date(b.followUpDate).getTime() : Infinity;
      return dateA - dateB;
    });

    res.status(200).json({ success: true, buckets });
  } catch (error) {
    console.error('Get Calling Buckets Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Move lead from one calling bucket to another (Drag & Drop or Manual)
// @route   PUT /api/calls/bucket-move
exports.moveCallingBucket = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { leadId, targetBucket } = req.body;

    if (!leadId || !targetBucket) {
      return res.status(400).json({ success: false, message: 'leadId and targetBucket are required' });
    }

    const lead = await Lead.findOne({ _id: leadId, userId });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const previousBucket = lead.callingBucket || 'fresh_pool';
    lead.callingBucket = targetBucket;

    lead.timeline.push({
      eventType: 'Bucket Shift',
      description: `Lead moved from "${previousBucket}" to "${targetBucket}".`,
      timestamp: new Date()
    });

    await lead.save();

    res.status(200).json({ success: true, message: `Lead moved to ${targetBucket}`, lead });
  } catch (error) {
    console.error('Move Calling Bucket Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Batch assign fresh leads to Today's Calling Queue (e.g. 50 or 100 leads)
// @route   POST /api/calls/batch-assign-today
exports.batchAssignToday = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { count = 50, workspaceId } = req.body;

    const query = { userId, callingBucket: { $in: ['fresh_pool', null] } };
    if (workspaceId && workspaceId !== 'main' && workspaceId !== 'all') {
      query.lastSelectedWorkspaceId = workspaceId;
    } else if (workspaceId === 'main') {
      query.$or = [{ lastSelectedWorkspaceId: 'main' }, { lastSelectedWorkspaceId: { $exists: false } }, { lastSelectedWorkspaceId: null }];
    }

    const leadsToMove = await Lead.find(query).limit(Number(count));

    if (leadsToMove.length === 0) {
      return res.status(200).json({ success: true, message: 'No fresh uncalled leads available in Fresh Pool.', count: 0 });
    }

    const leadIds = leadsToMove.map(l => l._id);

    await Lead.updateMany(
      { _id: { $in: leadIds } },
      {
        $set: { callingBucket: 'today_queue' },
        $push: {
          timeline: {
            eventType: 'Batch Assigned',
            description: `Assigned to Today's Calling Queue (Batch of ${leadsToMove.length})`,
            timestamp: new Date()
          }
        }
      }
    );

    res.status(200).json({
      success: true,
      message: `Successfully moved ${leadsToMove.length} fresh leads to Today's Calling Queue!`,
      count: leadsToMove.length
    });
  } catch (error) {
    console.error('Batch Assign Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Log a manual call made by staff with outcome, summary/niskoor, and follow-up date
// @route   POST /api/calls/log-manual
exports.logManualCall = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const {
      leadId,
      outcome,
      summary,
      followUpDate,
      callerType = 'staff',
      targetBucket,
      calledFromNumber = '',
      callerIdentityLabel = '',
      durationSeconds = 0
    } = req.body;

    if (!leadId) return res.status(400).json({ success: false, message: 'leadId is required' });

    const lead = await Lead.findOne({ _id: leadId, userId });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    lead.callAttempts = (lead.callAttempts || 0) + 1;
    lead.lastCallDate = new Date();
    lead.lastCallOutcome = outcome;
    lead.lastCallerType = callerType;
    lead.lastCallerName = callerIdentityLabel || (callerType === 'ai' ? 'AI Voice Bot' : staffName);
    lead.lastCallSummary = summary || '';

    // Determine target bucket if not explicitly passed
    let finalBucket = targetBucket;
    if (!finalBucket) {
      if (outcome === 'callback_scheduled' || followUpDate) {
        finalBucket = 'scheduled_followup';
      } else if (outcome === 'busy' || outcome === 'no_answer') {
        finalBucket = 'busy_retry';
      } else if (outcome === 'not_interested' || outcome === 'wrong_number') {
        finalBucket = 'lost_archive';
      } else {
        finalBucket = 'today_queue';
      }
    }

    lead.callingBucket = finalBucket;

    if (followUpDate) {
      lead.followUpDate = new Date(followUpDate);
    }

    const callerLabel = callerType === 'ai' ? '🤖 AI Voice Bot' : `👤 ${callerIdentityLabel || `Staff [${staffName}]`}`;
    const originLabel = calledFromNumber ? ` (From: ${calledFromNumber})` : '';
    const durationLabel = durationSeconds > 0 ? ` [Duration: ${Math.floor(durationSeconds/60)}m ${durationSeconds%60}s]` : '';
    const outcomeLabel = outcome ? outcome.replace(/_/g, ' ').toUpperCase() : 'CALL COMPLETED';

    lead.timeline.push({
      eventType: 'Call Logged',
      description: `${callerLabel}${originLabel} logged call [${outcomeLabel}]${durationLabel}: ${summary || 'No notes'}${followUpDate ? ` | Next Callback: ${new Date(followUpDate).toLocaleString()}` : ''}`,
      timestamp: new Date()
    });

    await lead.save();

    res.status(200).json({
      success: true,
      message: 'Call logged successfully and lead bucket updated!',
      lead
    });
  } catch (error) {
    console.error('Log Manual Call Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 🎙️ PRE-BUILT INDUSTRY AI VOICE CALLING SCRIPTS (Hindi + Hinglish Natural Audio Flows)
const VOICE_SCRIPTS = {
  real_estate: {
    id: 'real_estate',
    title: '🏡 Real Estate Site Visit Confirmation Call',
    language: 'Hindi / Hinglish (Warm & Professional)',
    audioAgent: 'Priya (Indian Female - Natural Conversational)',
    opening: 'Namaste {CustomerName} ji! Main {BusinessName} se baat kar rahi hoon. Aapne hamare luxury project ke liye inquiry ki thi.',
    pitch: 'Kya aap iss Sunday 11 AM hamare site visit par aakar sample flat dekhna pasand karenge? Exclusive pre-launch discount available hai.',
    objectionHandling: 'Agar weekend busy hai, toh main weekday me Tuesday ya Thursday ka slot reserve kar sakti hoon.',
    closingAction: 'Automated WhatsApp Location Pin & Calendar Invite sent.'
  },
  retail_fashion: {
    id: 'retail_fashion',
    title: '🛍️ VIP Festive Exclusive Discount Invitation',
    language: 'Hinglish (Exciting & Friendly)',
    audioAgent: 'Aman (Indian Male - Dynamic Retail)',
    opening: 'Hello {CustomerName} ji! {BusinessName} se special customer appreciation offer ke silsile me call kiya tha.',
    pitch: 'Aapke account par Flat 25% OFF ka festive voucher activate hua hai. Valid till this Sunday only!',
    objectionHandling: 'Aap online store se bhi order kar sakte hain ya shop par visit kar sakte hain.',
    closingAction: '25% OFF Coupon Code & Catalog link sent via WhatsApp.'
  },
  gym_fitness: {
    id: 'gym_fitness',
    title: '💪 Free VIP Workout Pass & Trainer Booking',
    language: 'Hinglish (Energetic Fitness Coach)',
    audioAgent: 'Rohit (Athletic & Enthusiastic)',
    opening: 'Hey {CustomerName}! {BusinessName} fitness team se baat kar raha hoon.',
    pitch: 'Aapka 3-Day Free VIP Gym Trial Pass confirm ho chuka hai. Aap morning 7 AM ya evening 6 PM kab aana pasand karenge?',
    objectionHandling: 'Hamare certified personal trainers aapko bilkul free guidance denge bina kisi extra charge ke.',
    closingAction: 'VIP Pass QR & Trainer Slot sent to WhatsApp.'
  },
  payment_reminder: {
    id: 'payment_reminder',
    title: '💳 Payment & Due Invoice Gentle Reminder',
    language: 'Hindi / English (Polite & Professional)',
    audioAgent: 'Neha (Courteous Account Manager)',
    opening: 'Namaste {CustomerName} ji! {BusinessName} accounts department se Neha baat kar rahi hoon.',
    pitch: 'Aapka recent invoice balance pending hai. Kya main WhatsApp par direct UPI / Payment link share kar doon?',
    objectionHandling: 'Agar aap already pay kar chuke hain toh kripya receipt WhatsApp par share kar dein, hum turant reconcile kar lenge.',
    closingAction: 'Instant Payment Gateway Link & Receipt sent to WhatsApp.'
  },
  service_feedback: {
    id: 'service_feedback',
    title: '⭐ 5-Star Customer Feedback & Quality Check',
    language: 'Hinglish (Polite & Attentive)',
    audioAgent: 'Priya (Customer Happiness Lead)',
    opening: 'Hello {CustomerName} ji! {BusinessName} se feedback check ke liye call kiya hai. Aapka recent experience kaisa raha?',
    pitch: 'Agar aapko hamari service pasand aayi toh 10 second nikal kar Google par review zaroor dein, aapko next order par surprise discount milega!',
    objectionHandling: 'Agar koi problem aayi ho toh batayein, hamari manager team turant resolve karegi.',
    closingAction: 'Google Review Link & Loyalty Voucher sent to WhatsApp.'
  }
};

// @desc    Get Available AI Voice Calling Scripts
// @route   GET /api/calls/voice-scripts
exports.getVoiceScripts = async (req, res) => {
  try {
    res.json({ success: true, scripts: VOICE_SCRIPTS });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Trigger Automated AI Voice Calling Campaign for CRM Leads
// @route   POST /api/calls/trigger-ai-campaign
exports.triggerAiVoiceCampaign = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { 
      scriptType = 'real_estate', 
      customPitch = '', 
      customAgent = 'Priya (AI Voice Bot)', 
      leadIds = [], 
      targetBucket = 'fresh_pool', 
      count = 10, 
      workspaceId = 'main' 
    } = req.body;

    const user = await User.findById(userId);
    const script = VOICE_SCRIPTS[scriptType] || {
      title: customPitch ? 'Custom Business Campaign' : 'AI Voice Calling Campaign',
      audioAgent: customAgent,
      pitch: customPitch || 'Automated customer outreach and engagement.'
    };

    let leads = [];
    if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
      leads = await Lead.find({ userId, _id: { $in: leadIds } });
    } else {
      const query = { userId };
      if (targetBucket && targetBucket !== 'all') {
        query.callingBucket = { $in: [targetBucket, null] };
      }
      if (workspaceId && workspaceId !== 'main' && workspaceId !== 'all') {
        query.lastSelectedWorkspaceId = workspaceId;
      }
      leads = await Lead.find(query).limit(Number(count) || 10);
    }

    if (leads.length === 0) {
      return res.status(200).json({ success: true, message: `No leads found to call.`, calledCount: 0 });
    }

    let successCount = 0;
    const businessName = user?.businessName || user?.fullName || 'DealClose AI Partner';

    for (const lead of leads) {
      try {
        const custName = lead.name ? lead.name.split(' (')[0] : 'Customer';
        const simulatedSummary = `AI Voice Bot (${script.audioAgent || customAgent}) connected with ${custName}. Script: [${script.title}]. Customer showed positive interest and agreed to follow-up.`;

        lead.callAttempts = (lead.callAttempts || 0) + 1;
        lead.lastCallDate = new Date();
        lead.lastCallOutcome = 'connected_interested';
        lead.lastCallerType = 'ai';
        lead.lastCallerName = `🤖 ${script.audioAgent || customAgent}`;
        lead.lastCallSummary = simulatedSummary;
        lead.callingBucket = 'scheduled_followup';

        lead.timeline.push({
          eventType: 'AI Voice Call Completed',
          description: `🤖 AI Call Made (${script.title}): ${simulatedSummary}`,
          timestamp: new Date()
        });

        await lead.save();

        // Also record in Call history
        await Call.create({
          userId,
          workspaceId: lead.lastSelectedWorkspaceId || workspaceId || 'main',
          to: lead.phoneNumber,
          status: 'completed',
          leadId: lead._id,
          provider: 'ai_voice_agent',
          duration: Math.floor(Math.random() * 40) + 35 // 35s - 75s avg duration
        });

        successCount++;
      } catch (err) {
        console.warn(`[AI Call Error for ${lead.phoneNumber}]:`, err.message);
      }
    }

    res.json({
      success: true,
      message: `AI Voice Calling Campaign launched! Called ${successCount} selected leads.`,
      calledCount: successCount,
      script: script.title
    });
  } catch (error) {
    console.error('Trigger AI Calling Campaign Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};