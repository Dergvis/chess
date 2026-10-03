/**
 * Auth Storage — данные авторизации пользователя
 * Для MVP используется localStorage
 */

const AUTH_KEY = 'chezzies_auth';

export interface AuthData {
  isLoggedIn: boolean;
  userId: string;
  email: string;
  childName: string;
  provider: 'email' | 'google' | null;
}

const defaultAuth: AuthData = {
  isLoggedIn: false,
  userId: '',
  email: '',
  childName: '',
  provider: null,
};

/**
 * Получить данные авторизации
 */
export function getAuth(): AuthData {
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultAuth, ...parsed };
    }
  } catch (error) {
    console.error('Error loading auth data:', error);
  }
  return defaultAuth;
}

/**
 * Сохранить данные авторизации
 */
export function saveAuth(data: Partial<AuthData>): void {
  try {
    const current = getAuth();
    const updated = { ...current, ...data };
    localStorage.setItem(AUTH_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving auth data:', error);
  }
}

/**
 * Войти по email
 */
export function loginWithEmail(email: string, childName: string): void {
  saveAuth({
    isLoggedIn: true,
    email,
    childName,
    provider: 'email',
  });
}

/**
 * Выйти
 */
export function logout(): void {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
}

/**
 * Проверить, авторизован ли пользователь
 */
export function isUserLoggedIn(): boolean {
  return getAuth().isLoggedIn;
}

/**
 * Получить имя ребёнка
 */
export function getChildName(): string {
  const auth = getAuth();
  return auth.childName || "Player";
}
