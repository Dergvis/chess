const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const international = require('./international.cjs');
const app = express();
international.install(app, express);
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors({ origin: (origin, done) => done(null, !origin || international.origins.has(origin)), credentials: true }));
require('./world-routes.cjs')(app, { express, getCurrentUser, dataDir: path.join(international.dataDir, 'world-data'), recordEvent: (userId, event) => db.recordAnalyticsEvent(userId, event) });
app.use(express.json({ limit: '512kb' }));

// ============================================================
// РљРѕРЅС„РёРіСѓСЂР°С†РёСЏ
// ============================================================
const MODE = international.paymentsEnabled ? (process.env.BILLING_MODE || 'sbp').trim() : 'free';
const BLANC_BASE_URL = 'https://m.blanc.ru/api';
const BLANC_SSO_URL = (process.env.BLANC_SSO_URL || `${BLANC_BASE_URL}/sso`).trim();
const BLANC_SBP_URL = (process.env.BLANC_SBP_URL || `${BLANC_BASE_URL}/sbp-service`).trim();
const BLANC_TOKEN_AUD = (process.env.BLANC_TOKEN_AUD || 'http://localhost/connect/token').trim();
const BLANC_CLIENT_ID = (process.env.BLANC_CLIENT_ID || '').trim();
const BLANC_MERCHANT_ID = (process.env.BLANC_MERCHANT_ID || '').trim();
const BLANC_SCOPE = (process.env.BLANC_SCOPE || 'openapi:sbp openapi:sbp:merchants openapi:sbp:qrcs:c2b openapi:sbp:refunds partners:webhooks').trim();
const WEBHOOK_URL = (process.env.WEBHOOK_URL || 'https://chezzies.ru/api/billing/webhook').trim();
const SUBSCRIPTION_PRICE = 29900; // 299.00 СЂСѓР± РІ РєРѕРїРµР№РєР°С…
const QR_EXPIRATION_MINUTES = Number(process.env.QR_EXPIRATION_MINUTES || 30);
const SUBSCRIPTION_DAYS = 30;
const SESSION_COOKIE = 'chezzies_international_session';
const SESSION_DAYS = 30;
const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || '').trim();
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || 'https://chezzies.app').trim();
const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const TELEGRAM_ALERT_CHAT_IDS = (process.env.TELEGRAM_ALERT_CHAT_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);
const SMTP_HOST = (process.env.SMTP_HOST || '').trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false';
const SMTP_USER = (process.env.SMTP_USER || '').trim();
const SMTP_PASS = (process.env.SMTP_PASS || '').trim();
const MAIL_FROM = (process.env.MAIL_FROM || SMTP_USER || '').trim();
const SMTP_AUTH_METHOD = (process.env.SMTP_AUTH_METHOD || 'login').trim().toLowerCase();

// Р›РѕРіРёСЂСѓРµРј С‚РѕС‡РЅС‹Рµ Р·РЅР°С‡РµРЅРёСЏ РґР»СЏ РѕС‚Р»Р°РґРєРё (Р±РµР· РјР°СЃРєРёСЂРѕРІР°РЅРёСЏ)
console.log('[Config] BILLING_MODE:', JSON.stringify(MODE));
console.log('[Config] BLANC_SSO_URL:', JSON.stringify(BLANC_SSO_URL));
console.log('[Config] BLANC_SBP_URL:', JSON.stringify(BLANC_SBP_URL));
console.log('[Config] BLANC_TOKEN_AUD:', JSON.stringify(BLANC_TOKEN_AUD));
console.log('[Config] BLANC_CLIENT_ID:', JSON.stringify(BLANC_CLIENT_ID), 'len:', BLANC_CLIENT_ID.length);
console.log('[Config] BLANC_MERCHANT_ID:', JSON.stringify(BLANC_MERCHANT_ID), 'len:', BLANC_MERCHANT_ID.length);
console.log('[Config] BLANC_SCOPE:', JSON.stringify(BLANC_SCOPE));
console.log('[Config] SMTP_HOST:', JSON.stringify(SMTP_HOST || null));
console.log('[Config] SMTP_PORT:', SMTP_PORT);
console.log('[Config] SMTP_SECURE:', SMTP_SECURE);
console.log('[Config] SMTP_AUTH_METHOD:', JSON.stringify(SMTP_AUTH_METHOD));
console.log('[Config] SMTP_USER:', SMTP_USER ? `${SMTP_USER.slice(0, 3)}...${SMTP_USER.slice(-10)}` : null);
console.log('[Config] MAIL_FROM:', JSON.stringify(MAIL_FROM || null));

// Р—Р°РіСЂСѓР¶Р°РµРј JWK РїСЂРёРІР°С‚РЅС‹Р№ РєР»СЋС‡
function loadJWKKey() {
  const keyPath = path.join(__dirname, 'clientSecretKey.json');
  if (!fs.existsSync(keyPath)) {
    console.warn('[JWK] clientSecretKey.json not found, JWT assertion will fail');
    return null;
  }
  const jwk = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
  return jwk;
}

const jwkKey = international.paymentsEnabled ? loadJWKKey() : null;

// РљРѕРЅРІРµСЂС‚РёСЂСѓРµРј JWK РІ PEM С„РѕСЂРјР°С‚ РґР»СЏ РїРѕРґРїРёСЃРё JWT
function jwkToPem(jwk) {
  // РЎРѕР±РёСЂР°РµРј ASN.1 DER СЃС‚СЂСѓРєС‚СѓСЂСѓ RSA private key Рё РєРѕРЅРІРµСЂС‚РёСЂСѓРµРј РІ PEM
  // РР»Рё РёСЃРїРѕР»СЊР·СѓРµРј РїСЂРѕСЃС‚РѕР№ СЃРїРѕСЃРѕР±: СЃРѕР±РёСЂР°РµРј РїР°СЂР°РјРµС‚СЂС‹ РІ crypto.createPrivateKey

  // Р”Р»СЏ Node.js crypto.createPrivateKey РїРѕРґРґРµСЂР¶РёРІР°РµС‚ JWK С„РѕСЂРјР°С‚ РЅР°РїСЂСЏРјСѓСЋ
  const key = crypto.createPrivateKey({
    key: jwk,
    format: 'jwk',
  });

  return key.export({ type: 'pkcs8', format: 'pem' });
}

let pemKey = null;
if (jwkKey) {
  pemKey = jwkToPem(jwkKey);
  console.log('[JWK] Private key loaded successfully');
}

// ============================================================
// Р‘Р°Р·Р° РґР°РЅРЅС‹С… SQLite
// ============================================================
const DB_PATH = path.join(international.dataDir, 'chezzies-international.db');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    childName: user.child_name,
    provider: user.provider || 'email',
  };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const parts = String(storedHash || '').split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;

  const [, salt, expectedHash] = parts;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header
      .split(';')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const index = part.indexOf('=');
        if (index === -1) return [part, ''];
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function setSessionCookie(req, res, token) {
  const isSecure = req.headers['x-forwarded-proto'] === 'https' || req.secure || process.env.NODE_ENV === 'production';
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (isSecure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendTelegramAlert(text) {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_ALERT_CHAT_IDS.length === 0) {
    console.log('[Telegram] Not configured. Message:', text);
    return;
  }

  await Promise.allSettled(
    TELEGRAM_ALERT_CHAT_IDS.map(chatId =>
      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      }).then(async response => {
        if (!response.ok) {
          const body = await response.text();
          console.error('[Telegram] sendMessage failed:', response.status, body);
        }
      })
    )
  );
}

function smtpCommand(socket, command, expectedPrefix, logCommand = command) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const safeCommand = logCommand && logCommand.startsWith('AUTH ')
      ? `${logCommand.split(' ').slice(0, 2).join(' ')} [redacted]`
      : logCommand;
    const cleanup = () => {
      socket.off('data', onData);
      socket.off('error', onError);
    };
    const onError = error => {
      cleanup();
      reject(error);
    };
    const onData = chunk => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines[lines.length - 1] || '';
      if (/^\d{3} /.test(last)) {
        cleanup();
        if (String(last).startsWith(expectedPrefix)) {
          resolve(buffer);
        } else {
          const error = new Error(`SMTP command failed: ${safeCommand || 'connect'} -> ${buffer.trim()}`);
          error.code = 'SMTP_COMMAND_FAILED';
          error.response = buffer.trim();
          reject(error);
        }
      }
    };
    socket.on('data', onData);
    socket.on('error', onError);
    if (command) socket.write(`${command}\r\n`);
  });
}

async function smtpAuthenticate(socket) {
  if (SMTP_AUTH_METHOD === 'plain') {
    await smtpCommand(
      socket,
      `AUTH PLAIN ${Buffer.from(`\0${SMTP_USER}\0${SMTP_PASS}`).toString('base64')}`,
      '235',
      'AUTH PLAIN [redacted]'
    );
    return;
  }

  await smtpCommand(socket, 'AUTH LOGIN', '334');
  await smtpCommand(socket, Buffer.from(SMTP_USER).toString('base64'), '334', '[smtp username redacted]');
  await smtpCommand(socket, Buffer.from(SMTP_PASS).toString('base64'), '235', '[smtp password redacted]');
}

