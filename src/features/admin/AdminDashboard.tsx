import { useEffect, useMemo, useState } from 'react';
import './AdminDashboard.css';

type AdminPeriod = 'today' | '7d' | '30d' | 'all';

interface AdminSummary {
  period: AdminPeriod;
  periodLabel: string;
  totalUsers: number;
  paidSubscriptions: number;
  payingUsers: number;
  totalLogins: number;
  loginsInPeriod: number;
  uniqueLoginsInPeriod: number;
  totalEvents: number;
  eventsInPeriod: number;
  uniqueActiveInPeriod: number;
  uniqueDevicesInPeriod: number;
  newDevicesInPeriod: number;
  returningDevicesInPeriod: number;
  registrationsInPeriod: number;
  paymentIntentEvents: number;
  paymentIntentEventsInPeriod: number;
  qrCreated: number;
  qrCreatedInPeriod: number;
  paidInPeriod: number;
}

interface AdminUser {
  id: string;
  email: string;
  childName: string;
  provider: string;
  createdAt: string;
  loginCount: number;
  lastLoginAt: string | null;
  analyticsEventCount: number;
  lastEventAt: string | null;
  lastEventName: string | null;
  lastEventLabel: string | null;
  hasPaidSubscription: boolean;
  subscriptionExpiresAt: string | null;
  paymentCount: number;
}

interface AdminStats {
  summary: AdminSummary;
  users: AdminUser[];
  recentEvents: AdminEvent[];
  popularEvents: AdminPopularEvent[];
  funnel: AdminFunnelStep[];
}

interface AdminEvent {
  id: string;
  eventName: string;
  eventType: string;
  label: string;
  page: string;
  createdAt: string;
  email: string;
  childName: string;
}

interface AdminPopularEvent {
  eventType: string;
  label: string;
  page: string;
  count: number;
}

interface AdminFunnelStep {
  key: string;
  label: string;
  page: string;
  events: number;
  devices: number;
  accounts: number;
}
interface SupportMessage {
  id: string;
  threadId: string;
  sender: 'user' | 'admin';
  message: string;
  createdAt: string;
}

interface SupportThread {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  email: string;
  childName: string;
  guestEmail?: string;
  guestName?: string;
  lastMessage: string;
  messages: SupportMessage[];
}

const TOKEN_KEY = 'chezzies_admin_token';
const PERIOD_KEY = 'chezzies_admin_period';

const periodOptions: Array<{ value: AdminPeriod; label: string }> = [
  { value: 'today', label: 'Сегодня' },
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' },
  { value: 'all', label: 'Все время' },
];

const eventTypeLabels: Record<string, string> = {
  page_view: 'Открытие страницы',
  button_click: 'Клик по кнопке',
  link_click: 'Клик по ссылке',
  field_focus: 'Фокус в поле',
  form_submit: 'Отправка формы',
};

const pageLabels: Record<string, string> = {
  '/': 'Стартовый экран',
  '/home': 'Главное меню',
  '/login': 'Вход и регистрация',
  '/onboarding': 'Анкета ребёнка',
  '/profile': 'Профиль и статистика',
  '/match': 'Выбор соперника',
  '/game': 'Экран игры',
  '/result': 'Результат партии',
  '/subscribe': 'Экран подписки',
  '/payment': "Payment",
  '/payment-success': 'Успешная оплата',
  '/reset-password': 'Сброс пароля',
};

function normalizePage(page: string): string {
  const path = (page || '/').split('?')[0] || '/';
  return pageLabels[path] || path;
}

function isJunkEventLabel(label: string): boolean {
  const value = String(label || '').trim();
  return value.length <= 1 || /^[^\p{L}\p{N}]+$/u.test(value);
}

function formatEventTitle(event: Pick<AdminEvent, 'eventType' | 'label' | 'page' | 'eventName'> | AdminPopularEvent): string {
  const label = String(event.label || '').trim();
  const pageName = normalizePage(event.page || '');

  if (event.eventType === 'page_view') return `Открыли: ${pageName}`;
  if (event.eventType === 'field_focus') return `Поле: ${isJunkEventLabel(label) ? pageName : label}`;
  if (event.eventType === 'form_submit') return `Отправили форму: ${pageName}`;
  if (event.eventType === 'link_click') return `Перешли по ссылке: ${isJunkEventLabel(label) ? pageName : label}`;
  if (event.eventType === 'button_click') {
    return isJunkEventLabel(label) ? `Клик по элементу без подписи: ${pageName}` : `Кнопка: ${label}`;
  }

  return label || formatEventType(event.eventType);
}

