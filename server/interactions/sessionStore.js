const sessionMap = new Map();
const cooldownMap = new Map();
const verifyCooldown = new Map();

export function createNonce() {
  return Math.floor(Math.random() * 1e6).toString().padStart(6, '0');
}

export function storeSession(userId, code) {
  clearSession(userId); // Auto-clear existing session
  sessionMap.set(userId, {
    code,
    created: Date.now(),
    used: false
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

export function markSessionUsed(userId) {
  const session = sessionMap.get(userId);
  if (session) {
    session.used = true;
  }
}

export function isRateLimited(userId) {
  const lastAction = cooldownMap.get(userId);
  if (!lastAction) return false;

  return Date.now() - lastAction < 10 * 1000;
}

export function updateLastAction(userId) {
  cooldownMap.set(userId, Date.now());
}

export function canRunVerify(userId) {
  const last = verifyCooldown.get(userId);
  return !last || (Date.now() - last > 10 * 1000);
}

export function recordVerifyRun(userId) {
  verifyCooldown.set(userId, Date.now());
}
