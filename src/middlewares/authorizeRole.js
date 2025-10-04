export const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    const { role } = req.user;

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'Forbidden: Access is denied' });
    }

    next();
  };
};
