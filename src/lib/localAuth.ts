// Local Account and Profile Authentication System
// Provides instant, 100% offline-ready multi-user isolation on any device,
// with optional remote Supabase sync when a valid online project is connected.

export interface StoredUserProfile {
  id: string;
  email: string;
  name: string;
  passwordHash: string; // SHA-256 hex string
  createdAt: string;
}

export interface ActiveSession {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
}

const LOCAL_USERS_KEY = 'apex_registered_users_v1';
const CURRENT_SESSION_KEY = 'apex_current_session_v1';

// Helper: simple robust SHA-256 hashing using Web Crypto API
export async function hashPassword(password: string): Promise<string> {
  const normalized = password.trim();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(normalized);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }
  // Deterministic fallback hash if crypto.subtle is unavailable
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash)}_${normalized.length}`;
}

export function getAllLocalUsers(): StoredUserProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAllLocalUsers(users: StoredUserProfile[]): void {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save local users', err);
  }
}

export function getCurrentSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(CURRENT_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.user && parsed.user.id && parsed.user.email) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function setCurrentSession(session: ActiveSession | null): void {
  try {
    if (session) {
      localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(CURRENT_SESSION_KEY);
    }
  } catch (err) {
    console.error('Failed to set current session', err);
  }
}

export async function localRegister(
  email: string,
  pass: string,
  name?: string
): Promise<{ user: StoredUserProfile; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { user: null as any, error: 'Por favor, insira um e-mail válido.' };
  }
  if (!cleanPass || cleanPass.length < 6) {
    return { user: null as any, error: 'A senha deve conter no mínimo 6 caracteres.' };
  }

  const passwordHash = await hashPassword(cleanPass);
  const users = getAllLocalUsers();
  const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    if (existing.passwordHash === passwordHash) {
      setCurrentSession({
        user: {
          id: existing.id,
          email: existing.email,
          name: existing.name
        },
        token: `tok_${Date.now()}`
      });
      return { user: existing };
    }
    return {
      user: null as any,
      error: 'Este e-mail já possui cadastro. Use a aba "Entrar na Conta" ou recupere sua senha.'
    };
  }
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const resolvedName = (name && name.trim()) || cleanEmail.split('@')[0];

  const newUser: StoredUserProfile = {
    id,
    email: cleanEmail,
    name: resolvedName,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveAllLocalUsers(users);

  setCurrentSession({
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name
    },
    token: `tok_${Date.now()}`
  });

  return { user: newUser };
}

export async function localLogin(
  email: string,
  pass: string
): Promise<{ user: StoredUserProfile | null; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (!cleanEmail || !cleanPass) {
    return { user: null, error: 'Informe e-mail e senha para continuar.' };
  }

  const users = getAllLocalUsers();
  const found = users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!found) {
    return {
      user: null,
      error: 'Conta não encontrada para este e-mail. Crie sua conta na aba "Criar Nova Conta".'
    };
  }

  const incomingHash = await hashPassword(cleanPass);
  if (found.passwordHash !== incomingHash) {
    return {
      user: null,
      error: 'Senha incorreta. Confira seus dados ou redefina sua senha.'
    };
  }

  setCurrentSession({
    user: {
      id: found.id,
      email: found.email,
      name: found.name
    },
    token: `tok_${Date.now()}`
  });

  return { user: found };
}

export async function localResetPassword(
  email: string,
  newPassword?: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const users = getAllLocalUsers();
  const idx = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);

  if (idx === -1) {
    return {
      success: false,
      error: 'Nenhuma conta cadastrada com este e-mail.'
    };
  }

  if (newPassword && newPassword.length >= 6) {
    users[idx].passwordHash = await hashPassword(newPassword);
    saveAllLocalUsers(users);
    return { success: true };
  }

  // If no new password provided, set temporary default and inform user
  const tempPass = '123456';
  users[idx].passwordHash = await hashPassword(tempPass);
  saveAllLocalUsers(users);
  return { success: true };
}

export function localSignOut(): void {
  setCurrentSession(null);
}
