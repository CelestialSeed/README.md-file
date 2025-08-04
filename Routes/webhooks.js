// routes/webhooks.js
const express = require('express');
const router = express.Router();
const { authenticateWebhook } = require('../Middleware/auth');

// Import handlers
const memoryHandler = require('../Handlers/memoryHandler');
const discordHandler = require('../Handlers/discordHandler');
const clickupHandler = require('../Handlers/clickupHandler');
const notionHandler = require('../Handlers/notionHandler');

// Main webhook endpoint
router.post('/make/:scenarioId', authenticateWebhook, (req, res) => {
  const { scenarioId } = req.params;
  const payload = req.body;
  
  console.log(`Received webhook from MAKE.com scenario: ${scenarioId}`);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  // Process based on scenario ID
  try {
    switch(scenarioId) {
      case 'memory-harvest':
        memoryHandler.processMemory(payload);
        break;
      case 'discord-log':
        discordHandler.processLog(payload);
        break;
      case 'clickup-sync':
        clickupHandler.processSync(payload);
        break;
      case 'notion-update':
        notionHandler.processUpdate(payload);
        break;
      default:
        console.warn(`Unknown scenario ID: ${scenarioId}`);
    }
    
    // Always respond with success to acknowledge receipt
    res.status(200).json({
      status: 'success',
      message: 'Webhook received successfully',
      scenarioId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error processing webhook:`, error);
    // Still return 200 to MAKE.com to prevent retries
    res.status(200).json({
      status: 'error',
      message: 'Webhook received but processing failed'
    });
  }
});

module.exports = router;
