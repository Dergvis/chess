'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = function installWorldRoutes(app, { express, getCurrentUser, dataDir, recordEvent }) {
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const origins = require('./international.cjs').origins;
  app.use('/api/world', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.headers.origin && !origins.has(req.headers.origin)) {
      return res.status(403).json({ error: 'origin-denied' });
    }
    next();
  }, express.json({ limit: '4mb' }));
  app.get('/api/world/health', (req, res) => res.json({ mode: 'production', production: true, version: 1 }));
  function account(req, res) {
    const user = getCurrentUser(req);
    if (!user) { res.status(401).json({ error: 'login-required' }); return null; }
    // The client never chooses a filename or another user's account.
    return path.join(dataDir, crypto.createHash('sha256').update(String(user.id)).digest('hex') + '.json');
  }
  app.get('/api/world/account', (req, res) => {
    try {
      const file = account(req, res);
      if (!file) return;
      if (!fs.existsSync(file)) return res.status(404).json({});
      return res.json(JSON.parse(fs.readFileSync(file, 'utf8')));
    } catch { return res.status(500).json({ error: 'world-read-failed' }); }
  });
  app.put('/api/world/account', (req, res) => {
    let temp;
    try {
      const file = account(req, res);
      if (!file) return;
      const save = req.body;
      if (!save || save.version !== 1 || !save.player ||
          !['inventor', 'mage', 'knight', null].includes(save.player.selectedCharacter) ||
          !Array.isArray(save.worldProgress?.completedChallenges) ||
          !Array.isArray(save.games) || !save.mastery || typeof save.mastery !== 'object' ||
          !Number.isFinite(save.updatedAt) || save.updatedAt < 0) {
        return res.status(400).json({ error: 'invalid-save' });
      }
      const previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
      if (previous && previous.updatedAt > save.updatedAt) return res.status(409).json({ error: 'newer-save' });
      // Synchronous check + atomic replacement prevents partial/concurrent writes in this Node process.
      temp = file + '.' + crypto.randomUUID() + '.tmp';
      const fd = fs.openSync(temp, 'wx', 0o600);
      try { fs.writeFileSync(fd, JSON.stringify(save)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      fs.renameSync(temp, file);
      temp = null;
      return res.json({ saved: true });
    } catch { return res.status(500).json({ error: 'world-write-failed' }); }
    finally { if (temp && fs.existsSync(temp)) fs.unlinkSync(temp); }
  });
  app.post('/api/world/events', (req, res) => {
    try {
      const event = req.body;
      if (!event || typeof event.id !== 'string' || event.id.length > 160 ||
          typeof event.eventName !== 'string' || !/^[a-z_]{1,80}$/.test(event.eventName) ||
          Buffer.byteLength(JSON.stringify(event)) > 16384) return res.status(400).json({ error: 'invalid-event' });
      const user = getCurrentUser(req);
      recordEvent(user?.id || null, { eventName: event.eventName, eventType: 'world', page: '/home',
        metadata: { source: 'world', eventId: event.id } });
      return res.status(204).end();
    } catch { return res.status(500).json({ error: 'world-event-failed' }); }
  });
  // Anonymous world saves are browser-only in production.
  app.use('/api/world', (req, res) => res.status(404).json({ error: 'not-found' }));
};
