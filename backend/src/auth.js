import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET is required.");

export function issuePaymentToken(userId) {
  return jwt.sign({ sub: String(userId), type: "payment" }, secret, { expiresIn: "24h" });
}

export function issueAuthToken(userId) {
  return jwt.sign({ sub: String(userId), type: "auth" }, secret, { expiresIn: "7d" });
}

function decodeToken(token) {
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const payload = token ? decodeToken(token) : null;
  if (!payload || payload.type !== "auth") {
    return res.status(401).json({ error: "Please sign in to continue." });
  }
  req.userId = Number(payload.sub);
  next();
}

export function requirePaymentSession(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const payload = token ? decodeToken(token) : null;
  if (!payload || !["payment", "auth"].includes(payload.type)) {
    return res.status(401).json({ error: "Your activation session expired. Please sign in again." });
  }
  req.userId = Number(payload.sub);
  next();
}

export function requirePaid(req, res, next) {
  if (req.user.payment_status !== "paid") {
    return res.status(403).json({ error: "Complete the KES 80 activation payment to continue." });
  }
  next();
}

export function requireSurvey(req, res, next) {
  if (!req.user.survey_completed) {
    return res.status(403).json({ error: "Complete your writer profile before opening the feed." });
  }
  next();
}

export async function loadCurrentUser(req, res, next) {
  try {
    const result = await req.db.query(
      `SELECT id, full_name, email, phone_number, payment_status, mpesa_receipt,
              survey_completed, specialties, citation_styles, turnaround_speed,
              bio_sample, created_at
       FROM users WHERE id = $1`,
      [req.userId]
    );
    if (!result.rowCount) return res.status(401).json({ error: "Account not found." });
    req.user = result.rows[0];
    next();
  } catch (error) {
    next(error);
  }
}
