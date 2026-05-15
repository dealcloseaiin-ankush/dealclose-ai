const Flow = require('../models/flowModel');
const whatsappService = require('../services/whatsappService');

// @desc    Handle incoming messages from Meta Webhook
// @route   POST /api/webhook
exports.receiveMessage = async (req, res) => {
  try {
    const body = req.body;

    // Meta validation check
    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message && message.type === 'text') {
      const senderPhone = message.from;
      const textBody = message.text.body.toLowerCase();
      const phoneNumberId = value.metadata.phone_number_id;

      console.log(`Received message from ${senderPhone}: ${textBody}`);

      // Engine Logic: Find active Flow in DB
      const activeFlow = await Flow.findOne({ isActive: true });

      if (activeFlow && activeFlow.flowData) {
        const nodes = activeFlow.flowData.nodes || [];
        const edges = activeFlow.flowData.edges || [];

        // Find trigger node
        const triggerNode = nodes.find(n => n.type === 'trigger');
        
        // Check if user said "hi" or keyword matches
        if (triggerNode && (textBody === 'hi' || textBody === 'hello')) {
          const nextEdge = edges.find(e => e.source === triggerNode.id);
          if (nextEdge) {
            const messageNode = nodes.find(n => n.id === nextEdge.target);
            
            if (messageNode && messageNode.type === 'message') {
              // Sending the reply using WhatsApp Service
              const replyText = "Hello! This is an automated reply from DealClose AI."; 
              console.log("Flow Engine Triggered: Sending Reply...", replyText);
              
              // In production: await whatsappService.sendTextMessage(process.env.META_TOKEN, phoneNumberId, senderPhone, replyText);
            }
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook Error:', error);
    res.sendStatus(500);
  }
};