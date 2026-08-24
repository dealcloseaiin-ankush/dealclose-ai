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