import { randomBytes } from 'crypto';
import { verifyMessage } from 'ethers';

const sessions = {};

export function getNonceForUser(userId, wallet) {
  const code = randomBytes(4).toString('hex').toUpperCase();
  sessions[userId] = { wallet, code, timestamp: Date.now() };
  return { code };
}

export async function validateSignature(userId, wallet, signature) {
  const session = sessions[userId];
  if (!session) return false;

  const msg = `Sign this message: Verify B Side | Code: ${session.code}`;
  try {
    const signer = verifyMessage(msg, signature);
    return signer.toLowerCase() === wallet.toLowerCase();
  } catch {
    return false;
  }
}
