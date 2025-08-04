// routes/github.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { processGithubEvent } = require('../Handlers/githubHandler');

// GitHub webhook secret for validating requests
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

/**
 * Verify GitHub webhook signature
 * @param {Object} req - Express request object
 * @returns {Boolean} - Whether the signature is valid
 */
function verifyGithubSignature(req) {
  if (!GITHUB_WEBHOOK_SECRET) {
    console.warn('GitHub webhook secret not configured - skipping signature verification');
    return true;
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    console.error('No X-Hub-Signature-256 header in request');
    return false;
  }

  const payload = JSON.stringify(req.body);
  const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// GitHub webhook endpoint
router.post('/webhook', async (req, res) => {
  const eventType = req.headers['x-github-event'];
  const deliveryId = req.headers['x-github-delivery'];
  
  console.log(`Received GitHub ${eventType} event (${deliveryId})`);
  
  // Verify webhook signature
  if (!verifyGithubSignature(req)) {
    console.error('Invalid GitHub webhook signature');
    return res.status(401).json({
      status: 'error',
      message: 'Invalid signature'
    });
  }
  
  try {
    // Process the GitHub event
    const result = await processGithubEvent(req.body, eventType);
    
    // Always return 200 to GitHub to acknowledge receipt
    res.status(200).json({
      status: result.status,
      message: result.message,
      eventType,
      deliveryId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error processing GitHub webhook:`, error);
    
    // Still return 200 to GitHub to prevent retries
    res.status(200).json({
      status: 'error',
      message: 'Webhook received but processing failed',
      error: error.message
    });
  }
});

// Health check endpoint for GitHub integration
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'GitHub integration is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
