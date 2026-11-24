import "./env.js";
import crypto from "node:crypto";
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import axios from "axios";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import { pool, initializeDatabase } from "./db.js";
import {
  issueAuthToken,
  issuePaymentToken,
  loadCurrentUser,
  requireAuth,
  requirePaid,
  requirePaymentSession,
  requireSurvey
} from "./auth.js";
import { initiateHarakaPayment } from "./harakaharaka.js";

const app = express();
const port = Number(process.env.PORT || 5000);
const allowedSpecialties = new Set([
  "Nursing", "Business", "Computer Science", "Law", "Literature", "Engineering", "General"
]);
const allowedCitations = new Set(["APA", "MLA", "Harvard", "Chicago", "IEEE"]);
const phonePattern = /^254(?:7|1)\d{8}$/;

const configuredOrigins = String(process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  ...configuredOrigins
]);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS."));
  }
}));
app.use(express.json({ limit: "100kb" }));
app.use((req, _res, next) => {
  req.body ||= {};
  next();
});
app.use((req, _res, next) => {
  req.db = pool;
  next();
});

function normalizePhone(value) {
  const compact = String(value || "").replace(/[\s()-]/g, "");
  const normalized = /^[71]\d{8}$/.test(compact)
    ? `254${compact}`
    : compact.startsWith("+")
    ? compact.slice(1)
    : compact.startsWith("0")
      ? `254${compact.slice(1)}`
      : compact;
  return phonePattern.test(normalized) ? normalized : null;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function safeUser(user) {
  const { password_hash: _passwordHash, ...safe } = user;
  return safe;
}

function adminOnly(req, res, next) {
  const expected = process.env.ADMIN_SECRET;
  const provided = req.headers["x-admin-secret"];
  if (!expected) return res.status(503).json({ error: "ADMIN_SECRET is not configured on the server." });
  if (typeof provided !== "string") return res.status(401).json({ error: "Admin authorization required." });
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  const matches = expectedBuffer.length === providedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  if (!matches) return res.status(401).json({ error: "Admin authorization required." });
  next();
}

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const email = normalizeEmail(req.body.email);
    const phoneNumber = normalizePhone(req.body.phone);
    const password = String(req.body.password || "");
    if (fullName.length < 2 || fullName.length > 160) {
      return res.status(400).json({ error: "Enter your full name." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    if (!phoneNumber) {
      return res.status(400).json({ error: "Enter a Safaricom number (07…, 01…, or 254…)."} );
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone_number, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, phone_number, payment_status, survey_completed`,
      [fullName, email, phoneNumber, passwordHash]
    );
    const user = result.rows[0];
    res.status(201).json({
      user,
      paymentToken: issuePaymentToken(user.id)
    });
  } catch (error) {
    if (error.code === "23505") {
      const field = error.constraint?.includes("email") ? "email" : "phone number";
      return res.status(409).json({ error: `An account with that ${field} already exists. Please sign in.` });
    }
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const identifier = String(req.body.identifier || "").trim();
    const phone = normalizePhone(identifier);
    const email = normalizeEmail(identifier);
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1 OR ($2::varchar IS NOT NULL AND phone_number = $2)`,
      [email, phone]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(String(req.body.password || ""), user.password_hash))) {
      return res.status(401).json({ error: "Email/phone or password is incorrect." });
    }

    res.json({
      user: safeUser(user),
      ...(user.payment_status === "paid"
        ? { token: issueAuthToken(user.id) }
        : { paymentToken: issuePaymentToken(user.id) })
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", requireAuth, loadCurrentUser, (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/payments/start", requirePaymentSession, loadCurrentUser, async (req, res, next) => {
  try {
    if (req.user.payment_status === "paid") {
      return res.json({ paid: true, token: issueAuthToken(req.user.id) });
    }
    const phoneNumber = normalizePhone(req.body.phone || req.user.phone_number);
    if (!phoneNumber) return res.status(400).json({ error: "Enter a valid Safaricom phone number." });
    if (phoneNumber !== req.user.phone_number) {
      await pool.query("UPDATE users SET phone_number = $1 WHERE id = $2", [phoneNumber, req.user.id]);
      req.user.phone_number = phoneNumber;
    }

    const checkout = await initiateHarakaPayment({
      amount: 80,
      phoneNumber
    });
    await pool.query(
      `INSERT INTO payments (user_id, checkout_request_id, merchant_request_id, amount)
       VALUES ($1, $2, $3, 80)`,
      [req.user.id, checkout.checkoutRequestId, checkout.merchantRequestId || null]
    );
    res.status(202).json({ checkoutRequestId: checkout.checkoutRequestId });
  } catch (error) {
    next(error);
  }
});

app.get("/api/payments/status/:checkoutRequestId", requirePaymentSession, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.status, u.payment_status
       FROM payments p JOIN users u ON u.id = p.user_id
       WHERE p.checkout_request_id = $1 AND p.user_id = $2`,
      [req.params.checkoutRequestId, req.userId]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Payment request not found." });
    const { status, payment_status: paymentStatus } = result.rows[0];
    if (paymentStatus === "paid" && status === "completed") {
      return res.json({ status: "completed", token: issueAuthToken(req.userId) });
    }
    res.json({ status });
  } catch (error) {
    next(error);
  }
});

app.get("/api/payments/account", requirePaymentSession, loadCurrentUser, (req, res) => {
  if (req.user.payment_status === "paid") {
    return res.json({ user: req.user, token: issueAuthToken(req.user.id) });
  }
  res.json({ user: req.user, paymentStatus: "pending" });
});

app.post("/api/payments/callback", async (req, res, next) => {
  const expectedSecret = process.env.LIPAHARAKA_WEBHOOK_SECRET;
  const providedSecret = req.query.secret;
  if (!expectedSecret) {
    return res.status(503).json({ error: "Payment callback authentication is not configured." });
  }
  if (typeof providedSecret !== "string") {
    return res.status(401).json({ error: "Payment callback authorization required." });
  }
  const expectedBuffer = Buffer.from(expectedSecret);
  const providedBuffer = Buffer.from(providedSecret);
  const secretMatches = expectedBuffer.length === providedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  if (!secretMatches) {
    return res.status(401).json({ error: "Payment callback authorization required." });
  }

  const { event, checkout_request_id: checkoutRequestId, status } = req.body;
  if (event !== "payment.updated" || typeof checkoutRequestId !== "string"
    || !checkoutRequestId || !["completed", "failed", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid payment callback." });
  }
  if (status === "completed" && (Number(req.body.amount) !== 80
    || typeof req.body.receipt !== "string" || !req.body.receipt.trim())) {
    return res.status(400).json({ error: "Payment callback does not match the activation amount." });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const paymentResult = await client.query(
      `SELECT id, user_id, amount, status FROM payments
       WHERE checkout_request_id = $1 FOR UPDATE`,
      [checkoutRequestId]
    );
    if (!paymentResult.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Payment request not found." });
    }

    const payment = paymentResult.rows[0];
    if (payment.status !== "pending") {
      await client.query("COMMIT");
      return res.json({ received: true });
    }
    if (status === "completed" && Number(payment.amount) !== Number(req.body.amount)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Payment amount does not match the payment request." });
    }

    const completed = status === "completed";
    await client.query(
      `UPDATE payments SET status = $1, mpesa_receipt_number = $2
       WHERE id = $3 AND status = 'pending'`,
      [completed ? "completed" : "failed", completed ? req.body.receipt.trim() : null, payment.id]
    );
    if (completed) {
      await client.query(
        "UPDATE users SET payment_status = 'paid', mpesa_receipt = $1 WHERE id = $2",
        [req.body.receipt.trim(), payment.user_id]
      );
    }
    await client.query("COMMIT");
    res.json({ received: true });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client?.release();
  }
});

app.get("/api/profile", requireAuth, loadCurrentUser, requirePaid, (req, res) => {
  res.json({ user: req.user });
});

app.put("/api/profile", requireAuth, loadCurrentUser, requirePaid, async (req, res, next) => {
  try {
    const specialties = req.body.specialties;
    const citations = req.body.citationStyles;
    const turnaroundSpeed = String(req.body.turnaroundSpeed || "").trim();
    const bioSample = String(req.body.bioSample || "").trim();
    if (!Array.isArray(specialties) || specialties.length < 1
      || specialties.some((value) => !allowedSpecialties.has(value))) {
      return res.status(400).json({ error: "Select at least one valid subject specialty." });
    }
    if (!Array.isArray(citations) || citations.length < 1
      || citations.some((value) => !allowedCitations.has(value))) {
      return res.status(400).json({ error: "Select at least one valid citation style." });
    }
    if (!turnaroundSpeed || turnaroundSpeed.length > 120) {
      return res.status(400).json({ error: "Choose your turnaround speed." });
    }
    if (bioSample.length < 150 || bioSample.length > 5000) {
      return res.status(400).json({ error: "Your writing sample or bio must be 150–5000 characters." });
    }
    const result = await pool.query(
      `UPDATE users SET specialties = $1, citation_styles = $2, turnaround_speed = $3,
       bio_sample = $4, survey_completed = TRUE
       WHERE id = $5
       RETURNING id, full_name, email, phone_number, payment_status, mpesa_receipt,
       survey_completed, specialties, citation_styles, turnaround_speed, bio_sample`,
      [specialties, citations, turnaroundSpeed, bioSample, req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/gigs", requireAuth, loadCurrentUser, requirePaid, requireSurvey, async (_req, res, next) => {
  try {
    const gigs = await pool.query(
      `SELECT g.*, EXISTS(
         SELECT 1 FROM applications a WHERE a.gig_id = g.id AND a.user_id = $1
       ) AS applied
       FROM gigs g ORDER BY g.created_at DESC`,
      [_req.user.id]
    );
    res.json({ gigs: gigs.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/community", requireAuth, loadCurrentUser, requirePaid, requireSurvey, async (_req, res, next) => {
  try {
    const posts = await pool.query(
      `SELECT p.id, p.content, p.created_at, u.full_name, u.specialties
       FROM community_posts p JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC LIMIT 50`
    );
    res.json({ posts: posts.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/community", requireAuth, loadCurrentUser, requirePaid, requireSurvey, async (req, res, next) => {
  try {
    const content = String(req.body.content || "").trim();
    if (!content || content.length > 500) {
      return res.status(400).json({ error: "Write a post between 1 and 500 characters." });
    }
    const result = await pool.query(
      `INSERT INTO community_posts (user_id, content) VALUES ($1, $2)
       RETURNING id, content, created_at`,
      [req.user.id, content]
    );
    res.status(201).json({
      post: { ...result.rows[0], full_name: req.user.full_name, specialties: req.user.specialties }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/gigs/:gigId/applications", requireAuth, loadCurrentUser, requirePaid, requireSurvey, async (req, res, next) => {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const gigResult = await client.query("SELECT * FROM gigs WHERE id = $1 FOR UPDATE", [req.params.gigId]);
    if (!gigResult.rowCount || gigResult.rows[0].status !== "open") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "This gig is no longer open." });
    }
    const application = await client.query(
      `INSERT INTO applications (user_id, gig_id, applicant_note)
       VALUES ($1, $2, $3) ON CONFLICT (user_id, gig_id) DO NOTHING RETURNING id`,
      [req.user.id, req.params.gigId, String(req.body.note || "").trim().slice(0, 1000)]
    );
    if (!application.rowCount) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "You have already applied for this gig." });
    }
    await client.query("COMMIT");

    let notificationSent = false;
    let notificationError;
    try {
      const endpoint = process.env.FORMSPREE_ENDPOINT;
      if (!endpoint) throw new Error("FORMSPREE_ENDPOINT is not configured.");
      const gig = gigResult.rows[0];
      await axios.post(endpoint, {
        _subject: `New Gig Application: ${gig.title} - ${req.user.full_name}`,
        applicant_name: req.user.full_name,
        applicant_email: req.user.email,
        whatsapp_phone: req.user.phone_number,
        mpesa_receipt: req.user.mpesa_receipt || "",
        specialties: req.user.specialties.join(", "),
        citation_styles: req.user.citation_styles.join(", "),
        writing_sample: req.user.bio_sample,
        job_id: String(gig.id),
        job_title: gig.title,
        job_budget: `KES ${gig.budget_kes}`,
        applicant_note: String(req.body.note || "").trim().slice(0, 1000)
      }, { timeout: 10000 });
      notificationSent = true;
    } catch (error) {
      notificationError = error.response?.data?.error || error.message;
      console.error("Application saved, but Formspree notification failed:", notificationError);
    }
    res.status(201).json({
      applied: true,
      notificationSent,
      ...(notificationSent ? {} : { notificationError: "Your application is saved, but email notification could not be sent." })
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (error.code === "23505") return res.status(409).json({ error: "You have already applied for this gig." });
    next(error);
  } finally {
    client?.release();
  }
});

app.use("/api/admin", adminOnly);

app.get("/api/admin/gigs", async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT g.*, COUNT(a.id)::integer AS applicant_count
       FROM gigs g LEFT JOIN applications a ON a.gig_id = g.id
       GROUP BY g.id ORDER BY g.created_at DESC`
    );
    res.json({ gigs: result.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/gigs", async (req, res, next) => {
  try {
    const fields = ["title", "subject", "citationStyle", "wordCount", "deadline", "description"];
    if (fields.some((key) => !String(req.body[key] || "").trim())) {
      return res.status(400).json({ error: "Complete every gig field." });
    }
    const budget = Number(req.body.budgetKes);
    if (!Number.isSafeInteger(budget) || budget <= 0) {
      return res.status(400).json({ error: "Enter a valid payout in KES." });
    }
    const result = await pool.query(
      `INSERT INTO gigs (title, subject, citation_style, word_count, deadline, budget_kes, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        req.body.title.trim(), req.body.subject.trim(), req.body.citationStyle.trim(),
        req.body.wordCount.trim(), req.body.deadline.trim(), budget, req.body.description.trim()
      ]
    );
    res.status(201).json({ gig: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/gigs/:gigId", async (req, res, next) => {
  try {
    if (!["open", "taken"].includes(req.body.status)) {
      return res.status(400).json({ error: "Status must be open or taken." });
    }
    const result = await pool.query(
      "UPDATE gigs SET status = $1 WHERE id = $2 RETURNING *",
      [req.body.status, req.params.gigId]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Gig not found." });
    res.json({ gig: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/gigs/:gigId/applicants", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.applicant_note, a.created_at, u.full_name, u.email, u.phone_number,
       u.mpesa_receipt, u.specialties, u.citation_styles, u.bio_sample
       FROM applications a JOIN users u ON u.id = a.user_id
       WHERE a.gig_id = $1 ORDER BY a.created_at DESC`,
      [req.params.gigId]
    );
    res.json({ applicants: result.rows });
  } catch (error) {
    next(error);
  }
});

app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found." }));

const currentFile = fileURLToPath(import.meta.url);
const frontendDist = path.resolve(path.dirname(currentFile), "../../frontend/dist");
try {
  await access(path.join(frontendDist, "index.html"));
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => res.sendFile(path.join(frontendDist, "index.html")));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  // The frontend is served by Vite during development.
}

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error.statusCode || 500;
  res.status(status).json({
    error: status === 500 ? "Something went wrong. Please try again." : error.message
  });
});

await initializeDatabase();
app.listen(port, () => console.log(`Writers Hub API listening on http://localhost:${port}`));
