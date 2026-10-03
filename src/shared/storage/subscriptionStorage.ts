import {emit} from "../../world/events";
import {getAuth} from './authStorage';
// Подписка на 30 дней
const SUBSCRIPTION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export interface Subscription {
  source?: "payment"|"promo"|"admin"|"legacy";
  owner?: string;
  isActive: boolean;
  activatedAt: string | null; // ISO date
  expiresAt: string | null; // ISO date
  isMock: boolean;
}

const STORAGE_KEY = 'chezzies_subscription';

function getSubscriptionFromStorage(): Subscription | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function saveSubscription(sub: Subscription): void {
  const previous=getSubscriptionFromStorage();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
  if(sub.isActive && (!previous?.isActive || previous.owner!==sub.owner || previous.source!==sub.source)){emit("premium_started");emit("premium_source",{source:sub.source||"legacy"});}
}

/**
 * Проверяет, активна ли подписка прямо сейчас.
 * Даже если в localStorage есть запись — проверяем срок действия.
 */
export function getActiveSubscription(): Subscription {
  const stored = getSubscriptionFromStorage();
  const owner=getAuth().userId||getAuth().email;
  if (!stored || !stored.isActive || (stored.owner && stored.owner!==owner)) {
    return { isActive: false, activatedAt: null, expiresAt: null, isMock: false };
  }

  if (!stored.expiresAt) return {...stored,source:stored.source||"legacy"};
  const expiresAt = new Date(stored.expiresAt).getTime();
  const now = Date.now();

  if (!Number.isFinite(expiresAt) || now >= expiresAt) {
    // Подписка истекла — сбрасываем
    const expiredSub: Subscription = {
      isActive: false,
      activatedAt: stored.activatedAt,
      expiresAt: stored.expiresAt,
      isMock: stored.isMock,
    };
    // Не удаляем из localStorage — пусть остаётся для истории
    return expiredSub;
  }

  return {
    ...stored,
    isActive: true,
    activatedAt: stored.activatedAt,
    expiresAt: stored.expiresAt,
    isMock: stored.isMock,
  };
}

/**
 * Активирует подписку на 30 дней.
 * Вызывается после успешной оплаты (или в mock-режиме).
 */
export function activateSubscription(isMock = false, expiresAtOverride?: string | null, source: Subscription["source"]="payment"): Subscription {
  const now = new Date();
  const expiresAt = expiresAtOverride ? new Date(expiresAtOverride) : new Date(now.getTime() + SUBSCRIPTION_DURATION_MS);

  const sub: Subscription = {
    isActive: true,
    source, owner:getAuth().userId||getAuth().email,
    activatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    isMock,
  };

  saveSubscription(sub);
  return sub;
}

/**
 * Отменяет подписку (для тестов или refund).
 */
export function syncSubscriptionFromServer(expiresAt: string | null, source?: Subscription["source"]): Subscription {
  if (!expiresAt) {
    const sub:Subscription={isActive:true,activatedAt:new Date().toISOString(),expiresAt:null,isMock:false,source:source||"legacy",owner:getAuth().userId||getAuth().email};saveSubscription(sub);return sub;
  }

  const expires = new Date(expiresAt);
  if (Number.isNaN(expires.getTime()) || expires.getTime() <= Date.now()) {
    clearSubscription();
    return { isActive: false, activatedAt: null, expiresAt: null, isMock: false };
  }

  const stored = getSubscriptionFromStorage();
  const sub: Subscription = {
    isActive: true,
    source:source||((!stored?.owner||stored.owner===(getAuth().userId||getAuth().email))?stored?.source:undefined)||"legacy",owner:getAuth().userId||getAuth().email,
    activatedAt: stored?.activatedAt || new Date().toISOString(),
    expiresAt: expires.toISOString(),
    isMock: false,
  };

  saveSubscription(sub);
  return sub;
}

export function cancelSubscription(): void {
  const stored = getSubscriptionFromStorage();
  if (stored) {
    saveSubscription({
      ...stored,
      isActive: false,
    });
  }
}

/**
 * Полностью очищает данные подписки.
 */
export function clearSubscription(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Возвращает сколько дней осталось до конца подписки.
 * Если подписка не активна — возвращает 0.
 */
export function getDaysRemaining(): number {
  const sub = getActiveSubscription();
  if (!sub.isActive || !sub.expiresAt) return 0;

  const expiresAt = new Date(sub.expiresAt).getTime();
  const now = Date.now();
  const msRemaining = expiresAt - now;

  return Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
}

/**
 * Форматирует дату окончания подписки для отображения.
 */
export function getFormattedExpiryDate(): string | null {
  const sub = getActiveSubscription();
  if (!sub.isActive || !sub.expiresAt) return null;

  const date = new Date(sub.expiresAt);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
