/**
 * 🛡️ MSME Credit Limit Mandate & Daily Udhar OTP Service
 * Zero-cost WhatsApp (wa.me) links, promissory notes, 5-point statement,
 * and 30-minute OTP reuse window logic.
 */

// Generate random 4-digit OTP
exports.generateOtp = () => {
  return String(Math.floor(1000 + Math.random() * 9000));
};

// Build Promissory Mandate Hindi text + wa.me link
exports.buildPromissoryMandate = (shopName, partyName, phone, sanctionedLimit, validityDays, otp) => {
  const cleanPhone = String(phone).replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12 
    ? cleanPhone 
    : (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone);

  const text = 
`📜 *वैधानिक साख स्वीकृति वचन-पत्र (Promissory Mandate)* 📜
🏪 *दुकान/प्रतिष्ठान:* ${shopName || 'हमारे प्रतिष्ठान'}
👤 *ग्राहक का नाम:* ${partyName}
🛡️ *स्वीकृत क्रेडिट लिमिट:* ₹${Number(sanctionedLimit).toLocaleString('en-IN')}
📅 *वैधता अवधि:* ${validityDays || 365} दिन

"मैं (${partyName}), ${shopName || 'प्रतिष्ठान'} द्वारा प्रदान की जा रही ₹${Number(sanctionedLimit).toLocaleString('en-IN')} की साख (उधार) सीमा एवं इसकी नियम-शर्तों को सहर्ष स्वीकार करता/करती हूँ। मैं खरीदे गए माल का समय पर भुगतान करने का वचन देता/देती हूँ।"

🔐 *आपकी सहमति का 4-अंकों का गुप्त OTP:* *${otp}*
_(कृपया यह OTP काउंटर पर बताएं ताकि आपकी क्रेडिट लिमिट तुरंत सक्रिय हो सके। यह OTP 30 मिनट के लिए मान्य है।)_`;

  const waLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  return { text, waLink };
};

