// middleware/auth.js
function authenticateWebhook(req, res, next) {
  const authToken = req.headers['x-webhook-token'];
  
  // Check if token exists
  if (!authToken) {
    return res.status(401).json({ 
      status: 'error',
      message: 'Authentication token missing' 
    });
  }
  
  // Verify the token
  if (authToken !== process.env.MAKE_WEBHOOK_SECRET) {
    return res.status(403).json({ 
      status: 'error',
      message: 'Invalid authentication token' 
    });
  }
  
  // Authentication successful
  next();
}

module.exports = { authenticateWebhook };
