import { computed, ref } from 'vue';
import { supabase } from './supabase.js';

const initialized = ref(false);
const loading = ref(true);
const session = ref(null);

let authSubscription = null;
/** @type {Array<() => void>} */
let authReadyWaiters = [];

const user = computed(() => session.value?.user ?? null);
const isAuthenticated = computed(() => Boolean(user.value));
const accessToken = computed(() => session.value?.access_token ?? null);
const isAuthReady = computed(() => initialized.value && !loading.value);

function notifyAuthReady() {
  if (!isAuthReady.value) return;

  const waiters = authReadyWaiters;
  authReadyWaiters = [];
  waiters.forEach((resolve) => resolve());
}

function setSession(nextSession) {
  session.value = nextSession ?? null;
}

/**
 * Supabase auth 초기화가 끝날 때까지 대기합니다.
 * @returns {Promise<void>}
 */
export function waitForAuthReady() {
  if (isAuthReady.value) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    authReadyWaiters.push(resolve);
  });
}

/**
 * 앱 시작 시 1회 호출합니다. onAuthStateChange로 세션 변경을 추적합니다.
 * @returns {Promise<void>}
 */
export async function initAuth() {
  if (initialized.value) {
    await waitForAuthReady();
    return;
  }

  initialized.value = true;
  loading.value = true;

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    setSession(data.session);
  } finally {
    loading.value = false;
    notifyAuthReady();
  }

  if (!authSubscription) {
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);

      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        loading.value = false;
        notifyAuthReady();
      }
    });
    authSubscription = data.subscription;
  }
}

/**
 * 인증이 준비된 뒤 access token을 반환합니다.
 * 서비스 레이어는 supabase.auth.getSession() 대신 이 함수를 사용합니다.
 *
 * @param {string} [unauthenticatedMessage]
 * @returns {Promise<string>}
 */
export async function resolveAccessToken(
  unauthenticatedMessage = '로그인이 필요합니다.'
) {
  await initAuth();
  await waitForAuthReady();

  const token = accessToken.value;
  if (!token) {
    throw new Error(unauthenticatedMessage);
  }

  return token;
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  if (data.session) {
    setSession(data.session);
    loading.value = false;
    notifyAuthReady();
  }

  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;

  setSession(data.session);
  loading.value = false;
  notifyAuthReady();

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;

  setSession(null);
  loading.value = false;
  notifyAuthReady();
}

export function useAuthState() {
  return {
    session,
    user,
    loading,
    isAuthenticated,
    accessToken,
    isAuthReady,
    waitForAuthReady,
    signUp,
    signIn,
    signOut,
  };
}
