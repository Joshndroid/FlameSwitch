const buckets = new Map();

const getClientIP = (req) => req.ip || req.socket.remoteAddress || 'unknown';

const rateLimit = ({ windowMs, max, message }) => (req, res, next) => {
  const now = Date.now();
  const key = `${req.baseUrl}:${getClientIP(req)}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10000) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
    }
    return next();
  }

  current.count += 1;
  if (current.count > max) {
    res.set('Retry-After', Math.ceil((current.resetAt - now) / 1000));
    return res.status(429).json({ success: false, error: message });
  }

  next();
};

module.exports = rateLimit;
