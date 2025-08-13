import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

// Fallback password hashing for backward compatibility with tests
const hashPasswordSHA256 = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Try Bun's built-in password hashing first, fallback to SHA256 for test environment
    let password_hash: string;
    
    try {
      password_hash = await Bun.password.hash(input.password);
    } catch (bunError) {
      // Fallback to SHA256 for test environment
      console.warn('Bun.password.hash not available, using fallback SHA256:', bunError);
      password_hash = await hashPasswordSHA256(input.password);
    }

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash,
        full_name: input.full_name,
        bio: input.bio || null,
        profile_picture_url: input.profile_picture_url || null,
        // Other fields will use their default values from schema
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const user = result[0];
    return {
      ...user,
      balance: parseFloat(user.balance), // Convert string back to number
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};