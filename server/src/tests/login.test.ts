import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';

// Simple password hashing for testing (matches handler implementation)
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Parse simple JWT token for testing
const parseToken = (token: string) => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
};

const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: '', // Will be set during test setup
  full_name: 'Test User',
  bio: 'Test bio',
  profile_picture_url: 'https://example.com/avatar.jpg',
  followers_count: 10,
  following_count: 5,
  balance: '100.50',
  is_premium: true,
  premium_expires_at: new Date('2024-12-31'),
  is_admin: false,
  is_active: true,
};

const loginInput: LoginInput = {
  email: 'test@example.com',
  password: 'password123',
};

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate user with valid credentials', async () => {
    // Create test user with hashed password
    const hashedPassword = await hashPassword(loginInput.password);
    await db.insert(usersTable).values({
      ...testUser,
      password_hash: hashedPassword,
    }).execute();

    const result = await login(loginInput);

    // Verify user data
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.username).toEqual('testuser');
    expect(result.user.full_name).toEqual('Test User');
    expect(result.user.bio).toEqual('Test bio');
    expect(result.user.profile_picture_url).toEqual('https://example.com/avatar.jpg');
    expect(result.user.followers_count).toEqual(10);
    expect(result.user.following_count).toEqual(5);
    expect(result.user.balance).toEqual(100.5); // Numeric conversion
    expect(typeof result.user.balance).toBe('number');
    expect(result.user.is_premium).toBe(true);
    expect(result.user.premium_expires_at).toBeInstanceOf(Date);
    expect(result.user.is_admin).toBe(false);
    expect(result.user.is_active).toBe(true);
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
    expect(result.user.id).toBeDefined();

    // Verify token
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');

    // Verify JWT token content
    const decoded = parseToken(result.token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toEqual(result.user.id);
    expect(decoded?.email).toEqual('test@example.com');
    expect(decoded?.isAdmin).toBe(false);
    expect(decoded?.isPremium).toBe(true);
    expect(decoded?.exp).toBeDefined();
  });

  it('should authenticate admin user correctly', async () => {
    // Create admin user
    const adminUser = {
      ...testUser,
      email: 'admin@example.com',
      is_admin: true,
      is_premium: false,
    };
    
    const hashedPassword = await hashPassword(loginInput.password);
    await db.insert(usersTable).values({
      ...adminUser,
      password_hash: hashedPassword,
    }).execute();

    const adminLoginInput: LoginInput = {
      email: 'admin@example.com',
      password: 'password123',
    };

    const result = await login(adminLoginInput);

    expect(result.user.is_admin).toBe(true);
    expect(result.user.is_premium).toBe(false);

    // Verify JWT token contains admin flag
    const decoded = parseToken(result.token);
    expect(decoded?.isAdmin).toBe(true);
    expect(decoded?.isPremium).toBe(false);
  });

  it('should handle user with zero balance correctly', async () => {
    // Create user with zero balance
    const userWithZeroBalance = {
      ...testUser,
      balance: '0.00',
    };

    const hashedPassword = await hashPassword(loginInput.password);
    await db.insert(usersTable).values({
      ...userWithZeroBalance,
      password_hash: hashedPassword,
    }).execute();

    const result = await login(loginInput);

    expect(result.user.balance).toEqual(0);
    expect(typeof result.user.balance).toBe('number');
  });

  it('should handle user with null optional fields', async () => {
    // Create user with null optional fields
    const userWithNulls = {
      ...testUser,
      bio: null,
      profile_picture_url: null,
      premium_expires_at: null,
    };

    const hashedPassword = await hashPassword(loginInput.password);
    await db.insert(usersTable).values({
      ...userWithNulls,
      password_hash: hashedPassword,
    }).execute();

    const result = await login(loginInput);

    expect(result.user.bio).toBeNull();
    expect(result.user.profile_picture_url).toBeNull();
    expect(result.user.premium_expires_at).toBeNull();
  });

  it('should reject invalid email', async () => {
    // Create test user
    const hashedPassword = await hashPassword(loginInput.password);
    await db.insert(usersTable).values({
      ...testUser,
      password_hash: hashedPassword,
    }).execute();

    const invalidEmailInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'password123',
    };

    await expect(login(invalidEmailInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should reject invalid password', async () => {
    // Create test user
    const hashedPassword = await hashPassword('correct_password');
    await db.insert(usersTable).values({
      ...testUser,
      password_hash: hashedPassword,
    }).execute();

    const invalidPasswordInput: LoginInput = {
      email: 'test@example.com',
      password: 'wrong_password',
    };

    await expect(login(invalidPasswordInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should reject inactive user', async () => {
    // Create inactive user
    const inactiveUser = {
      ...testUser,
      is_active: false,
    };

    const hashedPassword = await hashPassword(loginInput.password);
    await db.insert(usersTable).values({
      ...inactiveUser,
      password_hash: hashedPassword,
    }).execute();

    await expect(login(loginInput)).rejects.toThrow(/account is deactivated/i);
  });

  it('should handle case-sensitive email correctly', async () => {
    // Create user with lowercase email
    const hashedPassword = await hashPassword(loginInput.password);
    await db.insert(usersTable).values({
      ...testUser,
      email: 'test@example.com', // lowercase
      password_hash: hashedPassword,
    }).execute();

    // Try to login with uppercase email
    const uppercaseEmailInput: LoginInput = {
      email: 'TEST@EXAMPLE.COM',
      password: 'password123',
    };

    await expect(login(uppercaseEmailInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should generate different tokens for different login sessions', async () => {
    // Create test user
    const hashedPassword = await hashPassword(loginInput.password);
    await db.insert(usersTable).values({
      ...testUser,
      password_hash: hashedPassword,
    }).execute();

    const result1 = await login(loginInput);
    
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const result2 = await login(loginInput);

    expect(result1.token).not.toEqual(result2.token);
    
    // Both tokens should be valid
    const decoded1 = parseToken(result1.token);
    const decoded2 = parseToken(result2.token);
    
    expect(decoded1?.userId).toEqual(decoded2?.userId);
    expect(decoded1?.email).toEqual(decoded2?.email);
  });

  it('should handle large balance values correctly', async () => {
    // Create user with large balance
    const userWithLargeBalance = {
      ...testUser,
      balance: '999999.99',
    };

    const hashedPassword = await hashPassword(loginInput.password);
    await db.insert(usersTable).values({
      ...userWithLargeBalance,
      password_hash: hashedPassword,
    }).execute();

    const result = await login(loginInput);

    expect(result.user.balance).toEqual(999999.99);
    expect(typeof result.user.balance).toBe('number');
  });

  it('should handle decimal balance values correctly', async () => {
    // Create user with precise decimal balance
    const userWithDecimalBalance = {
      ...testUser,
      balance: '123.45',
    };

    const hashedPassword = await hashPassword(loginInput.password);
    await db.insert(usersTable).values({
      ...userWithDecimalBalance,
      password_hash: hashedPassword,
    }).execute();

    const result = await login(loginInput);

    expect(result.user.balance).toEqual(123.45);
    expect(typeof result.user.balance).toBe('number');
  });
});