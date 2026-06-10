import { initAuth, useAuthState } from '../lib/authSession.js';

export { initAuth };

export function useAuth() {
  void initAuth();
  return useAuthState();
}
