module.exports = function promoRoutes(app) {
  // PROMO_CODES_PATCH_V1
  const promoDbPath = process.env.DB_PATH || '/home/app/chezzies-api/chezzies.db';
  let promoSqlite = null;

  try {
    const PromoDatabase = require('better-sqlite3');
    promoSqlite = new PromoDatabase(promoDbPath);
    promoSqlite.pragma('foreign_keys = ON');
    promoSqlite.exec(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        duration_days INTEGER NOT NULL DEFAULT 30,
        max_uses INTEGER,
        used_count INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        note TEXT,
        expires_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS promo_redemptions (
        id TEXT PRIMARY KEY,
        promo_code TEXT NOT NULL,
        user_email TEXT NOT NULL,
        user_id TEXT NOT NULL,
        subscription_id TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(promo_code, user_email)
      );
    `);
    console.log('[Promo] Tables initialized:', promoDbPath);
  } catch (e) {
    console.error('[Promo] Failed to initialize promo tables:', e.message);
  }

  function requirePromoAdmin(req, res, next) {
    const token = (process.env.ADMIN_TOKEN || '').trim();
    const header = req.headers.authorization || '';
    if (!token || header !== `Bearer ${token}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  }

  function normalizePromoCode(code) {
    return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
  }

  function addDaysIso(baseDate, days) {
    return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  function getActivePaidSubscriptionByEmail(email) {
    return promoSqlite.prepare(`
      SELECT *
      FROM subscriptions
      WHERE lower(user_email) = lower(?)
        AND status = 'paid'
        AND datetime(expires_at) > datetime('now')
      ORDER BY datetime(expires_at) DESC
      LIMIT 1
    `).get(email) || null;
  }

  app.post('/api/admin/promo-codes', requirePromoAdmin, (req, res) => {
    try {
      if (!promoSqlite) {
        return res.status(500).json({ error: 'Promo DB is not initialized' });
      }

      const code = normalizePromoCode(req.body?.code);
      const durationDays = Number(req.body?.durationDays || req.body?.duration_days || 30);
      const maxUsesRaw = req.body?.maxUses ?? req.body?.max_uses ?? null;
      const maxUses = maxUsesRaw === null || maxUsesRaw === '' ? null : Number(maxUsesRaw);
      const note = String(req.body?.note || '').trim() || null;
      const expiresAt = req.body?.expiresAt || req.body?.expires_at || null;

      if (!code || code.length < 3) {
        return res.status(400).json({ error: 'Промокод должен быть не короче 3 символов' });
      }
      if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 366) {
        return res.status(400).json({ error: 'durationDays должен быть от 1 до 366' });
      }
      if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) {
        return res.status(400).json({ error: 'maxUses должен быть пустым или больше 0' });
      }

      const now = new Date().toISOString();
      const id = `promo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      promoSqlite.prepare(`
        INSERT INTO promo_codes (
          id, code, duration_days, max_uses, used_count, is_active, note, expires_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, 0, 1, ?, ?, ?, ?)
      `).run(id, code, durationDays, maxUses, note, expiresAt, now, now);

      console.log('[Promo] Created:', { code, durationDays, maxUses, expiresAt });
      res.json({ ok: true, promoCode: { id, code, durationDays, maxUses, usedCount: 0, isActive: true, note, expiresAt } });
    } catch (e) {
      const message = e && e.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'Такой промокод уже существует' : 'Не удалось создать промокод';
      console.error('[admin/promo-codes] Error:', e.message);
      res.status(400).json({ error: message });
    }
  });

  app.get('/api/admin/promo-codes', requirePromoAdmin, (req, res) => {
    try {
      if (!promoSqlite) {
        return res.status(500).json({ error: 'Promo DB is not initialized' });
      }

      const rows = promoSqlite.prepare(`
        SELECT
          code,
          duration_days AS durationDays,
          max_uses AS maxUses,
          used_count AS usedCount,
          is_active AS isActive,
          note,
          expires_at AS expiresAt,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM promo_codes
        ORDER BY datetime(created_at) DESC
      `).all();

      res.json({ promoCodes: rows.map(row => ({ ...row, isActive: Boolean(row.isActive) })) });
    } catch (e) {
      console.error('[admin/promo-codes GET] Error:', e.message);
      res.status(500).json({ error: 'Failed to load promo codes' });
    }
  });

  app.post('/api/billing/redeem-promo', (req, res) => {
    try {
      if (!promoSqlite) {
        return res.status(500).json({ error: 'Promo DB is not initialized' });
      }

      const email = String(req.body?.email || '').trim().toLowerCase();
      const requestUserId = String(req.body?.userId || '').trim();
      const code = normalizePromoCode(req.body?.code);

      if (!email) {
        return res.status(400).json({ error: 'email is required' });
      }
      if (!code) {
        return res.status(400).json({ error: 'Введите промокод' });
      }

      const user = promoSqlite.prepare('SELECT id, email FROM users WHERE lower(email) = lower(?) LIMIT 1').get(email);
      const userId = user?.id || requestUserId;
      if (!userId) {
        return res.status(400).json({ error: 'Сначала войдите в аккаунт' });
      }

      const result = promoSqlite.transaction(() => {
        const promo = promoSqlite.prepare('SELECT * FROM promo_codes WHERE code = ? LIMIT 1').get(code);
        if (!promo || !promo.is_active) {
          return { status: 404, body: { error: 'Промокод не найден или уже отключён' } };
        }
        if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
          return { status: 400, body: { error: 'Срок действия промокода истёк' } };
        }
        if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
          return { status: 400, body: { error: 'Промокод уже использован максимальное число раз' } };
        }

        const alreadyUsed = promoSqlite.prepare(`
          SELECT id FROM promo_redemptions
          WHERE promo_code = ? AND lower(user_email) = lower(?)
          LIMIT 1
        `).get(code, email);
        if (alreadyUsed) {
          return { status: 400, body: { error: 'Этот промокод уже применён для этого аккаунта' } };
        }

        const now = new Date();
        const activeSub = getActivePaidSubscriptionByEmail(email);
        const base = activeSub?.expires_at && new Date(activeSub.expires_at).getTime() > now.getTime()
          ? new Date(activeSub.expires_at)
          : now;
        const activatedAt = now.toISOString();
        const expiresAt = addDaysIso(base, promo.duration_days || 30);
        const subscriptionId = `sub_promo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const redemptionId = `redemption_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const transactionId = `promo:${code}:${Date.now()}`;

        promoSqlite.prepare(`
          INSERT INTO subscriptions (
            id, user_email, user_id, qrc_id, status, activated_at, expires_at, transaction_id, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, 'paid', ?, ?, ?, ?, ?)
        `).run(subscriptionId, email, userId, `promo:${code}`, activatedAt, expiresAt, transactionId, activatedAt, activatedAt);

        promoSqlite.prepare(`
          INSERT INTO promo_redemptions (id, promo_code, user_email, user_id, subscription_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(redemptionId, code, email, userId, subscriptionId, activatedAt);

        promoSqlite.prepare(`
          UPDATE promo_codes
          SET used_count = used_count + 1, updated_at = ?
          WHERE code = ?
        `).run(activatedAt, code);

        return {
          status: 200,
          body: {
            hasSubscription: true,
            expiresAt,
            activatedAt,
            code,
            subscriptionId,
          },
        };
      })();

      if (result.status !== 200) {
        return res.status(result.status).json(result.body);
      }

      console.log('[Promo] Redeemed:', { email, code, expiresAt: result.body.expiresAt });
      res.json(result.body);
    } catch (e) {
      console.error('[billing/redeem-promo] Error:', e.message);
      res.status(500).json({ error: 'Не удалось применить промокод' });
    }
  });
};