// Build Dynamic 5-Point Daily Statement Hindi text + wa.me link
exports.build5PointDailyStatement = (shopName, partyName, phone, billNumber, snapshot, otp) => {
  const cleanPhone = String(phone).replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12 
    ? cleanPhone 
    : (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone);

  const todayStr = new Date().toLocaleDateString('hi-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const text = 
`🛍️ *${shopName || 'प्रतिष्ठान'} - दैनिक उधार पावती व 5-बिंदु हिसाब* 🛍️
🧾 *बिल नंबर:* #${billNumber}
📅 *तारीख:* ${todayStr}
👤 *ग्राहक:* ${partyName}

📊 *दैनिक 5-बिंदु वित्तीय स्थिति (Daily Financial Statement):*
1. 📦 *आज का बिल:* ₹${Number(snapshot.billAmount || 0).toLocaleString('en-IN')}
2. 📜 *पिछला बकाया:* ₹${Number(snapshot.previousBalance || 0).toLocaleString('en-IN')}
3. 💰 *कुल नया बकाया:* ₹${Number(snapshot.newTotalBalance || 0).toLocaleString('en-IN')}
4. 🛡️ *कुल स्वीकृत लिमिट:* ₹${Number(snapshot.sanctionedLimit || 0).toLocaleString('en-IN')}
5. 🟢 *बची हुई उपलब्ध लिमिट:* ₹${Number(snapshot.remainingLimit || 0).toLocaleString('en-IN')}

🔐 *माल हैंडओवर / डिलीवरी पुष्टि OTP:* *${otp}*
_(माल सुरक्षित प्राप्त होने पर यह OTP डिलीवरी स्टाफ या काउंटर पर बताएं। OTP सत्यापन के बाद ही यह बिल खाते में दर्ज होगा।)_`;

  const waLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  return { text, waLink };
};

// Build Milestone Threshold (50-60% Limit) OTP Notification
exports.buildMilestoneThresholdOtpMessage = (shopName, partyName, phone, billNumber, snapshot, otp, thresholdPct = 50) => {
  const cleanPhone = String(phone).replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12 
    ? cleanPhone 
    : (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone);

  const todayStr = new Date().toLocaleDateString('hi-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const text = 
`⚠️ *${shopName || 'प्रतिष्ठान'} - क्रेडिट लिमिट माइलस्टोन सूचना (${thresholdPct}% पूरी)* ⚠️
🧾 *बिल नंबर:* #${billNumber}
📅 *तारीख:* ${todayStr}
👤 *ग्राहक:* ${partyName}

📊 *5-बिंदु खाता स्थिति:*
1. 📦 *आज का बिल:* ₹${Number(snapshot.billAmount || 0).toLocaleString('en-IN')}
2. 📜 *पिछला बकाया:* ₹${Number(snapshot.previousBalance || 0).toLocaleString('en-IN')}
3. 💰 *कुल नया बकाया:* ₹${Number(snapshot.newTotalBalance || 0).toLocaleString('en-IN')}
4. 🛡️ *कुल स्वीकृत लिमिट:* ₹${Number(snapshot.sanctionedLimit || 0).toLocaleString('en-IN')}
5. 🟢 *बची हुई लिमिट:* ₹${Number(snapshot.remainingLimit || 0).toLocaleString('en-IN')}

🔔 *सुरक्षा सूचना:* आपकी स्वीकृत लिमिट का ${thresholdPct}% उपयोग हो चुका है।
🔐 *आगे खरीदारी जारी रखने के लिए सत्यापन OTP:* *${otp}*
_(यह 4-अंकों का OTP दुकानदार को बताएं ताकि आपका खाता बिना रुकावट ₹${Number(snapshot.sanctionedLimit || 0).toLocaleString('en-IN')} तक जारी रहे।)_`;

  const waLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  return { text, waLink };
};

// Build Frictionless Running Khata Bill Receipt (No OTP block)
exports.buildRunningLimitKhataReceipt = (shopName, partyName, phone, billNumber, snapshot) => {
  const cleanPhone = String(phone).replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12 
    ? cleanPhone 
    : (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone);

  const todayStr = new Date().toLocaleDateString('hi-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const text = 
`✅ *${shopName || 'प्रतिष्ठान'} - रनिंग खाता बिल (डिलीवर्ड)* ✅
🧾 *बिल नंबर:* #${billNumber}
📅 *तारीख:* ${todayStr}
👤 *ग्राहक:* ${partyName}

📊 *5-बिंदु खाता स्थिति:*
1. 📦 *आज का सामान/बिल:* ₹${Number(snapshot.billAmount || 0).toLocaleString('en-IN')}
2. 📜 *पिछला बकाया:* ₹${Number(snapshot.previousBalance || 0).toLocaleString('en-IN')}
3. 💰 *कुल नया बकाया:* ₹${Number(snapshot.newTotalBalance || 0).toLocaleString('en-IN')}
4. 🛡️ *स्वीकृत क्रेडिट लिमिट:* ₹${Number(snapshot.sanctionedLimit || 0).toLocaleString('en-IN')}
5. 🟢 *बची हुई उपलब्ध लिमिट:* ₹${Number(snapshot.remainingLimit || 0).toLocaleString('en-IN')}

🙏 माल सुपुर्द किया गया। धन्यवाद!`;

  const waLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  return { text, waLink };
};

// Build Payment Receipt Hindi text + wa.me link
exports.buildPaymentReceipt = (shopName, partyName, phone, amount, paymentMode, prevBal, newBal, limit) => {
  const cleanPhone = String(phone).replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12 
    ? cleanPhone 
    : (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone);

  const availableLimit = Math.max(0, (limit || 0) - (newBal || 0));

  const text = 
`💵 *${shopName || 'प्रतिष्ठान'} - भुगतान पावती रसीद* 💵
👤 *ग्राहक:* ${partyName}
💰 *प्राप्त जमा राशि:* ₹${Number(amount).toLocaleString('en-IN')} (${paymentMode || 'नकद'})
📅 *तारीख:* ${new Date().toLocaleDateString('hi-IN')}

📊 *अद्यतन खाता स्थिति:*
• पिछला बकाया: ₹${Number(prevBal).toLocaleString('en-IN')}
• जमा की गई राशि: -₹${Number(amount).toLocaleString('en-IN')}
• वर्तमान कुल बकाया: ₹${Number(newBal).toLocaleString('en-IN')}
• बची हुई उपलब्ध लिमिट: ₹${Number(availableLimit).toLocaleString('en-IN')}

✅ आपका भुगतान दर्ज हो गया है और खाता सुचारू रूप से सक्रिय है। धन्यवाद! 🙏`;

  const waLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  return { text, waLink };
};

// Build Loyalty Stamp Card Hindi text + wa.me link
exports.buildLoyaltyStampMessage = (shopName, partyName, phone, completedVisits, targetVisits, rewardUnlocked, couponCode, city = '', rewardDescription = '') => {
  const cleanPhone = String(phone).replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12 
    ? cleanPhone 
    : (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone);

  let stars = '';
  for (let i = 0; i < targetVisits; i++) {
    stars += i < completedVisitsCountSafe(completedVisits) ? '⭐ ' : '⚪ ';
  }

  const cityTag = city ? ` (${city})` : '';
  const rewardName = rewardDescription || 'स्पेशल रिवॉर्ड / मुफ़्त गिफ्ट';

  let rewardMsg = '';
  if (rewardUnlocked && couponCode) {
    rewardMsg = `\n\n🎉 *बधाई हो! आपने ${targetVisits} विजिट्स पूरी कर ली हैं!* 🎉\n🎁 *आपका अनलॉक इनाम:* *${rewardName}*\n🎟️ *कूपन कोड:* *${couponCode}*\n(दुकान पर यह कूपन दिखाकर सीधे अपना इनाम प्राप्त करें!)`;
  } else {
    const remaining = Math.max(0, targetVisits - completedVisitsCountSafe(completedVisits));
    rewardMsg = `\n\n🎯 केवल *${remaining} विजिट्स और*, और पाइए:\n🎁 *${rewardName}* मुफ़्त!`;
  }

  const text = 
`🌟 *${shopName || 'प्रतिष्ठान'} - डिजिटल लॉयल्टी स्टैम्प कार्ड* 🌟
👤 *ग्राहक:* ${partyName}${cityTag}
📱 *मोबाइल:* ${cleanPhone}

⭐ *आपकी प्रोग्रेस:*
[ ${stars.trim()} ]
विजिट्स: *${completedVisitsCountSafe(completedVisits)} / ${targetVisits} पूरी!*${rewardMsg}

🙏 हमारे यहाँ आने के लिए हार्दिक धन्यवाद!`;

  const waLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  return { text, waLink };
};

// Build Coupon WhatsApp message + wa.me link
exports.buildCouponWhatsAppMessage = (shopName, customerName, phone, code, offerTitle, validUntil, city = '') => {
  const cleanPhone = String(phone).replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12 
    ? cleanPhone 
    : (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone);

  const cityTag = city ? ` (${city})` : '';
  const expiryDate = validUntil ? new Date(validUntil).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'सीमित समय के लिए';

  const text = 
`🎟️ *${shopName || 'प्रतिष्ठान'} - विशेष डिस्काउंट कूपन!* 🎟️

नमस्ते *${customerName || 'सम्मानित ग्राहक'}* जी${cityTag},

आपके लिए हमारी दुकान से विशेष ऑफर:
🎁 *${offerTitle || 'विशेष छूट'}*

🔑 *आपका कूपन कोड:* *${code}*
📅 *वैधता:* ${expiryDate} तक

दुकान पर काउंटर पर यह कोड बताएं और सीधे लाभ उठाएं!
📍 *${shopName || 'हमारी दुकान'}*
🙏 आपका दिन शुभ हो!`;

  const waLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  return { text, waLink };
};

function completedVisitsCountSafe(c) {
  return Number(c) || 0;
}

// Check 30-Minute OTP reuse or generate fresh
exports.getOrReuseOtp = (existingOtp, existingExpiry) => {
  const now = new Date();
  if (existingOtp && existingExpiry && new Date(existingExpiry) > now) {
    return {
      otp: existingOtp,
      expiresAt: existingExpiry,
      isReused: true
    };
  }

  const newOtp = exports.generateOtp();
  const newExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  return {
    otp: newOtp,
    expiresAt: newExpiry,
    isReused: false
  };
};

// Build UPI e-Mandate URI
exports.buildUpiMandateUri = (vpa, merchantName, maxAmount, cycle = 'MONTHLY') => {
  if (!vpa) return '';
  const cleanVpa = encodeURIComponent(vpa.trim());
  const cleanName = encodeURIComponent(merchantName || 'Merchant');
  const amount = Number(maxAmount) || 10000;
  return `upi://mandate?pa=${cleanVpa}&pn=${cleanName}&mc=0000&tid=&tr=MND${Date.now()}&am=${amount}&mam=100&cu=INR&recur=${cycle}&desc=Khata+Credit+Mandate`;
};
