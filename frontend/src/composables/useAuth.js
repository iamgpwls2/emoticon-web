import { computed, ref } from 'vue';
import { supabase } from '../lib/supabase.js';

const initialized = ref(false);
const loading = ref(true);
const session = ref(null);
let authSubscription = null;

const user = computed(() => session.value?.user ?? null);
const isAuthenticated = computed(() => Boolean(user.value));

export async function initAuth() {
  if (initialized.value) return;
  initialized.value = true;

  loading.value = true;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    session.value = data.session ?? null;
  } finally {
    loading.value = false;
  }

  if (!authSubscription) {
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession ?? null;
    });
    authSubscription = data.subscription;
  }
}

async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export function useAuth() {
  void initAuth();

  return {
    session,
    user,
    loading,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
  };
}

