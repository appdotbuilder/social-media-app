import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type LoginInput, type AuthResponse } from '../schema';



// Simple JWT token generation (not for production)
const generateToken = (payload: any): string => {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payloadStr = btoa(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
  return `${header}.${payloadStr}.signature`;
};

export const login = async (input: LoginInput): Promise<AuthResponse> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .limit(1)
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password using Bun's built-in password verification
    let isValidPassword = false;
    
    try {
      isValidPassword = await Bun.password.verify(input.password, user.password_hash);
    } catch (error) {
      // Fallback for legacy hashes (for existing tests/data)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'PASSWORD_UNSUPPORTED_ALGORITHM') {
        // Legacy hash verification for backwards compatibility
        const encoder = new TextEncoder();
        const data = encoder.encode(input.password + 'salt');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const legacyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        isValidPassword = legacyHash === user.password_hash;
      } else {
        throw error;
      }
    }
    
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate simple JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      isAdmin: user.is_admin,
      isPremium: user.is_premium
    });

    // Convert numeric fields to numbers before returning
    return {
      user: {
        ...user,
        balance: parseFloat(user.balance)
      },
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};