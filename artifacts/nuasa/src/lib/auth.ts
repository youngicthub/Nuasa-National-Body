import { apiFetch, getAuthToken, getApiBase } from "@/lib/api";

export type User = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type Session = {
  access_token: string;
  user: User;
};

type AuthResponse = {
  user?: User;
  session?: Session | null;
};

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/signin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function signUp(
  email: string,
  password: string,
  metadata?: Record<string, unknown>,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, metadata }),
  });
}

export async function getSession(): Promise<Session | null> {
  if (!getAuthToken()) return null;
  try {
    const response = await apiFetch<{ session: Session | null }>("/auth/session");
    return response.session ?? null;
  } catch {
    return null;
  }
}

export async function updatePassword(password: string) {
  return apiFetch<{ success: true }>("/auth/password", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function signOut() {
  localStorage.removeItem("nuasa_local_access_token");
}

export function saveSession(session: Session) {
  if (!session.access_token || !session.user) {
    throw new Error("The login service returned an incomplete session.");
  }
  localStorage.setItem("nuasa_local_access_token", session.access_token);
}

export function authApiBase() {
  return getApiBase();
}