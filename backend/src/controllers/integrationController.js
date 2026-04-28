const User = require('../models/userModel');
const Lead = require('../models/leadModel');
// const whatsappService = require('../services/whatsappService');
const { automationQueue } = require('../workers/automationWorker');

// @desc    Handle Universal Tracking Pixel (For Custom, WordPress, Mini-sites)
// @route   POST /api/integrations/pixel/track
exports.handleUniversalPixel = async (req, res) => {
  try {
    const { userId, event, customerData, pageUrl } = req.body;
    
    // Validate User
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Invalid Pixel ID' });

    console.log(`[Pixel Tracked] Event: ${event} on ${pageUrl}`);

    if (event === 'form_submit' || event === 'add_to_cart') {
      // Save Lead in DB
      const lead = await Lead.create({
        userId,
        name: customerData.name || 'Anonymous',
        phone: customerData.phone,
        source: pageUrl,
        status: 'pending'
      });

      // AUTOMATION TRIGGER: Queue Job with 15 mins (900,000 ms) delay
      await automationQueue.add('abandoned_cart_reminder', {
        phone: customerData.phone,
        customerName: customerData.name || 'there',
        userId: userId
      }, { delay: 15 * 60 * 1000 });
      console.log(`🤖 [Automation Queued] 15-min countdown started for ${customerData.phone}`);
    }

    res.status(200).json({ success: true, message: 'Event tracked successfully' });
  } catch (error) {
    console.error('Pixel Error:', error);
    res.status(500).json({ message: 'Tracking failed' });
  }
};

// @desc    Handle Shopify Webhooks (Abandoned Cart)
// @route   POST /api/integrations/shopify/webhook
exports.handleShopifyWebhook = async (req, res) => {
  try {
    const eventType = req.headers['x-shopify-topic']; // e.g., 'checkouts/create'
    const shopDomain = req.headers['x-shopify-shop-domain'];
    const data = req.body;

    console.log(`[Shopify Webhook] Event: ${eventType} from ${shopDomain}`);

    if (eventType === 'checkouts/create' && data.customer && data.customer.phone) {
      // Find user by their shopify domain
      const user = await User.findOne({ shopifyDomain: shopDomain });
      if (user) {
        console.log(`🛒 [Abandoned Cart Tracked] Customer: ${data.customer.phone}`);
        // Queue Job with 15 mins delay
        await automationQueue.add('abandoned_cart_reminder', {
          phone: data.customer.phone,
          customerName: data.customer.first_name || 'there',
          userId: user._id
        }, { delay: 15 * 60 * 1000 });
      }
    }

    // Always return 200 OK to Shopify quickly so they don't resend
    res.status(200).send('Webhook received');
  } catch (error) {
    console.error('Shopify Webhook Error:', error);
    res.status(500).send('Server Error');
  }
};