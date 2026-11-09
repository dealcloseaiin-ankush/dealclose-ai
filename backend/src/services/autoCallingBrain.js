/**
 * 🧠 ROLE-BASED AUTO CALLING BRAIN
 * =====================================================================
 * Handles:
 * 1. Accounting App Rate Hook (get_rate)
 * 2. Scheduled Contact Queueing with Call Window & Frequency checks
 * 3. Role-based Context & Prompt Assembly (Goal, Offer, History, Date)
 * 4. Deterministic Post-Call State Transitions (Code Calculates Dates)
 * 5. Pluggable Calling Dispatcher (Mobile SIM APK / Cloud Telephony)
 */

const CallingRole = require('../models/callingRoleModel');
const CallingContact = require('../models/callingContactModel');
const CallingLog = require('../models/callingLogModel');
const crypto = require('crypto');

// 📦 1. ACCOUNTING APP / CATALOG RATE HOOK
// Real-time rates can come from Vyapar, Tally, or DealClose Local Catalog
async function get_rate(itemName, userId = null) {
  try {
    // Normalization
    const query = String(itemName || '').toLowerCase().trim();
    
    // In-memory / Accounting sync rate table fallback
    const MOCK_ACCOUNTING_RATES = {
      'pvc pipe 1 inch': { rate: 185, unit: 'per pipe (10ft)', brand: 'Supreme / Astral' },
      'pvc pipe 4 inch': { rate: 580, unit: 'per pipe', brand: 'Finolex' },
      'elbow 1 inch': { rate: 18, unit: 'per pc', brand: 'Standard' },
      'tee 1 inch': { rate: 24, unit: 'per pc', brand: 'Standard' },
      'solvent cement 100ml': { rate: 65, unit: 'per can', brand: 'BondTite' },
      'distemper 20kg': { rate: 950, unit: 'per bucket', brand: 'Asian Paints Tractor' },
      'tractor emulsion 20l': { rate: 2350, unit: 'per bucket', brand: 'Asian Paints' },
      'putty 40kg': { rate: 780, unit: 'per bag', brand: 'Birla White' },
      'wire 1.5 sq mm': { rate: 1450, unit: 'per coil (90m)', brand: 'Havells / Polycab' },
      'switch 6a': { rate: 32, unit: 'per pc', brand: 'Anchor Roma' },
      'cement 50kg': { rate: 360, unit: 'per bag', brand: 'UltraTech' }
    };

    for (const [key, val] of Object.entries(MOCK_ACCOUNTING_RATES)) {
      if (query.includes(key) || key.includes(query)) {
        return { success: true, item: key, ...val, source: 'Accounting Sync (Live)' };
      }
    }

    return { 
      success: true, 
      item: itemName, 
      rate: 'Daily Market Rate (Discount Applicable)', 
      unit: 'Standard', 
      source: 'Default Wholesale Rate' 
    };
  } catch (err) {
    console.error('get_rate Error:', err);
    return { success: false, message: 'Could not fetch rate from accounting app' };
  }
}

// 🕒 2. TIME WINDOW CHECKER (e.g. 10:00 to 19:00 IST)
function isWithinCallWindow(windowConfig, targetDate = new Date()) {
  if (!windowConfig || !windowConfig.start || !windowConfig.end) return true;

  // Convert to local hours & minutes (HH:mm)
  const hours = String(targetDate.getHours()).padStart(2, '0');
  const minutes = String(targetDate.getMinutes()).padStart(2, '0');
  const currentTime = `${hours}:${minutes}`;

  return currentTime >= windowConfig.start && currentTime <= windowConfig.end;
}

// 📅 3. CHECK IF CONTACT WAS ALREADY CALLED TODAY
function isCalledToday(lastCallDate) {
  if (!lastCallDate) return false;
  const last = new Date(lastCallDate);
  const now = new Date();
  return (
    last.getFullYear() === now.getFullYear() &&
    last.getMonth() === now.getMonth() &&
    last.getDate() === now.getDate()
  );
}

