// Request logging middleware
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  const shouldLog = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) || process.env.NODE_ENV !== 'production';
  
  if (shouldLog) console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (shouldLog) console.log('Headers:', JSON.stringify({
    'Content-Type': req.get('Content-Type'),
    'Authorization': req.get('Authorization') ? 'Bearer ***' : 'None',
    'User-Agent': req.get('User-Agent'),
    'Origin': req.get('Origin'),
    'X-Forwarded-For': req.get('X-Forwarded-For')
  }, null, 2));
  
  if (req.body && Object.keys(req.body).length > 0 && !req.path.includes('avatar')) {
    // Don't log avatar data (too large)
    if (shouldLog) console.log('Body:', JSON.stringify({
      ...req.body,
      ...(req.body.avatar && { avatar: '[DATA URI]' })
    }, null, 2));
  }
  
  // Log response when it finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const contentLength = res.get('Content-Length');
    
    if (shouldLog) console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${contentLength || 0} bytes`);
    
    // Log warnings for slow requests
    if (duration > 1000) {
      console.warn(`⚠️ Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
    
    // Log errors
    if (res.statusCode >= 400) {
      console.error(`❌ Error response: ${res.statusCode} - ${req.method} ${req.path}`);
    }
  });
  
  next();
};

// Request size limiter
export const requestSizeLimiter = (req, res, next) => {
  const contentLength = req.headers['content-length'];
  const maxSize = 15 * 1024 * 1024; // 15MB
  
  if (contentLength && parseInt(contentLength) > maxSize) {
    return res.status(413).json({
      success: false,
      error: 'Request entity too large',
      message: 'Maximum request size is 15MB'
    });
  }
  
  next();
};