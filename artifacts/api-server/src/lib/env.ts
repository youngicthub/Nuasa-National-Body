const MIN_SECRET_LENGTH = 32;

function requireSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `${name} environment variable is required and must be at least ${MIN_SECRET_LENGTH} characters long. ` +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    );
  }
  return value;
}

/**
 * Fails startup loudly instead of letting the server run with a guessable
 * default JWT secret or an unset admin signup gate.
 */
export function assertRequiredEnv() {
  requireSecret("JWT_SECRET");
  requireSecret("ADMIN_SIGNUP_SECRET");
}
