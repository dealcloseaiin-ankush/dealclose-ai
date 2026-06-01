module.exports = function (ws) {
  let streamSid = null;

  // Yahan Deepgram aur Elevenlabs ka Real-time logic connect hoga.
  // Filhal ye Twilio ki raw audio catch karega bina error diye.

  ws.on('message', (message) => {
    const msg = JSON.parse(message);

    if (msg.event === 'start') {
      streamSid = msg.start.streamSid;
      console.log(`📞 [Twilio Stream] Live Call Started! Stream SID: ${streamSid}`);
      
      // Yahan hum call start hote hi pehla message bol sakte hain: "Hello, How can I help you?"

    } else if (msg.event === 'media') {
      // Customer ki aawaz milliseconds me yahan aa rahi hai (Base64 mulaw format me)
      const audioPayload = msg.media.payload;
      
      // 🚀 NEXT: deepgramSocket.send(Buffer.from(audioPayload, 'base64'));
      
    } else if (msg.event === 'stop') {
      console.log(`🛑 [Twilio Stream] Call Ended. Stream SID: ${streamSid}`);
    }
  });

  ws.on('close', () => {
    console.log('🔌 [WebSocket] Twilio Stream Connection Closed');
  });

  // Call par AI ki aawaz wapas bhejne ka Helper Function
  function sendAudioToTwilio(base64Audio) {
    const payload = {
      event: 'media',
      streamSid: streamSid,
      media: { payload: base64Audio }
    };
    if (ws.readyState === 1) ws.send(JSON.stringify(payload));
  }
};