async function sendMail({ to, subject, text }) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log('[Mail] SMTP not configured. Reset email:', { to, subject, text });
    return;
  }

  const tls = require('tls');
  const net = require('net');
  let socket = null;
  try {
    console.log('[Mail] Sending password reset email via SMTP:', {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      authMethod: SMTP_AUTH_METHOD,
      user: SMTP_USER ? `${SMTP_USER.slice(0, 3)}...${SMTP_USER.slice(-10)}` : null,
      from: MAIL_FROM,
      to,
    });
    socket = SMTP_SECURE
      ? tls.connect(SMTP_PORT, SMTP_HOST, { servername: SMTP_HOST })
      : net.connect(SMTP_PORT, SMTP_HOST);

    await smtpCommand(socket, null, '220');
    await smtpCommand(socket, `EHLO ${SMTP_HOST}`, '250');
    await smtpAuthenticate(socket);
    await smtpCommand(socket, `MAIL FROM:<${MAIL_FROM}>`, '250');
    await smtpCommand(socket, `RCPT TO:<${to}>`, '250');
    await smtpCommand(socket, 'DATA', '354');
    const dataResponse = smtpCommand(socket, null, '250');
    socket.write([
      `From: Chezzies <${MAIL_FROM}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      '',
      text,
      '.',
      '',
    ].join('\r\n'));
    await dataResponse;
    await smtpCommand(socket, 'QUIT', '221').catch(() => null);
    console.log('[Mail] Password reset email sent:', { to });
  } finally {
    if (socket) socket.end();
  }
}

function logMailError(prefix, error) {
  const details = {
    code: error && error.code ? error.code : null,
    errno: error && error.errno ? error.errno : null,
    syscall: error && error.syscall ? error.syscall : null,
    address: error && error.address ? error.address : null,
    port: error && error.port ? error.port : null,
    response: error && error.response ? error.response : null,
    message: error && error.message ? error.message : String(error),
    smtp: {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      authMethod: SMTP_AUTH_METHOD,
      user: SMTP_USER ? `${SMTP_USER.slice(0, 3)}...${SMTP_USER.slice(-10)}` : null,
      from: MAIL_FROM,
    },
  };

  if (error && Array.isArray(error.errors)) {
    details.errors = error.errors.map(item => ({
      code: item.code || null,
      errno: item.errno || null,
      syscall: item.syscall || null,
      address: item.address || null,
      port: item.port || null,
      message: item.message || String(item),
    }));
  }

  console.error(prefix, JSON.stringify(details, null, 2));
}

function initDB() {
  try {
    const {DatabaseSync: Database} = require('node:sqlite');
    const sqlite = new Database(DB_PATH);

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        child_name TEXT NOT NULL,
        provider TEXT DEFAULT 'email',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS login_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS support_threads (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        guest_id TEXT,
        guest_email TEXT,
        guest_name TEXT,
        status TEXT DEFAULT 'open',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS support_messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (thread_id) REFERENCES support_threads(id)
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_email TEXT NOT NULL,
        user_id TEXT NOT NULL,
        qrc_id TEXT,
        status TEXT DEFAULT 'pending',
        activated_at TEXT,
        expires_at TEXT,
        transaction_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS qrc_cache (
        qrc_id TEXT PRIMARY KEY,
        user_email TEXT NOT NULL,
        expires_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS player_progress (
        user_id TEXT PRIMARY KEY,
        progress_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        event_name TEXT NOT NULL,
        event_type TEXT NOT NULL,
        label TEXT,
        page TEXT,
        metadata_json TEXT,
        device_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    for (const statement of [
      'ALTER TABLE support_threads ADD COLUMN guest_id TEXT',
      'ALTER TABLE support_threads ADD COLUMN guest_email TEXT',
      'ALTER TABLE support_threads ADD COLUMN guest_name TEXT',
      'ALTER TABLE qrc_cache ADD COLUMN created_at TEXT',
      'ALTER TABLE analytics_events ADD COLUMN device_id TEXT',
    ]) {
      try {
        sqlite.prepare(statement).run();
      } catch (e) {
        if (!String(e.message).includes('duplicate column')) {
          console.warn('[DB] support_threads migration warning:', e.message);
        }
      }
    }

    try {
      sqlite.prepare("UPDATE qrc_cache SET created_at = COALESCE(created_at, datetime('now')) WHERE created_at IS NULL").run();
    } catch (e) {
      console.warn('[DB] qrc_cache created_at backfill warning:', e.message);
    }

    console.log('[DB] SQLite initialized:', DB_PATH);
    const db = {
      createUser(data) {
        const now = new Date().toISOString();
        const user = {
          id: 'user_' + crypto.randomUUID(),
          email: normalizeEmail(data.email),
          password_hash: data.password_hash || null,
          child_name: String(data.child_name || '').trim(),
          provider: data.provider || 'email',
          created_at: now,
          updated_at: now,
        };

        sqlite.prepare(`
          INSERT INTO users (
            id, email, password_hash, child_name, provider, created_at, updated_at
          ) VALUES (
            @id, @email, @password_hash, @child_name, @provider, @created_at, @updated_at
          )
        `).run(user);

        return user;
      },
      getUserByEmail(email) {
        return sqlite.prepare('SELECT * FROM users WHERE email = ? LIMIT 1').get(normalizeEmail(email)) || null;
      },
      getUserById(id) {
        return sqlite.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').get(id) || null;
      },
      updateUserPassword(userId, passwordHash) {
        sqlite.prepare(`
          UPDATE users
          SET password_hash = ?, updated_at = ?
          WHERE id = ?
        `).run(passwordHash, new Date().toISOString(), userId);
      },
      createSession(userId) {
        const token = crypto.randomBytes(32).toString('base64url');
        const tokenHash = hashSessionToken(token);
        const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

        sqlite.prepare(`
          INSERT INTO sessions (token_hash, user_id, expires_at)
          VALUES (?, ?, ?)
        `).run(tokenHash, userId, expiresAt);

        return { token, expiresAt };
      },
      getSessionUser(token) {
        const tokenHash = hashSessionToken(token || '');
        const row = sqlite.prepare(`
          SELECT users.*
          FROM sessions
          JOIN users ON users.id = sessions.user_id
          WHERE sessions.token_hash = ?
            AND datetime(sessions.expires_at) > datetime('now')
          LIMIT 1
        `).get(tokenHash);

        return row || null;
      },
      deleteSession(token) {
        const tokenHash = hashSessionToken(token || '');
        sqlite.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
      },
      createPasswordResetToken(userId) {
        const token = crypto.randomBytes(32).toString('base64url');
        const tokenHash = hashSessionToken(token);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        sqlite.prepare(`
          INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
          VALUES (?, ?, ?)
        `).run(tokenHash, userId, expiresAt);
        return { token, expiresAt };
      },
      getPasswordResetToken(token) {
        const tokenHash = hashSessionToken(token || '');
        return sqlite.prepare(`
          SELECT *
          FROM password_reset_tokens
          WHERE token_hash = ?
            AND used_at IS NULL
            AND datetime(expires_at) > datetime('now')
          LIMIT 1
        `).get(tokenHash) || null;
      },
      markPasswordResetTokenUsed(token) {
        const tokenHash = hashSessionToken(token || '');
        sqlite.prepare(`
          UPDATE password_reset_tokens
          SET used_at = ?
          WHERE token_hash = ?
        `).run(new Date().toISOString(), tokenHash);
      },
      recordLogin(userId, eventType = 'login') {
        sqlite.prepare(`
          INSERT INTO login_events (id, user_id, event_type, created_at)
          VALUES (?, ?, ?, ?)
        `).run('login_' + crypto.randomUUID(), userId, eventType, new Date().toISOString());
      },
      recordAnalyticsEvent(userId, event) {
        const row = {
          id: 'event_' + crypto.randomUUID(),
          user_id: userId || null,
          event_name: String(event.eventName || '').trim().slice(0, 120),
          event_type: String(event.eventType || '').trim().slice(0, 80),
          label: String(event.label || '').trim().slice(0, 200),
          page: String(event.page || '').trim().slice(0, 240),
          metadata_json: JSON.stringify(event.metadata || {}),
          device_id: String(event.deviceId || event.metadata?.deviceId || '').trim().slice(0, 120) || null,
          created_at: new Date().toISOString(),
        };

        if (!row.event_name || !row.event_type) return null;

        sqlite.prepare(`
          INSERT INTO analytics_events (
            id, user_id, event_name, event_type, label, page, metadata_json, device_id, created_at
          ) VALUES (
            @id, @user_id, @event_name, @event_type, @label, @page, @metadata_json, @device_id, @created_at
          )
        `).run(row);

        return row;
      },
    getAdminStats(periodInput = 'today') {
        const period = getAdminPeriod(periodInput);
        const userPeriodCondition = period.condition('created_at');
        const loginPeriodCondition = period.condition('created_at');
        const eventPeriodCondition = period.condition('analytics_events.created_at');
        const qrcPeriodCondition = period.condition('created_at');
        const paidPeriodCondition = period.condition('COALESCE(activated_at, updated_at, created_at)');
        const eventBaseCondition = "IFNULL(analytics_events.page, '') NOT LIKE '/admin%'";
        const eventPeriodBaseCondition = `${eventBaseCondition} AND ${eventPeriodCondition}`;
        const devicePresentCondition = "NULLIF(analytics_events.device_id, '') IS NOT NULL";

        const summary = sqlite.prepare(`
          SELECT
            (SELECT COUNT(*) FROM users) AS totalUsers,
            (SELECT COUNT(*) FROM subscriptions WHERE status = 'paid') AS paidSubscriptions,
            (SELECT COUNT(DISTINCT user_email) FROM subscriptions WHERE status = 'paid') AS payingUsers,
            (SELECT COUNT(*) FROM login_events) AS totalLogins,
            (SELECT COUNT(*) FROM login_events WHERE ${loginPeriodCondition}) AS loginsInPeriod,
            (SELECT COUNT(DISTINCT user_id) FROM login_events WHERE ${loginPeriodCondition}) AS uniqueLoginsInPeriod,
            (SELECT COUNT(*) FROM analytics_events WHERE ${eventBaseCondition}) AS totalEvents,
            (SELECT COUNT(*) FROM analytics_events WHERE ${eventPeriodBaseCondition}) AS eventsInPeriod,
            (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE user_id IS NOT NULL AND ${eventPeriodBaseCondition}) AS uniqueActiveInPeriod,
            (SELECT COUNT(DISTINCT analytics_events.device_id) FROM analytics_events WHERE ${eventPeriodBaseCondition} AND ${devicePresentCondition}) AS uniqueDevicesInPeriod,
            (SELECT COUNT(DISTINCT analytics_events.device_id) FROM analytics_events WHERE ${eventPeriodBaseCondition} AND ${devicePresentCondition} AND NOT EXISTS (SELECT 1 FROM analytics_events AS previous_events WHERE previous_events.device_id = analytics_events.device_id AND NULLIF(previous_events.device_id, '') IS NOT NULL AND ${period.beforeCondition('previous_events.created_at')})) AS newDevicesInPeriod,
            (SELECT COUNT(DISTINCT analytics_events.device_id) FROM analytics_events WHERE ${eventPeriodBaseCondition} AND ${devicePresentCondition} AND EXISTS (SELECT 1 FROM analytics_events AS previous_events WHERE previous_events.device_id = analytics_events.device_id AND NULLIF(previous_events.device_id, '') IS NOT NULL AND ${period.beforeCondition('previous_events.created_at')})) AS returningDevicesInPeriod,
            (SELECT COUNT(*) FROM users WHERE ${userPeriodCondition}) AS registrationsInPeriod,
            (SELECT COUNT(*) FROM analytics_events WHERE ${eventBaseCondition} AND (page LIKE '/subscribe%' OR label LIKE '%Оплат%' OR label LIKE '%подпис%')) AS paymentIntentEvents,
            (SELECT COUNT(*) FROM analytics_events WHERE ${eventPeriodBaseCondition} AND (page LIKE '/subscribe%' OR label LIKE '%Оплат%' OR label LIKE '%подпис%')) AS paymentIntentEventsInPeriod,
            (SELECT COUNT(*) FROM qrc_cache) AS qrCreated,
            (SELECT COUNT(*) FROM qrc_cache WHERE ${qrcPeriodCondition}) AS qrCreatedInPeriod,
            (SELECT COUNT(*) FROM subscriptions WHERE status = 'paid' AND ${paidPeriodCondition}) AS paidInPeriod
        `).get();

        const users = sqlite.prepare(`
          SELECT
            users.id,
            users.email,
            users.child_name AS childName,
            users.provider,
            users.created_at AS createdAt,
            COUNT(login_events.id) AS loginCount,
            MAX(login_events.created_at) AS lastLoginAt,
            COUNT(DISTINCT analytics_events.id) AS analyticsEventCount,
            MAX(analytics_events.created_at) AS lastEventAt,
            (
              SELECT event_name
              FROM analytics_events AS latest_events
              WHERE latest_events.user_id = users.id
                AND IFNULL(latest_events.page, '') NOT LIKE '/admin%'
              ORDER BY datetime(latest_events.created_at) DESC
              LIMIT 1
            ) AS lastEventName,
            (
              SELECT label
              FROM analytics_events AS latest_events
              WHERE latest_events.user_id = users.id
                AND IFNULL(latest_events.page, '') NOT LIKE '/admin%'
              ORDER BY datetime(latest_events.created_at) DESC
              LIMIT 1
            ) AS lastEventLabel,
            CASE WHEN paid_subscriptions.id IS NULL THEN 0 ELSE 1 END AS hasPaidSubscription,
            paid_subscriptions.expires_at AS subscriptionExpiresAt,
            paid_subscriptions.activated_at AS subscriptionActivatedAt,
            (
              SELECT COUNT(*)
              FROM subscriptions
              WHERE subscriptions.user_email = users.email
                AND subscriptions.status = 'paid'
            ) AS paymentCount
          FROM users
          LEFT JOIN login_events ON login_events.user_id = users.id
          LEFT JOIN analytics_events
            ON analytics_events.user_id = users.id
            AND IFNULL(analytics_events.page, '') NOT LIKE '/admin%'
          LEFT JOIN subscriptions AS paid_subscriptions
            ON paid_subscriptions.user_email = users.email
            AND paid_subscriptions.status = 'paid'
            AND paid_subscriptions.id = (
              SELECT id
              FROM subscriptions
              WHERE subscriptions.user_email = users.email
                AND subscriptions.status = 'paid'
              ORDER BY datetime(expires_at) DESC
              LIMIT 1
            )
          GROUP BY users.id
          ORDER BY datetime(users.created_at) DESC
          LIMIT 500
        `).all();

        const recentEvents = sqlite.prepare(`
          SELECT
            analytics_events.id,
            analytics_events.event_name AS eventName,
            analytics_events.event_type AS eventType,
            analytics_events.label,
            analytics_events.page,
            analytics_events.created_at AS createdAt,
            users.email,
            users.child_name AS childName
          FROM analytics_events
          LEFT JOIN users ON users.id = analytics_events.user_id
          WHERE IFNULL(analytics_events.page, '') NOT LIKE '/admin%'
            AND ${eventPeriodCondition}
          ORDER BY datetime(analytics_events.created_at) DESC
          LIMIT 100
        `).all();

        const popularEvents = sqlite.prepare(`
          SELECT
            analytics_events.event_type AS eventType,
            analytics_events.label,
            analytics_events.page,
            COUNT(*) AS count
          FROM analytics_events
          WHERE IFNULL(analytics_events.page, '') NOT LIKE '/admin%'
            AND ${eventPeriodCondition}
          GROUP BY analytics_events.event_type, analytics_events.label, analytics_events.page
          ORDER BY count DESC, MAX(datetime(analytics_events.created_at)) DESC
          LIMIT 20
        `).all().map(row => ({
          ...row,
          count: Number(row.count || 0),
        }));
        const funnelSteps = [
          { key: 'start', label: 'Стартовый экран', page: '/' },
          { key: 'home', label: 'Главное меню', page: '/home' },
          { key: 'match', label: 'Выбор соперника', page: '/match' },
          { key: 'game', label: 'Экран игры', page: '/game' },
          { key: 'result', label: 'Результат партии', page: '/result' },
          { key: 'profile', label: 'Профиль', page: '/profile' },
          { key: 'subscribe', label: 'Подписка', page: '/subscribe' },
        ];

        const funnel = funnelSteps.map(step => {
          const row = sqlite.prepare(`
            SELECT
              COUNT(*) AS events,
              COUNT(DISTINCT analytics_events.device_id) AS devices,
              COUNT(DISTINCT analytics_events.user_id) AS accounts
            FROM analytics_events
            WHERE ${eventPeriodBaseCondition}
              AND analytics_events.event_type = 'page_view'
              AND analytics_events.page = ?
          `).get(step.page);

          return {
            ...step,
            events: Number(row.events || 0),
            devices: Number(row.devices || 0),
            accounts: Number(row.accounts || 0),
          };
        });

        const qrFunnelRow = sqlite.prepare(`
          SELECT COUNT(*) AS events
          FROM qrc_cache
          WHERE ${qrcPeriodCondition}
        `).get();
        funnel.push({
          key: 'qr',
          label: 'QR создан',
          page: 'qrc_cache',
          events: Number(qrFunnelRow.events || 0),
          devices: 0,
          accounts: 0,
        });


        return {
          summary: {
            period: period.key,
            periodLabel: period.label,
            totalUsers: Number(summary.totalUsers || 0),
            paidSubscriptions: Number(summary.paidSubscriptions || 0),
            payingUsers: Number(summary.payingUsers || 0),
            totalLogins: Number(summary.totalLogins || 0),
            loginsInPeriod: Number(summary.loginsInPeriod || 0),
            uniqueLoginsInPeriod: Number(summary.uniqueLoginsInPeriod || 0),
            totalEvents: Number(summary.totalEvents || 0),
            eventsInPeriod: Number(summary.eventsInPeriod || 0),
            uniqueActiveInPeriod: Number(summary.uniqueActiveInPeriod || 0),
            uniqueDevicesInPeriod: Number(summary.uniqueDevicesInPeriod || 0),
            newDevicesInPeriod: Number(summary.newDevicesInPeriod || 0),
            returningDevicesInPeriod: Number(summary.returningDevicesInPeriod || 0),
            registrationsInPeriod: Number(summary.registrationsInPeriod || 0),
            paymentIntentEvents: Number(summary.paymentIntentEvents || 0),
            paymentIntentEventsInPeriod: Number(summary.paymentIntentEventsInPeriod || 0),
            qrCreated: Number(summary.qrCreated || 0),
            qrCreatedInPeriod: Number(summary.qrCreatedInPeriod || 0),
            paidInPeriod: Number(summary.paidInPeriod || 0),
          },
          users: users.map(user => ({
            ...user,
            loginCount: Number(user.loginCount || 0),
            analyticsEventCount: Number(user.analyticsEventCount || 0),
            paymentCount: Number(user.paymentCount || 0),
            hasPaidSubscription: Boolean(user.hasPaidSubscription),
          })),
          recentEvents,
          popularEvents,
          funnel,
        };
      },
      getOrCreateSupportThread(identity) {
        const userId = identity.userId || '';
        const guestId = identity.guestId || '';
        const guestEmail = normalizeEmail(identity.guestEmail || '');
        const guestName = String(identity.guestName || '').trim();
        let thread = sqlite.prepare(`
          SELECT *
          FROM support_threads
          WHERE user_id = ?
          ORDER BY datetime(updated_at) DESC
          LIMIT 1
        `).get(userId || `guest:${guestId}`);

        if (!thread && guestId) {
          thread = sqlite.prepare(`
            SELECT *
            FROM support_threads
            WHERE guest_id = ?
            ORDER BY datetime(updated_at) DESC
            LIMIT 1
          `).get(guestId);
        }

        if (!thread) {
          const now = new Date().toISOString();
          thread = {
            id: 'thread_' + crypto.randomUUID(),
            user_id: userId || `guest:${guestId}`,
            guest_id: userId ? null : guestId,
            guest_email: userId ? null : guestEmail,
            guest_name: userId ? null : guestName,
            status: 'open',
            created_at: now,
            updated_at: now,
          };
          sqlite.prepare(`
            INSERT INTO support_threads (
              id, user_id, guest_id, guest_email, guest_name, status, created_at, updated_at
            ) VALUES (
              @id, @user_id, @guest_id, @guest_email, @guest_name, @status, @created_at, @updated_at
            )
          `).run(thread);
        } else if (!userId && guestId && (guestEmail || guestName)) {
          sqlite.prepare(`
            UPDATE support_threads
            SET guest_email = COALESCE(NULLIF(?, ''), guest_email),
                guest_name = COALESCE(NULLIF(?, ''), guest_name)
            WHERE id = ?
          `).run(guestEmail, guestName, thread.id);
        }

        return thread;
      },
      addSupportMessage(threadId, sender, message) {
        const now = new Date().toISOString();
        const row = {
          id: 'msg_' + crypto.randomUUID(),
          thread_id: threadId,
          sender,
          message: String(message || '').trim(),
          created_at: now,
        };
        sqlite.prepare(`
          INSERT INTO support_messages (id, thread_id, sender, message, created_at)
          VALUES (@id, @thread_id, @sender, @message, @created_at)
        `).run(row);
        sqlite.prepare('UPDATE support_threads SET updated_at = ?, status = ? WHERE id = ?').run(now, 'open', threadId);
        return row;
      },
      getSupportMessages(threadId) {
        return sqlite.prepare(`
          SELECT id, thread_id AS threadId, sender, message, created_at AS createdAt
          FROM support_messages
          WHERE thread_id = ?
          ORDER BY datetime(created_at) ASC
        `).all(threadId);
      },
      getSupportThreadById(threadId) {
        return sqlite.prepare('SELECT * FROM support_threads WHERE id = ? LIMIT 1').get(threadId) || null;
      },
      getAdminSupportThreads() {
        const rows = sqlite.prepare(`
          SELECT
            support_threads.id,
            support_threads.status,
            support_threads.created_at AS createdAt,
            support_threads.updated_at AS updatedAt,
            users.email,
            users.child_name AS childName,
            support_threads.guest_email AS guestEmail,
            support_threads.guest_name AS guestName,
            (
              SELECT message
              FROM support_messages
              WHERE support_messages.thread_id = support_threads.id
              ORDER BY datetime(support_messages.created_at) DESC
              LIMIT 1
            ) AS lastMessage
          FROM support_threads
          LEFT JOIN users ON users.id = support_threads.user_id
          ORDER BY datetime(support_threads.updated_at) DESC
          LIMIT 200
        `).all();

        return rows.map(thread => ({
          ...thread,
          messages: this.getSupportMessages(thread.id),
        }));
      },
      getSubscriptionByEmail(email) {
        return sqlite.prepare(`
          SELECT *
          FROM subscriptions
          WHERE user_email = ?
            AND status = 'paid'
            AND datetime(expires_at) > datetime('now')
          ORDER BY datetime(expires_at) DESC
          LIMIT 1
        `).get(email) || null;
      },
      createSubscription(data) {
        const id = 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const now = new Date().toISOString();
        const sub = { ...data, id, created_at: now, updated_at: now };
        sqlite.prepare(`
          INSERT INTO subscriptions (
            id, user_email, user_id, qrc_id, status, activated_at,
            expires_at, transaction_id, created_at, updated_at
          ) VALUES (
            @id, @user_email, @user_id, @qrc_id, @status, @activated_at,
            @expires_at, @transaction_id, @created_at, @updated_at
          )
        `).run({
          id,
          user_email: sub.user_email,
          user_id: sub.user_id || '',
          qrc_id: sub.qrc_id || null,
          status: sub.status || 'pending',
          activated_at: sub.activated_at || null,
          expires_at: sub.expires_at || null,
          transaction_id: sub.transaction_id || null,
          created_at: sub.created_at,
          updated_at: sub.updated_at,
        });
        return sub;
      },
      updateSubscription(id, updates) {
        const current = sqlite.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
        if (!current) return null;
        const next = { ...current, ...updates, updated_at: new Date().toISOString() };
        sqlite.prepare(`
          UPDATE subscriptions
          SET status = @status,
              activated_at = @activated_at,
              expires_at = @expires_at,
              transaction_id = @transaction_id,
              updated_at = @updated_at
          WHERE id = @id
        `).run({
          id,
          status: next.status,
          activated_at: next.activated_at || null,
          expires_at: next.expires_at || null,
          transaction_id: next.transaction_id || null,
          updated_at: next.updated_at,
        });
        return next;
      },
      findByQrcId(qrcId) {
        return sqlite.prepare('SELECT * FROM subscriptions WHERE qrc_id = ? LIMIT 1').get(qrcId) || null;
      },
      cacheQrc(qrcId, userEmail, expiresAt) {
        sqlite.prepare(`
          INSERT OR REPLACE INTO qrc_cache (qrc_id, user_email, expires_at)
          VALUES (?, ?, ?)
        `).run(qrcId, userEmail, expiresAt || null);
      },
      getQrcUser(qrcId) {
        return sqlite.prepare('SELECT * FROM qrc_cache WHERE qrc_id = ? LIMIT 1').get(qrcId) || null;
      },
      getPlayerProgress(userId) {
        const row = sqlite.prepare('SELECT progress_json, updated_at FROM player_progress WHERE user_id = ? LIMIT 1').get(userId);
        if (!row) return null;
        return {
          progress: JSON.parse(row.progress_json),
          updatedAt: row.updated_at,
        };
      },
      savePlayerProgress(userId, progress) {
        const updatedAt = progress.updatedAt || new Date().toISOString();
        const progressJson = JSON.stringify({ ...progress, updatedAt });
        sqlite.prepare(`
          INSERT INTO player_progress (user_id, progress_json, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            progress_json = excluded.progress_json,
            updated_at = excluded.updated_at
        `).run(userId, progressJson, updatedAt);
        return { progress: JSON.parse(progressJson), updatedAt };
      }
    };

    return db;
  } catch (e) {
    console.error('[DB] better-sqlite3 error:', e.message);
    throw new Error('Persistent international database is unavailable: '+e.message);
  }
}

function createInMemoryDB() {
  const store = {
    users: new Map(),
    sessions: new Map(),
    loginEvents: [],
    supportThreads: new Map(),
    supportMessages: new Map(),
    passwordResetTokens: new Map(),
    subscriptions: new Map(),
    qrcCache: new Map(),
    playerProgress: new Map(),
    analyticsEvents: [],

    createUser(data) {
      const now = new Date().toISOString();
      const user = {
        id: 'user_' + crypto.randomUUID(),
        email: normalizeEmail(data.email),
        password_hash: data.password_hash || null,
        child_name: String(data.child_name || '').trim(),
        provider: data.provider || 'email',
        created_at: now,
        updated_at: now,
      };
      this.users.set(user.id, user);
      return user;
    },
    getUserByEmail(email) {
      const normalized = normalizeEmail(email);
      return [...this.users.values()].find(user => user.email === normalized) || null;
    },
    getUserById(id) {
      return this.users.get(id) || null;
    },
    updateUserPassword(userId, passwordHash) {
      const user = this.users.get(userId);
      if (user) {
        user.password_hash = passwordHash;
        user.updated_at = new Date().toISOString();
        this.users.set(userId, user);
      }
    },
    createSession(userId) {
      const token = crypto.randomBytes(32).toString('base64url');
      const tokenHash = hashSessionToken(token);
      const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
      this.sessions.set(tokenHash, { token_hash: tokenHash, user_id: userId, expires_at: expiresAt });
      return { token, expiresAt };
    },
    getSessionUser(token) {
      const session = this.sessions.get(hashSessionToken(token || ''));
      if (!session || new Date(session.expires_at) <= new Date()) return null;
      return this.getUserById(session.user_id);
    },
    deleteSession(token) {
      this.sessions.delete(hashSessionToken(token || ''));
    },
    createPasswordResetToken(userId) {
      const token = crypto.randomBytes(32).toString('base64url');
      const tokenHash = hashSessionToken(token);
      const row = {
        token_hash: tokenHash,
        user_id: userId,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        used_at: null,
        created_at: new Date().toISOString(),
      };
      this.passwordResetTokens.set(tokenHash, row);
      return { token, expiresAt: row.expires_at };
    },
    getPasswordResetToken(token) {
      const row = this.passwordResetTokens.get(hashSessionToken(token || ''));
      if (!row || row.used_at || new Date(row.expires_at) <= new Date()) return null;
      return row;
    },
    markPasswordResetTokenUsed(token) {
      const tokenHash = hashSessionToken(token || '');
      const row = this.passwordResetTokens.get(tokenHash);
      if (row) {
        row.used_at = new Date().toISOString();
        this.passwordResetTokens.set(tokenHash, row);
      }
    },
    recordLogin(userId, eventType = 'login') {
      this.loginEvents.push({
        id: 'login_' + crypto.randomUUID(),
        user_id: userId,
        event_type: eventType,
        created_at: new Date().toISOString(),
      });
    },
    recordAnalyticsEvent(userId, event) {
      if (String(event.page || '').startsWith('/admin')) return null;

      const row = {
        id: 'event_' + crypto.randomUUID(),
        user_id: userId || null,
        event_name: String(event.eventName || '').trim().slice(0, 120),
        event_type: String(event.eventType || '').trim().slice(0, 80),
        label: String(event.label || '').trim().slice(0, 200),
        page: String(event.page || '').trim().slice(0, 240),
        metadata_json: JSON.stringify(event.metadata || {}),
          device_id: String(event.deviceId || event.metadata?.deviceId || '').trim().slice(0, 120) || null,
          created_at: new Date().toISOString(),
      };
      if (!row.event_name || !row.event_type) return null;
      this.analyticsEvents.push(row);
      return row;
    },
    getAdminStats(periodInput = 'today') {
      const period = getAdminPeriod(periodInput);
      const isInPeriod = (value) => {
        if (period.key === 'all') return true;
        const time = new Date(value || 0).getTime();
        if (!Number.isFinite(time)) return false;
        const now = new Date();
        if (period.key === 'today') {
          return new Date(value).toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
        }
        const days = period.key === '7d' ? 7 : 30;
        return time >= now.getTime() - days * 24 * 60 * 60 * 1000;
      };
      const analyticsEvents = this.analyticsEvents.filter(event => !String(event.page || '').startsWith('/admin'));
      const periodAnalyticsEvents = analyticsEvents.filter(event => isInPeriod(event.created_at));
      const deviceIdOf = (event) => String(event.device_id || event.metadata?.deviceId || '').trim();
      const periodDeviceIds = new Set(periodAnalyticsEvents.map(deviceIdOf).filter(Boolean));
      const previousDeviceIds = new Set(analyticsEvents.filter(event => !isInPeriod(event.created_at)).map(deviceIdOf).filter(Boolean));
      const users = [...this.users.values()].map(user => {
        const logins = this.loginEvents.filter(event => event.user_id === user.id);
        const analytics = this.analyticsEvents.filter(event => event.user_id === user.id && !String(event.page || '').startsWith('/admin'));
        const paidSubs = [...this.subscriptions.values()]
          .filter(sub => sub.user_email === user.email && sub.status === 'paid')
          .sort((a, b) => String(b.expires_at || '').localeCompare(String(a.expires_at || '')));
        const latestSub = paidSubs[0] || null;

        return {
          id: user.id,
          email: user.email,
          childName: user.child_name,
          provider: user.provider,
          createdAt: user.created_at,
          loginCount: logins.length,
          lastLoginAt: logins.at(-1)?.created_at || null,
          analyticsEventCount: analytics.length,
          lastEventAt: analytics.at(-1)?.created_at || null,
          lastEventName: analytics.at(-1)?.event_name || null,
          lastEventLabel: analytics.at(-1)?.label || null,
          hasPaidSubscription: Boolean(latestSub),
          subscriptionExpiresAt: latestSub?.expires_at || null,
          subscriptionActivatedAt: latestSub?.activated_at || null,
          paymentCount: paidSubs.length,
        };
      });

      return {
        summary: {
          totalUsers: users.length,
          paidSubscriptions: [...this.subscriptions.values()].filter(sub => sub.status === 'paid').length,
          payingUsers: new Set([...this.subscriptions.values()].filter(sub => sub.status === 'paid').map(sub => sub.user_email)).size,
          totalLogins: this.loginEvents.length,
          period: period.key,
          periodLabel: period.label,
          totalEvents: analyticsEvents.length,
          eventsInPeriod: periodAnalyticsEvents.length,
          registrationsInPeriod: users.filter(user => isInPeriod(user.createdAt || user.created_at)).length,
          loginsInPeriod: this.loginEvents.filter(event => isInPeriod(event.created_at)).length,
          uniqueLoginsInPeriod: new Set(this.loginEvents.filter(event => isInPeriod(event.created_at)).map(event => event.user_id)).size,
          uniqueActiveInPeriod: new Set(periodAnalyticsEvents.filter(event => event.user_id).map(event => event.user_id)).size,
          uniqueDevicesInPeriod: periodDeviceIds.size,
          newDevicesInPeriod: [...periodDeviceIds].filter(deviceId => !previousDeviceIds.has(deviceId)).length,
          returningDevicesInPeriod: [...periodDeviceIds].filter(deviceId => previousDeviceIds.has(deviceId)).length,
          paymentIntentEvents: analyticsEvents.filter(event => (String(event.page || '').startsWith('/subscribe') || /оплат|подпис/i.test(String(event.label || '')))).length,
          paymentIntentEventsInPeriod: periodAnalyticsEvents.filter(event => (String(event.page || '').startsWith('/subscribe') || /оплат|подпис/i.test(String(event.label || '')))).length,
          qrCreated: this.qrcCache.size,
          qrCreatedInPeriod: [...this.qrcCache.values()].filter(row => isInPeriod(row.created_at)).length,
          paidInPeriod: [...this.subscriptions.values()].filter(sub => sub.status === 'paid' && isInPeriod(sub.activated_at || sub.updated_at || sub.created_at)).length,
        },
          users,
          recentEvents: periodAnalyticsEvents
            .slice(-100)
            .reverse()
            .map(event => {
              const user = event.user_id ? this.getUserById(event.user_id) : null;
              return {
                id: event.id,
                eventName: event.event_name,
                eventType: event.event_type,
                label: event.label,
                page: event.page,
                createdAt: event.created_at,
                email: user?.email || '',
                childName: user?.child_name || '',
              };
            }),
          popularEvents: [...periodAnalyticsEvents
            .reduce((map, event) => {
              const key = `${event.event_type}|${event.label}|${event.page}`;
              const current = map.get(key) || {
                eventType: event.event_type,
                label: event.label,
                page: event.page,
                count: 0,
              };
              current.count += 1;
              map.set(key, current);
              return map;
            }, new Map()).values()]
            .sort((a, b) => b.count - a.count)
            .slice(0, 20),
          funnel: [
            { key: 'start', label: 'Стартовый экран', page: '/' },
            { key: 'home', label: 'Главное меню', page: '/home' },
            { key: 'match', label: 'Выбор соперника', page: '/match' },
            { key: 'game', label: 'Экран игры', page: '/game' },
            { key: 'result', label: 'Результат партии', page: '/result' },
            { key: 'profile', label: 'Профиль', page: '/profile' },
            { key: 'subscribe', label: 'Подписка', page: '/subscribe' },
          ].map(step => {
            const stepEvents = periodAnalyticsEvents.filter(event => event.event_type === 'page_view' && event.page === step.page);
            return {
              ...step,
              events: stepEvents.length,
              devices: new Set(stepEvents.map(deviceIdOf).filter(Boolean)).size,
              accounts: new Set(stepEvents.map(event => event.user_id).filter(Boolean)).size,
            };
          }).concat({
            key: 'qr',
            label: 'QR создан',
            page: 'qrc_cache',
            events: [...this.qrcCache.values()].filter(row => isInPeriod(row.created_at)).length,
            devices: 0,
            accounts: 0,
          }),
        };
      },
    getOrCreateSupportThread(identity) {
      const userId = identity.userId || '';
      const guestId = identity.guestId || '';
      const guestEmail = normalizeEmail(identity.guestEmail || '');
      const guestName = String(identity.guestName || '').trim();
      const existing = [...this.supportThreads.values()]
        .filter(thread => thread.user_id === (userId || `guest:${guestId}`) || (guestId && thread.guest_id === guestId))
        .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))[0];
      if (existing) {
        if (!userId) {
          existing.guest_email = guestEmail || existing.guest_email;
          existing.guest_name = guestName || existing.guest_name;
          this.supportThreads.set(existing.id, existing);
        }
        return existing;
      }

      const now = new Date().toISOString();
      const thread = {
        id: 'thread_' + crypto.randomUUID(),
        user_id: userId || `guest:${guestId}`,
        guest_id: userId ? null : guestId,
        guest_email: userId ? null : guestEmail,
        guest_name: userId ? null : guestName,
        status: 'open',
        created_at: now,
        updated_at: now,
      };
      this.supportThreads.set(thread.id, thread);
      return thread;
    },
    addSupportMessage(threadId, sender, message) {
      const now = new Date().toISOString();
      const row = {
        id: 'msg_' + crypto.randomUUID(),
        thread_id: threadId,
        sender,
        message: String(message || '').trim(),
        created_at: now,
      };
      this.supportMessages.set(row.id, row);
      const thread = this.supportThreads.get(threadId);
      if (thread) {
        thread.updated_at = now;
        thread.status = 'open';
        this.supportThreads.set(threadId, thread);
      }
      return row;
    },
    getSupportMessages(threadId) {
      return [...this.supportMessages.values()]
        .filter(message => message.thread_id === threadId)
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
        .map(message => ({
          id: message.id,
          threadId: message.thread_id,
          sender: message.sender,
          message: message.message,
          createdAt: message.created_at,
        }));
    },
    getSupportThreadById(threadId) {
      return this.supportThreads.get(threadId) || null;
    },
    getAdminSupportThreads() {
      return [...this.supportThreads.values()]
        .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
        .slice(0, 200)
        .map(thread => {
          const user = this.getUserById(thread.user_id);
          const messages = this.getSupportMessages(thread.id);
          return {
            id: thread.id,
            status: thread.status,
            createdAt: thread.created_at,
            updatedAt: thread.updated_at,
            email: user?.email || '',
            childName: user?.child_name || '',
            guestEmail: thread.guest_email || '',
            guestName: thread.guest_name || '',
            lastMessage: messages.at(-1)?.message || '',
            messages,
          };
        });
    },
    getSubscriptionByEmail(email) {
      const all = [...this.subscriptions.values()];
      return all.find(s => s.user_email === email && s.status === 'paid' && new Date(s.expires_at) > new Date()) || null;
    },
    createSubscription(data) {
      const id = 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      const sub = { ...data, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      this.subscriptions.set(id, sub);
      return sub;
    },
    updateSubscription(id, updates) {
      const sub = this.subscriptions.get(id);
      if (sub) {
        Object.assign(sub, updates, { updated_at: new Date().toISOString() });
        this.subscriptions.set(id, sub);
      }
      return sub;
    },
    findByQrcId(qrcId) {
      const all = [...this.subscriptions.values()];
      return all.find(s => s.qrc_id === qrcId) || null;
    },
    cacheQrc(qrcId, userEmail, expiresAt) {
      this.qrcCache.set(qrcId, { qrc_id: qrcId, user_email: userEmail, expires_at: expiresAt });
    },
    getQrcUser(qrcId) {
      return this.qrcCache.get(qrcId) || null;
    },
    getPlayerProgress(userId) {
      const row = this.playerProgress.get(userId);
      if (!row) return null;
      return { progress: row.progress, updatedAt: row.updatedAt };
    },
    savePlayerProgress(userId, progress) {
      const updatedAt = progress.updatedAt || new Date().toISOString();
      const row = { progress: { ...progress, updatedAt }, updatedAt };
      this.playerProgress.set(userId, row);
      return row;
    }
  };

  console.log('[DB] In-memory store initialized');
  return store;
}

const db = initDB();

// ============================================================
// Auth API — email/password sessions
// ============================================================
function getSessionToken(req) {
  return parseCookies(req)[SESSION_COOKIE] || '';
}

function getCurrentUser(req) {
  const token = getSessionToken(req);
  if (!token) return null;
  return db.getSessionUser(token);
}

app.post('/api/auth/register', (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const childName = String(req.body.childName || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Use at least 6 characters for your password' });
    }
    if (!childName) {
      return res.status(400).json({ error: 'Enter your child’s name' });
    }
    if (db.getUserByEmail(email)) {
      return res.status(409).json({ error: 'This email is already registered. Sign in or reset your password.' });
    }

    const user = db.createUser({
      email,
      password_hash: hashPassword(password),
      child_name: childName,
      provider: 'email',
    });
    const session = db.createSession(user.id);
    db.recordLogin(user.id, 'register');
    setSessionCookie(req, res, session.token);

    res.status(201).json({ user: publicUser(user) });
  } catch (e) {
    console.error('[auth/register] Error:', e.message);
    res.status(500).json({ error: 'Could not create the account' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const user = db.getUserByEmail(email);

    if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }

    const session = db.createSession(user.id);
    db.recordLogin(user.id, 'login');
    setSessionCookie(req, res, session.token);
    res.json({ user: publicUser(user) });
  } catch (e) {
    console.error('[auth/login] Error:', e.message);
    res.status(500).json({ error: 'Could not sign in' });
  }
});

app.get('/api/auth/me', (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      return res.json({ user: null });
    }
    res.json({ user: publicUser(user) });
  } catch (e) {
    console.error('[auth/me] Error:', e.message);
    res.status(500).json({ error: 'Could not check your session' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  try {
    const token = getSessionToken(req);
    if (token) db.deleteSession(token);
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (e) {
    console.error('[auth/logout] Error:', e.message);
    res.status(500).json({ error: 'Could not sign out' });
  }
});

app.post('/api/analytics/events', (req, res) => {
  try {
    const body = req.body || {};
    const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};
    const metadataEmail = normalizeEmail(metadata.email || '');
    const user = getCurrentUser(req) || (metadataEmail ? db.getUserByEmail(metadataEmail) : null);
    const eventName = String(body.eventName || '').trim();
    const eventType = String(body.eventType || '').trim();
    const page = String(body.page || '').trim();

    if (!eventName || !eventType) {
      return res.status(400).json({ error: 'eventName and eventType are required' });
    }

    if (page === '/admin' || page.startsWith('/admin?') || page.startsWith('/admin/')) {
      return res.json({ ok: true, ignored: true });
    }

    db.recordAnalyticsEvent(user?.id || null, {
      eventName,
      eventType,
      label: body.label,
      page,
      deviceId: metadata.deviceId,
      metadata: {
        ...metadata,
        userAgent: String(req.headers['user-agent'] || '').slice(0, 240),
      },
    });

    res.json({ ok: true });
  } catch (e) {
    console.error('[analytics/events] Error:', e.message);
    res.status(500).json({ error: 'Failed to record analytics event' });
  }
});

app.post('/api/auth/request-password-reset', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }

    const user = db.getUserByEmail(email);
    if (user) {
      const reset = db.createPasswordResetToken(user.id);
      const resetUrl = `${PUBLIC_BASE_URL}/play/reset-password/?token=${encodeURIComponent(reset.token)}`;
      await sendMail({
        to: user.email,
        subject: 'Reset your CHEZZIES password',
        text: [
          `Hello!`,
          '',
          `To set a new CHEZZIES password, open this link:`,
          resetUrl,
          '',
          `This link expires in one hour. If you did not request it, ignore this email.`,
        ].join('\n'),
      });

    }

    res.json({ ok: true });
  } catch (e) {
    logMailError('[auth/request-password-reset] Error:', e);
    res.status(500).json({ error: 'Could not send the email' });
  }
});

app.get('/api/player/progress', (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: '????? ????? ? ???????' });
    }

    const row = db.getPlayerProgress(user.id);
    res.json({ progress: row?.progress || null, updatedAt: row?.updatedAt || null });
  } catch (e) {
    console.error('[player/progress:get] Error:', e.message);
    res.status(500).json({ error: '?? ??????? ????????? ????????' });
  }
});

app.put('/api/player/progress', (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: '????? ????? ? ???????' });
    }

    const progress = req.body.progress;
    if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
      return res.status(400).json({ error: '???????????? ????????' });
    }

    const serialized = JSON.stringify(progress);
    if (serialized.length > 500000) {
      return res.status(413).json({ error: '??????? ??????? ????????' });
    }

    const existing = db.getPlayerProgress(user.id);
    const existingGames = Number(existing?.progress?.stats?.totalGamesPlayed || 0);
    const incomingGames = Number(progress?.stats?.totalGamesPlayed || 0);

    if (existing?.progress && incomingGames > existingGames + 1) {
      console.warn('[player/progress:put] Rejected suspicious progress jump:', {
        user: user.email,
        existingGames,
        incomingGames,
      });
      return res.json({
        ok: true,
        ignored: true,
        reason: 'suspicious_progress_jump',
        progress: existing.progress,
        updatedAt: existing.updatedAt,
      });
    }

    const saved = db.savePlayerProgress(user.id, progress);
    res.json({ ok: true, progress: saved.progress, updatedAt: saved.updatedAt });
  } catch (e) {
    console.error('[player/progress:put] Error:', e.message);
    res.status(500).json({ error: '?? ??????? ????????? ????????' });
  }
});

app.post('/api/auth/reset-password', (req, res) => {
  try {
    const token = String(req.body.token || '').trim();
    const password = String(req.body.password || '');
    if (!token) {
      return res.status(400).json({ error: 'Missing reset token' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Use at least 6 characters for your password' });
    }

    const reset = db.getPasswordResetToken(token);
    if (!reset) {
      return res.status(400).json({ error: 'This link has expired or has already been used' });
    }

    db.updateUserPassword(reset.user_id, hashPassword(password));
    db.markPasswordResetTokenUsed(token);
    res.json({ ok: true });
  } catch (e) {
    console.error('[auth/reset-password] Error:', e.message);
    res.status(500).json({ error: 'Could not update the password' });
  }
});

app.get('/api/support/my', (req, res) => {
  try {
    const user = getCurrentUser(req);
    const guestId = String(req.query.guestId || '').trim();

    if (!user && !guestId) {
      return res.status(400).json({ error: 'Нужен guestId или вход в аккаунт' });
    }

    const thread = db.getOrCreateSupportThread({
      userId: user?.id || '',
      guestId,
      guestEmail: req.query.guestEmail || '',
      guestName: req.query.guestName || '',
    });
    res.json({
      threadId: thread.id,
      messages: db.getSupportMessages(thread.id),
    });
  } catch (e) {
    console.error('[support/my] Error:', e.message);
    res.status(500).json({ error: 'Не удалось загрузить чат' });
  }
});

app.post('/api/support/messages', (req, res) => {
  try {
    const user = getCurrentUser(req);
    const guestId = String(req.body.guestId || '').trim();
    const guestEmail = normalizeEmail(req.body.guestEmail || '');
    const guestName = String(req.body.guestName || '').trim();

    if (!user && !guestId) {
      return res.status(400).json({ error: 'Нужен guestId или вход в аккаунт' });
    }
    if (!user && !guestEmail) {
      return res.status(400).json({ error: 'Введите email для ответа' });
    }

    const message = String(req.body.message || '').trim();
    if (!message) {
      return res.status(400).json({ error: 'Сообщение пустое' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Сообщение слишком длинное' });
    }

    const thread = db.getOrCreateSupportThread({
      userId: user?.id || '',
      guestId,
      guestEmail,
      guestName,
    });
    const saved = db.addSupportMessage(thread.id, 'user', message);
    const displayName = user?.child_name || guestName || guestEmail || 'Гость';
    const displayEmail = user?.email || guestEmail || 'без email';
    sendTelegramAlert([
      '<b>Новое обращение Chezzies</b>',
      `От: ${escapeHtml(displayName)} (${escapeHtml(displayEmail)})`,
      '',
      escapeHtml(message),
      '',
      `${PUBLIC_BASE_URL}/admin`,
    ].join('\n')).catch(err => console.error('[Telegram] alert error:', err.message));
    res.status(201).json({
      message: {
        id: saved.id,
        threadId: saved.thread_id,
        sender: saved.sender,
        message: saved.message,
        createdAt: saved.created_at,
      },
    });
  } catch (e) {
    console.error('[support/messages] Error:', e.message);
    res.status(500).json({ error: 'Не удалось отправить сообщение' });
  }
});

function getAdminPeriod(periodInput) {
  const period = String(periodInput || 'today').trim();
  const config = {
    today: {
      key: 'today',
      label: 'Сегодня',
      condition: (column) => `date(${column}) = date('now')`,
      beforeCondition: (column) => `date(${column}) < date('now')`,
    },
    '7d': {
      key: '7d',
      label: 'Последние 7 дней',
      condition: (column) => `datetime(${column}) >= datetime('now', '-7 days')`,
      beforeCondition: (column) => `datetime(${column}) < datetime('now', '-7 days')`,
    },
    '30d': {
      key: '30d',
      label: 'Последние 30 дней',
      condition: (column) => `datetime(${column}) >= datetime('now', '-30 days')`,
      beforeCondition: (column) => `datetime(${column}) < datetime('now', '-30 days')`,
    },
    all: {
      key: 'all',
      label: 'Все время',
      condition: () => '1 = 1',
      beforeCondition: () => '0 = 1',
    },
  };

  return config[period] || config.today;
}
function isAdminRequest(req) {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const headerToken = String(req.headers['x-admin-token'] || '').trim();
  const queryToken = String(req.query.token || '').trim();
  const token = bearerToken || headerToken || queryToken;
  if (!ADMIN_TOKEN || !token) return false;
  const provided = Buffer.from(token);
  const expected = Buffer.from(ADMIN_TOKEN);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

app.get('/api/admin/stats', (req, res) => {
  try {
    if (!ADMIN_TOKEN) {
      return res.status(503).json({ error: 'ADMIN_TOKEN is not configured' });
    }
    if (!isAdminRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.json(db.getAdminStats(req.query.period));
  } catch (e) {
    console.error('[admin/stats] Error:', e.message);
    res.status(500).json({ error: 'Failed to load admin stats' });
  }
});

app.get('/api/admin/support', (req, res) => {
  try {
    if (!ADMIN_TOKEN) {
      return res.status(503).json({ error: 'ADMIN_TOKEN is not configured' });
    }
    if (!isAdminRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.json({ threads: db.getAdminSupportThreads() });
  } catch (e) {
    console.error('[admin/support] Error:', e.message);
    res.status(500).json({ error: 'Failed to load support threads' });
  }
});

app.get('/api/admin/telegram-health', (req, res) => {
  try {
    if (!ADMIN_TOKEN) {
      return res.status(503).json({ error: 'ADMIN_TOKEN is not configured' });
    }
    if (!isAdminRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.json({
      botConfigured: Boolean(TELEGRAM_BOT_TOKEN),
      chatIds: TELEGRAM_ALERT_CHAT_IDS,
      chatIdsCount: TELEGRAM_ALERT_CHAT_IDS.length,
    });
  } catch (e) {
    console.error('[admin/telegram-health] Error:', e.message);
    res.status(500).json({ error: 'Failed to check Telegram config' });
  }
});

app.post('/api/admin/support/:threadId/messages', (req, res) => {
  try {
    if (!ADMIN_TOKEN) {
      return res.status(503).json({ error: 'ADMIN_TOKEN is not configured' });
    }
    if (!isAdminRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const thread = db.getSupportThreadById(req.params.threadId);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const message = String(req.body.message || '').trim();
    if (!message) {
      return res.status(400).json({ error: 'Message is empty' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message is too long' });
    }

    const saved = db.addSupportMessage(thread.id, 'admin', message);
    res.status(201).json({
      message: {
        id: saved.id,
        threadId: saved.thread_id,
        sender: saved.sender,
        message: saved.message,
        createdAt: saved.created_at,
      },
    });
  } catch (e) {
    console.error('[admin/support/reply] Error:', e.message);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// ============================================================
// Blanc API вЂ” OAuth 2.0 JWT assertion
// ============================================================
let accessToken = null;
let tokenExpiresAt = null;

function createJWTAssertion() {
  if (!pemKey) {
    throw new Error('No private key loaded');
  }

  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID().replace(/-/g, '');
  const header = { alg: 'RS256', typ: 'JWT', kid: jwkKey.kid };
  const payload = {
    iss: BLANC_CLIENT_ID,
    sub: BLANC_CLIENT_ID,
    aud: BLANC_TOKEN_AUD,
    iat: now,
    exp: now + 3600, // 1 С‡Р°СЃ (С‚СЂРµР±РѕРІР°РЅРёРµ Blanc)
    jti: jti, // Unique JWT ID (С‚СЂРµР±РѕРІР°РЅРёРµ Blanc)
  };

  // Р СѓС‡РЅРѕРµ СЃРѕР·РґР°РЅРёРµ JWT СЃ RS256 РїРѕРґРїРёСЃСЊСЋ
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${headerB64}.${payloadB64}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(pemKey);

  return `${signingInput}.${signature.toString('base64url')}`;
}

async function getBlancToken() {
  if (accessToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  const assertion = createJWTAssertion();

  // Р›РѕРіРёСЂСѓРµРј JWT header Рё payload РґР»СЏ РїСЂРѕРІРµСЂРєРё
  const jwtParts = assertion.split('.');
  const decodedHeader = JSON.parse(Buffer.from(jwtParts[0], 'base64url').toString());
  const decodedPayload = JSON.parse(Buffer.from(jwtParts[1], 'base64url').toString());
  console.log('[Blanc] JWT header:', JSON.stringify(decodedHeader));
  console.log('[Blanc] JWT payload iss:', decodedPayload.iss);
  console.log('[Blanc] JWT payload aud:', decodedPayload.aud);
  console.log('[Blanc] JWT payload sub:', decodedPayload.sub);

  const bodyParams = new URLSearchParams({
    grant_type: 'client_credentials',
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: assertion,
    scope: BLANC_SCOPE,
  });

  console.log('[Blanc] Token request body (decoded):', bodyParams.toString().slice(0, 100) + '...');
  console.log('[Blanc] Token URL:', `${BLANC_SSO_URL}/connect/token`);

  const response = await fetch(`${BLANC_SSO_URL}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bodyParams,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Blanc token error: ${response.status} ${text}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;

  console.log('[Blanc] Token obtained, expires in:', data.expires_in, 's');
  return accessToken;
}

async function blancRequest(method, endpoint, body = null) {
  const token = await getBlancToken();

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BLANC_SBP_URL}${endpoint}`, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Blanc API error: ${response.status} ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// ============================================================
// Webhook РїРѕРґРїРёСЃРєР°
// ============================================================
async function subscribeToWebhooks() {
  if (MODE !== 'sbp') {
    console.log('[Webhook] Skipping вЂ” mock mode');
    return;
  }

  try {
    // РџРѕ РґРѕРєСѓРјРµРЅС‚Р°С†РёРё Blanc: topic, objectId, url, secret
    // topic: SbpC2BPayment (РЅРµ "C2BPayment"!)
    const webhookBody = {
      topic: 'SbpC2BPayment',
      objectId: BLANC_MERCHANT_ID,
      url: WEBHOOK_URL,
      secret: '', // РњРѕР¶РЅРѕ РґРѕР±Р°РІРёС‚СЊ РґР»СЏ РІРµСЂРёС„РёРєР°С†РёРё РІРµР±С…СѓРєРѕРІ
    };

    console.log('[Webhook] Subscribing with body:', JSON.stringify(webhookBody));

    await blancRequest('POST', '/gateway-webhook-service/v1/subscriptions', webhookBody);
    console.log('[Webhook] вњ… Subscribed to SbpC2BPayment в†’', WEBHOOK_URL);
  } catch (e) {
    console.error('[Webhook] Failed to subscribe:', e.message);
    console.log('[Webhook] РЎРѕР·РґР°Р№С‚Рµ РїРѕРґРїРёСЃРєСѓ С‡РµСЂРµР· Blanc admin panel РёР»Рё РІСЂСѓС‡РЅСѓСЋ');
  }
}

// ============================================================
// API Endpoints
// ============================================================

// POST /api/billing/create-checkout вЂ” СЃРѕР·РґР°С‘С‚ Dynamic QR РґР»СЏ РѕРїР»Р°С‚С‹
app.post('/api/billing/create-checkout', async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Чтобы оплатить подписку, сначала войдите или зарегистрируйтесь.' });
    }

    console.log('[create-checkout] User:', email, 'Mode:', MODE);

    // Р’СЃРµРіРґР° СЃРѕР·РґР°С‘Рј СЂРµР°Р»СЊРЅС‹Р№ QR С‡РµСЂРµР· Blanc API
    // РџРѕ РґРѕРєСѓРјРµРЅС‚Р°С†РёРё: merchantId, type, amount, purpose, expiration вЂ” РѕР±СЏР·Р°С‚РµР»СЊРЅС‹Рµ
    const response = await blancRequest('POST', '/openapi/v1/qrcs', {
      amount: SUBSCRIPTION_PRICE,
      expiration: QR_EXPIRATION_MINUTES,
      merchantId: BLANC_MERCHANT_ID,
      type: 'dynamic',
      purpose: 'Chezzies subscription 30 days',
    });

    // Blanc РІРѕР·РІСЂР°С‰Р°РµС‚ {data: {id, payload, ...}}
    const qrcData = response.data || response;
    const qrcId = qrcData.id;

    // РљСЌС€РёСЂСѓРµРј СЃРІСЏР·СЊ QR в†’ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ
    // expiration РІ РѕС‚РІРµС‚Рµ вЂ” СЌС‚Рѕ duration РІ СЃРµРєСѓРЅРґР°С… (1800 = 30 РјРёРЅ)
    const expiresAt = new Date(Date.now() + (qrcData.expiration || 1800) * 1000).toISOString();
    db.cacheQrc(qrcId, email, expiresAt);

    // РЎРѕР·РґР°С‘Рј Р·Р°РїРёСЃСЊ РїРѕРґРїРёСЃРєРё РІ СЃС‚Р°С‚СѓСЃРµ pending
    const sub = db.createSubscription({
      user_email: email,
      user_id: userId || '',
      qrc_id: qrcId,
      status: 'pending',
    });

    const qrImageUrl = `${BLANC_SBP_URL}/openapi/v1/qrcs/${qrcId}/image?format=image/png&size=200`;

    console.log('[create-checkout] QR created:', qrcId, 'for', email, 'payload:', qrcData.payload);

    res.status(201).json({
      qrcId,
      qrPayload: qrcData.payload,
      qrImageUrl,
      expiresAt,
      mock: false,
    });
  } catch (e) {
    console.error('[create-checkout] Error:', e.message);
    res.status(500).json({ error: 'Failed to create checkout', details: e.message });
  }
});

// GET /api/billing/payment-status вЂ” РїРѕР»Р»РёРЅРі СЃС‚Р°С‚СѓСЃР° QR
app.get('/api/billing/payment-status', async (req, res) => {
  try {
    const { qrcId } = req.query;

    if (!qrcId) {
      return res.status(400).json({ error: 'qrcId is required' });
    }

    // Р—Р°РїСЂР°С€РёРІР°РµРј СЃС‚Р°С‚СѓСЃ QR Сѓ Blanc
    const response = await blancRequest('GET', `/openapi/v1/qrcs/${qrcId}/status`);

    // Blanc РІРѕР·РІСЂР°С‰Р°РµС‚ {data: {paymentInfo: {status, transactionId}}}
    const qrData = response.data || response;
    const paymentInfo = qrData.paymentInfo || {};
    const status = paymentInfo.status || 'NotStarted';
    const transactionId = paymentInfo.transactionId || '';

    console.log('[payment-status] qrcId:', qrcId, 'status:', status);

    let expiresAt = null;

    // Р•СЃР»Рё Executed вЂ” Р°РєС‚РёРІРёСЂСѓРµРј РїРѕРґРїРёСЃРєСѓ
    if (status === 'Executed') {
      const sub = db.findByQrcId(qrcId);
      if (sub && sub.status === 'pending') {
        expiresAt = new Date(Date.now() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
        db.updateSubscription(sub.id, {
          status: 'paid',
          activated_at: new Date().toISOString(),
          expires_at: expiresAt,
          transaction_id: transactionId,
        });
        console.log('[payment-status] вњ… Subscription activated for:', sub.user_email);
      } else if (sub && sub.expires_at) {
        expiresAt = sub.expires_at;
      }
    }

    res.json({
      status,
      expiresAt,
    });
  } catch (e) {
    console.error('[payment-status] Error:', e.message);
    res.status(500).json({ error: 'Failed to get status', details: e.message });
  }
});

// POST /api/billing/webhook вЂ” РІРµР±С…СѓРє РѕС‚ Blanc
app.post('/api/billing/webhook', (req, res) => {
  try {
    const body = req.body;
    console.log('[webhook] Received:', JSON.stringify(body).slice(0, 300));

    const { eventType, data } = body;

    if (eventType === 'SbpC2BPayment' && data?.status === 'Executed') {
      const qrcId = data.qrcId;
      const transactionId = data.transactionId;

      const sub = db.findByQrcId(qrcId);

      if (sub) {
        db.updateSubscription(sub.id, {
          status: 'paid',
          activated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
          transaction_id: transactionId,
        });

        console.log('[webhook] вњ… Subscription activated for:', sub.user_email, 'expires:', sub.expires_at);
      } else {
        console.warn('[webhook] вљ пёЏ No subscription found for qrcId:', qrcId);
      }
    } else if (eventType === 'SbpRefundPayment') {
      console.log('[webhook] Refund received:', data?.transactionId);
    }

    res.status(200).send('OK');
  } catch (e) {
    console.error('[webhook] Error:', e.message);
    res.status(500).send('Error');
  }
});

// POST /api/billing/verify-subscription вЂ” РїСЂРѕРІРµСЂРєР° РїРѕРґРїРёСЃРєРё
app.post('/api/billing/verify-subscription', (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.json({ hasSubscription: false, expiresAt: null });
    }

    const sub = db.getSubscriptionByEmail(email);

    if (sub) {
      res.json({
        hasSubscription: true,
        expiresAt: sub.expires_at,
      });
    } else {
      res.json({
        hasSubscription: false,
        expiresAt: null,
      });
    }
  } catch (e) {
    console.error('[verify-subscription] Error:', e.message);
    res.status(500).json({ error: 'Failed to verify subscription' });
  }
});

// GET /api/billing/health вЂ” РїСЂРѕРІРµСЂРєР° Р·РґРѕСЂРѕРІСЊСЏ
if (international.paymentsEnabled) require('./promo-routes')(app);

app.get('/api/billing/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: MODE,
    clientId: BLANC_CLIENT_ID ? BLANC_CLIENT_ID.slice(0, 20) + '...' : 'not configured',
    merchantId: BLANC_MERCHANT_ID || 'not configured',
    jwkLoaded: !!jwkKey,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// Р—Р°РїСѓСЃРє
// ============================================================
app.listen(PORT, () => {
  console.log(`[Server] Chezzies API running on port ${PORT}`);
  console.log(`[Server] Mode: ${MODE}`);
  console.log(`[Server] JWK loaded: ${!!jwkKey}`);
  console.log(`[Server] Health: http://localhost:${PORT}/api/health`);

  // РџРѕРґРїРёСЃС‹РІР°РµРјСЃСЏ РЅР° РІРµР±С…СѓРєРё (С‚РѕР»СЊРєРѕ РІ sbp СЂРµР¶РёРјРµ)
  if (international.paymentsEnabled) setTimeout(() => subscribeToWebhooks(), 3000);
});