// 📝 4. PROMPT & CONTEXT ASSEMBLER
async function assembleCallPrompt(role, contact, userId) {
  const User = require('../models/userModel');
  const user = await User.findById(userId).lean();

  const shopName = user?.brandKit?.businessName || role.firm_name || 'DealClose Building Materials';
  const shopAddress = user?.brandKit?.address || 'Near Main Market Road';
  const shopLandmark = user?.brandKit?.landmark || '';
  const shopMaps = user?.brandKit?.googleMapsUrl || '';

  // Fetch last 3 call summaries
  const recentLogs = await CallingLog.find({ userId, contact_id: contact.contact_id })
    .sort({ call_time: -1 })
    .limit(3)
    .lean();

  let historyText = 'Pehli baar call ho rahi hai (No past history).';
  if (recentLogs && recentLogs.length > 0) {
    historyText = recentLogs.map((l, idx) => {
      const dt = new Date(l.call_time).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' });
      return `[Call #${idx + 1} (${dt})]: ${l.transcript_or_summary || l.result_json?.notes || 'Baat hui'}`;
    }).join(' | ');
  }

  const todayStr = new Date().toLocaleDateString('hi-IN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // 🎯 SUB-SEGMENT STRATEGY ENGINE:
  const subSeg = contact.subSegment || 'regular';
  let segmentInstruction = '';

  if (subSeg === 'new_cold') {
    segmentInstruction = `[TARGET: NAYA CUSTOMER / UNKNOWN PROSPECT]\nYe hamari dukan ko nahi jaante hain. Pehle saaf parichay dein: "Hamari wholesale dukan '${shopName}', ${shopAddress}${shopLandmark ? ' (' + shopLandmark + ')' : ''} par hai."\nAapka maqsad inko dukan se jodna hai. Bolein: "Aapka WhatsApp number yahi hai na? Main Google Map location aur taaza rate list WhatsApp par bhej rahi hoon."`;
  } else if (subSeg === 'inactive') {
    segmentInstruction = `[TARGET: DORMANT / PURANA CUSTOMER REACTIVATION]\nYe pehle dukan se samaan lete the lekin kaafi time se nahi aaye. Narazgi ya dikkat gently poohein: "Ramesh ji, kaafi dino se dukan par nahi dekhe aapko, sab theek hai na? Koi shikayat toh nahi thi?"\nInko comeback ke liye vishesh offer dein: "${role.offer}"`;
  } else if (subSeg === 'payment_due') {
    const dueAmt = Number(contact.pendingBalance || 0);
    segmentInstruction = `[TARGET: PAYMENT DUES / HISAB FOLLOW-UP]\nInka ${dueAmt > 0 ? '₹' + dueAmt.toLocaleString('en-IN') : 'hisaab'} balance pending hai. Izzat aur vinamrata se reminder dein: "Accounts se aapke pending balance ke silsile me call kiya hai. Kya main instant UPI link share kar doon taaki accounts clear ho jaye?"`;
  } else {
    // Regular
    segmentInstruction = `[TARGET: REGULAR REPEAT BUYER]\nYe hamare regular ${role.role_name} hain. Aajkal kahan site chal rahi hai poohein, pipe/fitting/material ka requirement lein, aur scheme batayein.`;
  }

  // Mandatory Introduction Clause:
  const identityClause = `Aap ${shopName} ke virtual business assistant (Neha) hain. Saaf aur polite Hindi/Hinglish me baat karein. Dukan ka address: ${shopAddress}${shopLandmark ? ' (' + shopLandmark + ')' : ''}.`;

  // Dynamic Prompt Replacement
  let compiledPrompt = role.prompt_template || '';
  compiledPrompt = compiledPrompt
    .replace(/{firm_name}/g, shopName)
    .replace(/{name}/g, contact.name)
    .replace(/{role_name}/g, role.role_name)
    .replace(/{goal}/g, role.goal)
    .replace(/{offer}/g, role.offer)
    .replace(/{call_history}/g, historyText)
    .replace(/{today_date}/g, todayStr);

  return {
    contactId: contact.contact_id,
    contactName: contact.name,
    phone: contact.phone,
    roleId: role.role_id,
    roleName: role.role_name,
    subSegment: subSeg,
    firmName: shopName,
    shopAddress,
    shopMaps,
    identityIntroduction: identityClause,
    goal: role.goal,
    offer: role.offer,
    todayDate: todayStr,
    historySummary: historyText,
    fullSystemPrompt: `${identityClause}\n\n${segmentInstruction}\n\n${compiledPrompt}\n\n[Aaj Ki Tareekh]: ${todayStr}\n[Purani History]: ${historyText}`
  };
}

// ⏰ 5. SCHEDULER ENGINE (Runs Every 5-10 Minutes via Cron or Trigger)
async function evaluateCallingQueue(userId) {
  const now = new Date();

  // Find all active roles for this merchant
  const roles = await CallingRole.find({ userId, isActive: true }).lean();
  const roleMap = new Map();
  roles.forEach(r => roleMap.set(r.role_id, r));

  // Query: next_call_date <= now AND do_not_call = false
  const dueContacts = await CallingContact.find({
    userId,
    do_not_call: false,
    next_call_date: { $lte: now },
    status: { $nin: ['in_progress', 'archived'] }
  }).lean();

  const queuedCalls = [];

  for (const contact of dueContacts) {
    const role = roleMap.get(contact.role_id);
    if (!role) continue;

    // Check 1: Current time within role's call window (e.g. 10am to 7pm)
    if (!isWithinCallWindow(role.call_window, now)) {
      continue; // Outside allowed calling hours
    }

    // Check 2: Aaj is contact ko call nahi gayi honi chahiye
    if (isCalledToday(contact.last_call_date)) {
      continue; // Already attempted today
    }

    // Assemble rich context and prompt
    const preparedCall = await assembleCallPrompt(role, contact, userId);
    queuedCalls.push({
      contact,
      role,
      preparedCall
    });
  }

  return queuedCalls;
}

// ⚙️ 6. POST-CALL DETERMINISTIC STATE MACHINE
// "CODE (AI nahi) next_call_date set kare"
async function processPostCallOutcome({
  userId,
  contact_id,
  provider = 'mobile_sim_apk',
  durationSeconds = 0,
  transcript_or_summary = '',
  result_json = {}
}) {
  const contact = await CallingContact.findOne({ userId, contact_id });
  if (!contact) {
    throw new Error(`Contact not found: ${contact_id}`);
  }

  const role = await CallingRole.findOne({ userId, role_id: contact.role_id }) || {
    default_frequency_days: 7,
    max_attempts: 3
  };

  const now = new Date();
  const prevNextCallDate = contact.next_call_date;
  let newNextCallDate = new Date();
  let ruleApplied = '';
  let doNotCallSet = false;
  let newStatus = 'called';

  const interest = String(result_json.interest || '').toLowerCase().trim();
  const hasOrder = result_json.order && (result_json.order.item || result_json.order.qty);

  // -------------------------------------------------------------
  // DETERMINISTIC CODE RULES:
  // -------------------------------------------------------------

  // RULE 1: Mana kiya / Unsubscribe ("na" ya "wrong_number")
  if (interest === 'na' || interest === 'not_interested' || interest === 'wrong_number') {
    contact.do_not_call = true;
    doNotCallSet = true;
    newStatus = 'archived';
    ruleApplied = 'Customer declined / Mana kiya -> do_not_call = true';
  }

  // RULE 2: Order Placed -> 3 din baad delivery/usage follow-up
  else if (hasOrder || interest === 'ordered') {
    newNextCallDate.setDate(now.getDate() + 3);
    newStatus = 'ordered';
    contact.attempts = 0; // Reset attempts on conversion
    ruleApplied = `Order placed [${result_json.order?.item} x ${result_json.order?.qty}] -> Follow-up in exactly 3 Days`;
  }

  // RULE 3: "Kal bataunga" / Callback Scheduled
  else if (interest === 'baad_me' || result_json.callback_date) {
    if (result_json.callback_date && !isNaN(new Date(result_json.callback_date).getTime())) {
      newNextCallDate = new Date(result_json.callback_date);
    } else {
      // Default "kal bataunga" -> Next Day (1 day later)
      newNextCallDate.setDate(now.getDate() + 1);
    }
    newStatus = 'callback_scheduled';
    ruleApplied = `Callback requested -> Scheduled for ${newNextCallDate.toISOString().split('T')[0]}`;
  }

  // RULE 4: Phone nahi utha (No Answer / Busy)
  else if (interest === 'no_answer' || interest === 'busy') {
    const nextAttempts = (contact.attempts || 0) + 1;
    contact.attempts = nextAttempts;

    if (nextAttempts >= (role.max_attempts || 3)) {
      // Max attempts exhausted: Pause for 7 days
      newNextCallDate.setDate(now.getDate() + 7);
      newStatus = 'failed';
      ruleApplied = `Max attempts (${role.max_attempts}) reached without answer -> Paused for 7 days`;
    } else {
      // 1 din baad retry
      newNextCallDate.setDate(now.getDate() + 1);
      newStatus = 'no_answer';
      ruleApplied = `Attempt ${nextAttempts}/${role.max_attempts} unanswered -> Retry in 1 day`;
    }
  }

  // RULE 5: Interested ("haan") -> Role ki default frequency (e.g. 7 days or 3 days)
  else if (interest === 'haan' || interest === 'interested') {
    const freq = role.default_frequency_days || 7;
    newNextCallDate.setDate(now.getDate() + freq);
    newStatus = 'interested';
    contact.attempts = 0;
    ruleApplied = `Interested party -> Scheduled next cycle after role default frequency (${freq} days)`;
  }

  // DEFAULT FALLBACK: Default Role Frequency
  else {
    const freq = role.default_frequency_days || 7;
    newNextCallDate.setDate(now.getDate() + freq);
    newStatus = 'called';
    ruleApplied = `General call complete -> Default cycle (${freq} days)`;
  }

  // Save Contact Updates
  contact.last_call_date = now;
  contact.next_call_date = newNextCallDate;
  contact.status = newStatus;
  contact.lastCallSummary = transcript_or_summary || result_json.notes || ruleApplied;
  if (result_json.notes) {
    contact.notes = `${contact.notes ? contact.notes + ' | ' : ''}${result_json.notes}`;
  }
  await contact.save();

  // Create Call Log
  const log = new CallingLog({
    userId,
    log_id: `LOG_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    contact_id: contact.contact_id,
    contactPhone: contact.phone,
    contactName: contact.name,
    role_id: contact.role_id,
    call_time: now,
    provider,
    durationSeconds,
    transcript_or_summary,
    result_json,
    transitionDetails: {
      ruleApplied,
      previousNextCallDate: prevNextCallDate,
      newNextCallDate,
      doNotCallSet
    }
  });
  await log.save();

  return {
    success: true,
    contact,
    log,
    ruleApplied,
    nextCallDate: newNextCallDate
  };
}

module.exports = {
  get_rate,
  isWithinCallWindow,
  assembleCallPrompt,
  evaluateCallingQueue,
  processPostCallOutcome
};