function formatEventSubtitle(event: Pick<AdminEvent, 'eventType' | 'page'> | AdminPopularEvent): string {
  const rawPage = event.page || '-';
  return `${formatEventType(event.eventType)} · ${normalizePage(rawPage)} · ${rawPage}`;
}
function getFunnelPercent(step: AdminFunnelStep, firstStep?: AdminFunnelStep): number {
  const base = firstStep?.devices || firstStep?.events || 0;
  const current = step.devices || step.events || 0;
  if (!base) return current ? 100 : 0;
  return Math.min(100, Math.round((current / base) * 100));
}
function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('ru-RU');
}

function formatEventType(value: string): string {
  return eventTypeLabels[value] || value || 'Событие';
}

export default function AdminDashboard() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [tokenInput, setTokenInput] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [period, setPeriod] = useState<AdminPeriod>(() => (sessionStorage.getItem(PERIOD_KEY) as AdminPeriod) || 'today');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || threads[0] || null,
    [threads, selectedThreadId]
  );

  const authHeaders = (adminToken = token) => ({
    Authorization: `Bearer ${adminToken.trim()}`,
  });

  const loadStats = async (adminToken = tokenInput || token, selectedPeriod = period) => {
    if (!adminToken.trim()) {
      setError('Введите админ-токен');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [statsResponse, supportResponse] = await Promise.all([
        fetch(`/api/admin/stats?period=${encodeURIComponent(selectedPeriod)}`, { headers: authHeaders(adminToken) }),
        fetch('/api/admin/support', { headers: authHeaders(adminToken) }),
      ]);

      const statsData = await statsResponse.json().catch(() => ({}));
      const supportData = await supportResponse.json().catch(() => ({}));

      if (!statsResponse.ok) {
        throw new Error(statsData.error || 'Не удалось загрузить статистику');
      }
      if (!supportResponse.ok) {
        throw new Error(supportData.error || 'Не удалось загрузить обращения');
      }

      setStats(statsData);
      setThreads(supportData.threads || []);
      setToken(adminToken.trim());
      sessionStorage.setItem(TOKEN_KEY, adminToken.trim());
      sessionStorage.setItem(PERIOD_KEY, selectedPeriod);
      if (!selectedThreadId && supportData.threads?.[0]) {
        setSelectedThreadId(supportData.threads[0].id);
      }
    } catch (err) {
      setStats(null);
      setThreads([]);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!selectedThread || !reply.trim()) return;

    setReplyLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/support/${selectedThread.id}/messages`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: reply.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось отправить ответ');
      }
      setReply('');
      await loadStats(token, period);
      setSelectedThreadId(selectedThread.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить ответ');
    } finally {
      setReplyLoading(false);
    }
  };

  const handlePeriodChange = (nextPeriod: AdminPeriod) => {
    setPeriod(nextPeriod);
    sessionStorage.setItem(PERIOD_KEY, nextPeriod);
    if (token) {
      void loadStats(token, nextPeriod);
    }
  };

  useEffect(() => {
    if (token) {
      loadStats(token, period);
    }
  }, []);

  const summaryCards = stats
    ? [
        {
          label: 'Новые аккаунты',
          value: stats.summary.registrationsInPeriod,
          hint: `${stats.summary.periodLabel}. Всего аккаунтов: ${stats.summary.totalUsers}`,
        },
        {
          label: 'Оплатившие',
          value: stats.summary.payingUsers,
          hint: 'Уникальные пользователи с успешной оплатой за все время',
        },
        {
          label: 'Оплаты',
          value: stats.summary.paidInPeriod,
          hint: `${stats.summary.periodLabel}. Всего успешных оплат: ${stats.summary.paidSubscriptions}`,
        },
        {
          label: 'Авторизации',
          value: stats.summary.loginsInPeriod,
          hint: `Не люди, а успешные входы за период. Уникальных аккаунтов: ${stats.summary.uniqueLoginsInPeriod}. Всего входов: ${stats.summary.totalLogins}`,
        },
        {
          label: 'Действия интерфейса',
          value: stats.summary.eventsInPeriod,
          hint: `Клики, страницы, поля и формы за период. Шахматные ходы отдельно не считаются. Всего: ${stats.summary.totalEvents}`,
        },
        {
          label: 'Активные аккаунты',
          value: stats.summary.uniqueActiveInPeriod,
          hint: 'Уникальные залогиненные аккаунты, у которых были действия интерфейса за период',
        },
        {
          label: 'Устройства',
          value: stats.summary.uniqueDevicesInPeriod,
          hint: 'Уникальные браузеры/телефоны за выбранный период. Считается по deviceId в браузере',
        },
        {
          label: 'Новые устройства',
          value: stats.summary.newDevicesInPeriod,
          hint: 'DeviceId впервые появился в выбранный период',
        },
        {
          label: 'Вернувшиеся устройства',
          value: stats.summary.returningDevicesInPeriod,
          hint: 'DeviceId уже был раньше и снова активен в выбранный период',
        },
        {
          label: 'Интерес к оплате',
          value: stats.summary.paymentIntentEventsInPeriod,
          hint: `Открытия подписки и клики по оплате за период. Всего: ${stats.summary.paymentIntentEvents}`,
        },
        {
          label: 'QR создано',
          value: stats.summary.qrCreatedInPeriod,
          hint: `${stats.summary.periodLabel}. Всего созданных QR: ${stats.summary.qrCreated}`,
        },
      ]
    : [];

  return (
    <div className="admin-screen">
      <header className="admin-header">
        <div>
          <h1>Chezzies Admin</h1>
          <p>Пользователи, оплаты, входы, действия и обращения</p>
        </div>
        {stats && (
          <button className="admin-refresh" onClick={() => loadStats(token, period)} disabled={loading}>
            Обновить
          </button>
        )}
      </header>

      <section className="admin-token-panel">
        <input
          type="password"
          value={tokenInput}
          onChange={(event) => setTokenInput(event.target.value)}
          placeholder="ADMIN_TOKEN"
        />
        <button onClick={() => loadStats(tokenInput, period)} disabled={loading}>
          {loading ? "Loading..." : 'Открыть'}
        </button>
      </section>

      {stats && (
        <section className="admin-period-panel" aria-label="Период статистики">
          <div>
            <span>Период статистики</span>
            <strong>{stats.summary.periodLabel}</strong>
          </div>
          <div className="admin-period-buttons">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={period === option.value ? 'active' : ''}
                onClick={() => handlePeriodChange(option.value)}
                disabled={loading}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {error && <div className="admin-error">{error}</div>}

      {stats && (
        <>
          <section className="admin-summary">
            {summaryCards.map((card) => (
              <div key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.hint}</small>
              </div>
            ))}
          </section>

          <section className="admin-funnel">
            <div className="admin-section-title">
              <h2>Воронка за период</h2>
              <span>{stats.summary.periodLabel}</span>
            </div>
            <div className="admin-funnel-list">
              {(stats.funnel || []).map((step, index) => {
                const percent = getFunnelPercent(step, stats.funnel?.[0]);
                return (
                  <div key={step.key} className="admin-funnel-row">
                    <div className="admin-funnel-main">
                      <strong>{index + 1}. {step.label}</strong>
                      <span>{step.page === 'qrc_cache' ? 'Создание QR' : normalizePage(step.page)} · {step.page}</span>
                    </div>
                    <div className="admin-funnel-metrics">
                      <span><strong>{step.devices}</strong> устройств</span>
                      <span><strong>{step.events}</strong> открытий</span>
                      <span><strong>{step.accounts}</strong> аккаунтов</span>
                    </div>
                    <div className="admin-funnel-bar" aria-label={`Проход: ${percent}%`}>
                      <div style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="admin-popular-events">
            <div className="admin-section-title">
              <h2>Популярные действия</h2>
              <span>{stats.popularEvents?.length || 0}</span>
            </div>
            <div className="admin-popular-events-list">
              {(stats.popularEvents || []).length === 0 && (
                <div className="admin-empty">Действий за выбранный период пока нет</div>
              )}
              {(stats.popularEvents || []).map((event) => (
                <div key={`${event.eventType}-${event.label}-${event.page}`} className="admin-popular-event-row">
                  <div>
                    <strong>{formatEventTitle(event)}</strong>
                    <span>{formatEventSubtitle(event)}</span>
                  </div>
                  <strong>{event.count}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-events">
            <div className="admin-section-title">
              <h2>Последние действия</h2>
              <span>{stats.recentEvents?.length || 0}</span>
            </div>
            <div className="admin-events-list">
              {(stats.recentEvents || []).length === 0 && (
                <div className="admin-empty">Действий за выбранный период пока нет</div>
              )}
              {(stats.recentEvents || []).map((event) => (
                <div key={event.id} className="admin-event-row">
                  <div>
                    <strong>{formatEventTitle(event)}</strong>
                    <span>{formatEventSubtitle(event)}</span>
                  </div>
                  <div>
                    <strong>{event.childName || event.email || 'Гость'}</strong>
                    <span>{event.email || 'без email'}</span>
                  </div>
                  <time>{formatDate(event.createdAt)}</time>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-support">
            <div className="admin-section-title">
              <h2>Обращения</h2>
              <span>{threads.length}</span>
            </div>
            <div className="admin-support-layout">
              <div className="admin-thread-list">
                {threads.length === 0 && <div className="admin-empty">Обращений пока нет</div>}
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    className={`admin-thread-item ${selectedThread?.id === thread.id ? 'active' : ''}`}
                    onClick={() => setSelectedThreadId(thread.id)}
                  >
                    <strong>{thread.childName || thread.guestName || thread.email || 'Гость'}</strong>
                    <span>{thread.email || thread.guestEmail || 'без email'}</span>
                    <small>{thread.lastMessage || 'Без сообщений'}</small>
                  </button>
                ))}
              </div>

              <div className="admin-conversation">
                {selectedThread ? (
                  <>
                    <div className="admin-conversation-head">
                      <strong>{selectedThread.childName || selectedThread.guestName || selectedThread.email || 'Гость'}</strong>
                      <span>{selectedThread.email || selectedThread.guestEmail || 'без email'} · {formatDate(selectedThread.updatedAt)}</span>
                    </div>
                    <div className="admin-conversation-messages">
                      {selectedThread.messages.map((message) => (
                        <div key={message.id} className={`admin-chat-message ${message.sender}`}>
                          <div>{message.message}</div>
                          <span>{message.sender === 'admin' ? "You" : 'Пользователь'} · {formatDate(message.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="admin-reply">
                      <textarea
                        value={reply}
                        onChange={(event) => setReply(event.target.value)}
                        placeholder="Ответ пользователю..."
                        rows={3}
                      />
                      <button onClick={sendReply} disabled={replyLoading || !reply.trim()}>
                        {replyLoading ? 'Отправка...' : 'Ответить'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="admin-empty">Выберите обращение</div>
                )}
              </div>
            </div>
          </section>

          <section className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Имя ребёнка</th>
                  <th>Register</th>
                  <th>Входы всего</th>
                  <th>Последний вход</th>
                  <th>Payment</th>
                  <th>Подписка до</th>
                  <th>Действия всего</th>
                  <th>Последнее действие</th>
                </tr>
              </thead>
              <tbody>
                {stats.users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.childName}</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>{user.loginCount}</td>
                    <td>{formatDate(user.lastLoginAt)}</td>
                    <td>{user.paymentCount > 0 ? `${user.paymentCount} оплат` : '-'}</td>
                    <td>
                      <span className={user.hasPaidSubscription ? 'admin-paid' : 'admin-unpaid'}>
                        {user.hasPaidSubscription ? formatDate(user.subscriptionExpiresAt) : 'нет'}
                      </span>
                    </td>
                    <td>{user.analyticsEventCount}</td>
                    <td>
                      <div className="admin-event-cell">
                        <strong>{user.lastEventLabel || user.lastEventName || '-'}</strong>
                        <span>{formatDate(user.lastEventAt)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}



