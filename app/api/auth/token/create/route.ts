// Create Bearer token for API/mobile clients

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../../backend/lib/middleware/auth';
import { randomBytes } from 'crypto';

// TODO: Implement Redis or in-memory store for bearer token mapping
// For now, we'll use a simple in-memory Map (not production-ready)
const bearerTokenStore = new Map<string, { sessionToken: string; expiresAt: Date }>();

// Cleanup expired tokens every hour
setInterval(() => {
  const now = new Date();
  for (const [token, data] of bearerTokenStore.entries()) {
    if (data.expiresAt < now) {
      bearerTokenStore.delete(token);
    }
  }
}, 60 * 60 * 1000);

export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request);

  if (authResult instanceof NextResponse) {
    return authResult; // Error response
  }

  const { sessionToken } = authResult;

  // Generate bearer token
  const bearerToken = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  // Store mapping: bearer token -> session token
  bearerTokenStore.set(bearerToken, { sessionToken, expiresAt });

  return NextResponse.json({
    token: bearerToken,
    expiresAt: expiresAt.toISOString(),
    usage: 'Include in Authorization: Bearer <token> header',
  });
}
