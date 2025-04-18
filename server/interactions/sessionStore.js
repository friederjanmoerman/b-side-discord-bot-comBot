const sessionMap = new Map();

export function createNonce() {
  return Math.floor(Math.random() * 1e6).toString().padStart(6, '0');
}

export function storeSession(userId, wallet, code) {
  sessionMap.set(userId, {
    wallet,
    code,
    created: Date.now(),
  });
}

export function getSession(userId) {
  const session = sessionMap.get(userId);
  if (!session) return null;

  const age = Date.now() - session.created;
  if (age > 10 * 60 * 1000) {
    sessionMap.delete(userId);
    return null;
  }

  return session;
}

export function clearSession(userId) {
  sessionMap.delete(userId);
}
