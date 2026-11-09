const GatewayDevice = require('../models/gatewayDeviceModel');
const CallingRole = require('../models/callingRoleModel');
const CallingContact = require('../models/callingContactModel');
const CallingLog = require('../models/callingLogModel');
const { evaluateCallingQueue, processPostCallOutcome, get_rate } = require('../services/autoCallingBrain');
const crypto = require('crypto');

// 🔑 1. GENERATE PAIRING CODE (Office Dashboard clicks "Pair Mobile Phone")
exports.generatePairingCode = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Generate readable 6-character code e.g. "DC-8921"
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const code = `DC-${randomDigits}`;

    // Clean existing temp code for this user
    await GatewayDevice.deleteMany({ userId, isOnline: false, deviceId: /^PENDING_/ });

    const tempDevice = new GatewayDevice({
      userId,
      deviceId: `PENDING_${Date.now()}`,
      deviceName: 'Waiting for Android Phone connection...',
      pairingCode: code,
      isOnline: false
    });
    await tempDevice.save();

    res.status(200).json({
      success: true,
      pairingCode: code,
      qrData: JSON.stringify({ serverUrl: process.env.BASE_URL || 'https://dealclose.ai', pairingCode: code }),
      expiresInMinutes: 15
    });
  } catch (err) {
    console.error('Generate Pairing Code Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 📱 2. REGISTER / PAIR ANDROID PHONE (APK calls this with pairingCode)
exports.registerDevice = async (req, res) => {
  try {
    const { pairingCode, deviceId, deviceName, simPhoneNumber, simCarrier, batteryLevel, isDefaultDialer } = req.body;

    if (!pairingCode || !deviceId) {
      return res.status(400).json({ success: false, message: 'pairingCode and deviceId are required' });
    }

    const pending = await GatewayDevice.findOne({ pairingCode });
    if (!pending) {
      return res.status(404).json({ success: false, message: 'Invalid or expired Pairing Code' });
    }

    // Link device permanently to this user
    pending.deviceId = deviceId;
    pending.deviceName = deviceName || 'Android SIM Gateway';
    pending.simPhoneNumber = simPhoneNumber || '';
    pending.simCarrier = simCarrier || 'Jio 4G';
    pending.batteryLevel = batteryLevel || 100;
    pending.isDefaultDialer = Boolean(isDefaultDialer);
    pending.isOnline = true;
    pending.lastPingAt = new Date();
    pending.pairingCode = ''; // Consume code

    await pending.save();

    res.status(200).json({
      success: true,
      message: 'Android Phone successfully paired as SIM Gateway!',
      device: pending,
      userId: pending.userId
    });
  } catch (err) {
    console.error('Register Device Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 💓 3. HEARTBEAT / PING (Android APK sends this every 30-60 seconds)
exports.deviceHeartbeat = async (req, res) => {
  try {
    const { deviceId, batteryLevel, isCharging, isDefaultDialer } = req.body;
    if (!deviceId) return res.status(400).json({ success: false, message: 'deviceId is required' });

    const device = await GatewayDevice.findOne({ deviceId });
    if (!device) return res.status(404).json({ success: false, message: 'Device not found' });

    device.batteryLevel = batteryLevel !== undefined ? batteryLevel : device.batteryLevel;
    device.isCharging = Boolean(isCharging);
    device.isDefaultDialer = isDefaultDialer !== undefined ? Boolean(isDefaultDialer) : device.isDefaultDialer;
    device.isOnline = true;
    device.lastPingAt = new Date();
    await device.save();

    res.status(200).json({ success: true, message: 'Heartbeat acknowledged', status: device.currentCall?.status || 'idle' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 📊 4. GET ALL CONNECTED DEVICES FOR USER
exports.getUserDevices = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const devices = await GatewayDevice.find({ userId }).sort({ updatedAt: -1 }).lean();
    
    // Check if device went offline (> 3 minutes without ping)
    const now = Date.now();
    const updatedDevices = devices.map(d => {
      const diffMinutes = (now - new Date(d.lastPingAt).getTime()) / (1000 * 60);
      return {
        ...d,
        isOnline: d.isOnline && diffMinutes <= 3
      };
    });

    res.status(200).json({ success: true, devices: updatedDevices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🚀 5. TRIGGER REMOTE TEST CALL (Merchant in shop clicks "Test Dial on Home Phone")
exports.dispatchRemoteCall = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { contactId, phone, roleId } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Find active online gateway device
    const device = await GatewayDevice.findOne({ userId, isOnline: true });
    if (!device) {
      return res.status(400).json({ 
        success: false, 
        message: 'No active Android SIM Gateway phone is online at home. Please check if your home phone is connected to WiFi/Mobile net.' 
      });
    }

    let contact = null;
    if (contactId) {
      contact = await CallingContact.findOne({ userId, contact_id: contactId });
    }

    const targetPhone = phone || contact?.phone;
    if (!targetPhone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const activeRole = await CallingRole.findOne({ userId, role_id: roleId || contact?.role_id || 'plumber' });

    // Mark device busy
    device.currentCall = {
      contactId: contactId || 'MANUAL_TEST',
      phoneNumber: targetPhone,
      roleId: activeRole?.role_id || 'general',
      startedAt: new Date(),
      status: 'dialing'
    };
    await device.save();

    res.status(200).json({
      success: true,
      message: `Remote command dispatched to ${device.deviceName}! SIM call starting on ${targetPhone}...`,
      targetPhone,
      role: activeRole?.role_name || 'General Wholesale',
      device: device.deviceName
    });
  } catch (err) {
    console.error('Dispatch Remote Call Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 📋 6. ROLE MANAGEMENT (CRUD)
exports.getCallingRoles = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    let roles = await CallingRole.find({ userId }).sort({ createdAt: 1 });

    // Seed default roles if merchant has none
    if (!roles || roles.length === 0) {
      const defaultRoles = [
        {
          userId,
          role_id: 'plumber',
          role_name: 'Plumber (प्लंबर)',
          firm_name: req.user?.businessName || 'DealClose Building Materials',
          goal: 'Check ongoing site plumbing requirements, take PVC pipe & fittings order',
          offer: 'Flat 5% Extra Cash Discount on full carton order this week',
          default_frequency_days: 7,
          call_window: { start: '10:00', end: '18:30' },
          max_attempts: 3
        },
        {
          userId,
          role_id: 'thekedar',
          role_name: 'Thekedar / Contractor (ठेकेदार)',
          firm_name: req.user?.businessName || 'DealClose Building Materials',
          goal: 'Check upcoming project foundation/finishing requirements, confirm bulk order delivery',
          offer: 'Priority same-day delivery + 15 days credit term on verified billing',
          default_frequency_days: 3,
          call_window: { start: '09:30', end: '19:00' },
          max_attempts: 4
        },
        {
          userId,
          role_id: 'painter',
          role_name: 'Painter (पेंटर / ठेकेदार)',
          firm_name: req.user?.businessName || 'DealClose Building Materials',
          goal: 'Check wall putty, primer, and emulsion requirements for festive season',
          offer: 'Buy 5 Buckets Emulsion, Get 1 Token Coupon Free',
          default_frequency_days: 7,
          call_window: { start: '10:00', end: '19:00' },
          max_attempts: 3
        },
        {
          userId,
          role_id: 'wholesale',
          role_name: 'Wholesale B2B Retailer (होलसेल/दुकानदार)',
          firm_name: req.user?.businessName || 'DealClose Building Materials',
          goal: 'Restock fast-moving hardware items, settle monthly account balance',
          offer: 'Zero freight charge on minimum order value of ₹25,000',
          default_frequency_days: 15,
          call_window: { start: '11:00', end: '18:00' },
          max_attempts: 3
        }
      ];

      roles = await CallingRole.insertMany(defaultRoles);
    }

    res.status(200).json({ success: true, roles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.saveCallingRole = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { role_id, role_name, firm_name, goal, prompt_template, offer, default_frequency_days, call_window, max_attempts } = req.body;

    if (!role_id || !role_name) {
      return res.status(400).json({ success: false, message: 'role_id and role_name are required' });
    }

    const role = await CallingRole.findOneAndUpdate(
      { userId, role_id },
      {
        userId,
        role_id,
        role_name,
        firm_name: firm_name || 'DealClose Partner',
        goal,
        prompt_template,
        offer,
        default_frequency_days: Number(default_frequency_days) || 7,
        call_window: call_window || { start: '10:00', end: '19:00' },
        max_attempts: Number(max_attempts) || 3
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, message: `Role ${role_name} saved!`, role });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 👥 7. CONTACTS QUEUE & REPORT
exports.getCallingContacts = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { roleId, filter = 'all' } = req.query;

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const query = { userId };
    if (roleId && roleId !== 'all') query.role_id = roleId;

    const now = new Date();

    if (filter === 'due_today') {
      query.next_call_date = { $lte: now };
      query.do_not_call = false;
    } else if (filter === 'interested') {
      query.status = 'interested';
    } else if (filter === 'ordered') {
      query.status = 'ordered';
    } else if (filter === 'callback') {
      query.status = 'callback_scheduled';
    } else if (filter === 'no_answer') {
      query.status = 'no_answer';
    } else if (filter === 'do_not_call') {
      query.do_not_call = true;
    }

    const contacts = await CallingContact.find(query).sort({ next_call_date: 1 }).limit(100);
    const dueCount = await CallingContact.countDocuments({ userId, next_call_date: { $lte: now }, do_not_call: false });

    res.status(200).json({ success: true, contacts, dueCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 📥 8. IMPORT CONTACTS FROM EXCEL/JSON
exports.importCallingContacts = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { contacts, defaultRoleId = 'plumber' } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ success: false, message: 'No contacts provided' });
    }

    let created = 0;
    let updated = 0;

    for (const c of contacts) {
      const cleanPhone = String(c.phone || c.phoneNumber || '').replace(/\D/g, '').slice(-10);
      const name = String(c.name || 'Customer').trim();
      const role_id = String(c.role_id || c.role || defaultRoleId).toLowerCase().trim();

      if (!cleanPhone) continue;

      const contact_id = `CUST_${cleanPhone}`;

      const existing = await CallingContact.findOne({ userId, phone: cleanPhone });
      if (existing) {
        existing.name = name || existing.name;
        existing.role_id = role_id || existing.role_id;
        await existing.save();
        updated++;
      } else {
        await CallingContact.create({
          userId,
          contact_id,
          name,
          phone: cleanPhone,
          role_id,
          status: 'pending',
          next_call_date: new Date() // ready for today's queue
        });
        created++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Imported ${created} new contacts, updated ${updated} existing contacts.`,
      summary: { created, updated }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🔄 9. RUN SCHEDULER MANUAL TRIGGER (Evaluate Queue)
exports.triggerSchedulerEvaluation = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const queuedCalls = await evaluateCallingQueue(userId);

    res.status(200).json({
      success: true,
      message: `Evaluated calling queue: Found ${queuedCalls.length} calls due right now within call windows!`,
      queuedCalls
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 📝 10. SUBMIT POST-CALL RESULT (Calculates next_call_date deterministically)
exports.submitCallResult = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { contact_id, result_json, transcript_or_summary, durationSeconds, provider } = req.body;

    if (!contact_id) return res.status(400).json({ success: false, message: 'contact_id is required' });

    const outcome = await processPostCallOutcome({
      userId,
      contact_id,
      provider: provider || 'mobile_sim_apk',
      durationSeconds: Number(durationSeconds) || 0,
      transcript_or_summary: transcript_or_summary || '',
      result_json: result_json || {}
    });

    res.status(200).json({
      success: true,
      message: 'Call outcome processed and next calling date calculated!',
      outcome
    });
  } catch (err) {
    console.error('Submit Call Result Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🧠 11. SMART AI DIARY / NOTES EXTRACTOR
// Takes rough handwritten OCR text, WhatsApp chat, or messy notes -> Extracts structured contacts
exports.parseDiaryNotes = async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide notes text to extract.' });
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

    const systemPrompt = `You are an expert Indian Hardware, Sanitary & Building Materials CRM AI assistant.
Extract contact entries from rough, messy merchant diary notes, WhatsApp messages, or spoken Hindi/Hinglish text.

For each contact detected, extract:
1. "name": Person's name (or "Mistri" / "Customer" if unknown)
2. "phone": 10-digit Indian mobile number (clean, no +91, no spaces)
3. "role_id": One of ["plumber", "painter", "electrician", "thekedar", "wholesale", "customer"]
4. "subSegment": Classify accurately into one of:
   - "regular": Takes material regularly / weekly / current sites.
   - "inactive": Used to buy earlier, stopped coming / dormant / comeback needed.
   - "new_cold": Completely new / doesn't know shop / needs address & intro.
   - "payment_due": Has pending balance / udhari / dues mention.
5. "pendingBalance": Number if any dues mentioned, else 0.
6. "siteLocation": Location / area / site name if mentioned (e.g. "Bilaspur", "Station Road"), else "".
7. "notes": Brief Hindi/English note about what they work on.

Return ONLY a valid JSON array of objects. No markdown backticks, no markdown codeblocks, no extra explanation text.
Example format:
[
  { "name": "Ramesh", "phone": "9826112345", "role_id": "plumber", "subSegment": "regular", "pendingBalance": 0, "siteLocation": "Bilaspur", "notes": "pipe fittings" },
  { "name": "Suresh", "phone": "9827098765", "role_id": "thekedar", "subSegment": "payment_due", "pendingBalance": 15000, "siteLocation": "Sector 4", "notes": "15k balance" }
]`;

    let parsedList = [];
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        const result = await model.generateContent(`${systemPrompt}\n\nHere is the merchant's rough notes:\n${rawText}`);
        let textResp = result.response.text().trim();
        // Clean markdown backticks if any
        textResp = textResp.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/, '').trim();
        parsedList = JSON.parse(textResp);
      } catch (geminiErr) {
        console.warn('Gemini diary parsing failed, using regex fallback:', geminiErr.message);
      }
    }

    // Fallback parser if Gemini failed or missing
    if (!Array.isArray(parsedList) || parsedList.length === 0) {
      const lines = rawText.split('\n');
      parsedList = lines.map(line => {
        const phoneMatch = line.match(/(?:\+91|91)?[6-9]\d{9}/);
        if (!phoneMatch) return null;
        const cleanPhone = phoneMatch[0].replace(/^\+?91/, '').slice(-10);
        const isThekedar = /thekedar|contractor|theka/i.test(line);
        const isPainter = /painter|rang|paint|putty/i.test(line);
        const isPlumber = /plumber|nal|pipe|fitting/i.test(line);
        const isElectrician = /electric|wire|bijli/i.test(line);
        const isDue = /baaki|due|udhar|hisaab|rupaye|rs|₹/i.test(line);
        const isNew = /naya|new|cold|pata nahi/i.test(line);
        const isInactive = /pehle|chhod|nahi aa/i.test(line);

        return {
          name: line.replace(phoneMatch[0], '').replace(/[^a-zA-Z\s]/g, '').trim().split(' ')[0] || 'Customer',
          phone: cleanPhone,
          role_id: isThekedar ? 'thekedar' : isPainter ? 'painter' : isPlumber ? 'plumber' : isElectrician ? 'electrician' : 'plumber',
          subSegment: isDue ? 'payment_due' : isNew ? 'new_cold' : isInactive ? 'inactive' : 'regular',
          pendingBalance: 0,
          siteLocation: '',
          notes: line.trim()
        };
      }).filter(Boolean);
    }

    res.status(200).json({
      success: true,
      extractedCount: parsedList.length,
      contacts: parsedList
    });
  } catch (err) {
    console.error('Parse Diary Notes Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🏪 12. UPDATE SHOP CALLING PROFILE (Address, Landmark, Google Map URL for AI Answers)
exports.updateShopCallingProfile = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { businessName, address, landmark, googleMapsUrl, upiId, whatsappNumber } = req.body;

    const User = require('../models/userModel');
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.brandKit = user.brandKit || {};
    if (businessName) user.brandKit.businessName = businessName;
    if (address) user.brandKit.address = address;
    if (whatsappNumber) user.brandKit.whatsapp = whatsappNumber;

    // Save extended metadata in user custom map
    user.brandKit.landmark = landmark || user.brandKit.landmark || '';
    user.brandKit.googleMapsUrl = googleMapsUrl || user.brandKit.googleMapsUrl || '';
    user.brandKit.upiId = upiId || user.brandKit.upiId || '';

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Shop Calling Profile updated! AI Neha will now use your real address & Google Maps link.',
      profile: {
        businessName: user.brandKit.businessName,
        address: user.brandKit.address,
        landmark: user.brandKit.landmark,
        googleMapsUrl: user.brandKit.googleMapsUrl,
        upiId: user.brandKit.upiId,
        whatsappNumber: user.brandKit.whatsapp
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

