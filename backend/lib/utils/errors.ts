// Custom error classes for the application

export class InsufficientCreditsError extends Error {
  constructor(
    public requiredCredits: number,
    public availableCredits: number
  ) {
    super(`Insufficient credits: have ${availableCredits}, need ${requiredCredits}`);
    this.name = 'InsufficientCreditsError';
  }
}

export class SessionExpiredError extends Error {
  constructor(public expiresAt: Date) {
    super(`Session expired at ${expiresAt.toISOString()}`);
    this.name = 'SessionExpiredError';
  }
}

export class SessionNotFoundError extends Error {
  constructor(public sessionToken: string) {
    super(`Session not found: ${sessionToken}`);
    this.name = 'SessionNotFoundError';
  }
}

export class ReadingSessionNotFoundError extends Error {
  constructor(public sessionId: string) {
    super(`Reading session not found: ${sessionId}`);
    this.name = 'ReadingSessionNotFoundError';
  }
}

export class InvalidReadingTypeError extends Error {
  constructor(public readingTypeSlug: string) {
    super(`Invalid reading type: ${readingTypeSlug}`);
    this.name = 'InvalidReadingTypeError';
  }
}
