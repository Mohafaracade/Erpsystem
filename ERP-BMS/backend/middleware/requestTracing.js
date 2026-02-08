/**
 * ✅ FIX #11: Request Tracing Middleware
 * Adds unique requestId to each request for tracing logs and errors
 */

// Simple UUID generator (no external dependency)
function generateRequestId() {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Add requestId to request object and response headers
 */
function addRequestId(req, res, next) {
  // Generate or use existing request ID
  const requestId = req.headers['x-request-id'] || generateRequestId();
  
  // Attach to request for use in controllers
  req.requestId = requestId;
  
  // Add to response headers for client tracing
  res.setHeader('X-Request-ID', requestId);
  
  next();
}

module.exports = { addRequestId };

