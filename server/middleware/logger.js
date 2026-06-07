const OperationLog = require('../models/OperationLog');

function logMiddleware(action, resource, detailFn) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      const detail = typeof detailFn === 'function' ? detailFn(req, data) : detailFn;
      OperationLog.create({
        userId: req.user?._id,
        username: req.user?.username || 'anonymous',
        action,
        resource,
        detail: detail || `${action} ${resource}`,
        ip: req.ip
      }).catch(() => {});
      return originalJson(data);
    };
    next();
  };
}

module.exports = { logMiddleware };
