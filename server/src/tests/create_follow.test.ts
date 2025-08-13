import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, followsTable } from '../db/schema';
import { type CreateFollowInput } from '../schema';
import { createFollow } from '../handlers/create_follow';
import { eq, and } from 'drizzle-orm';

// Test users data
const testFollower = {
  username: 'follower_user',
  email: 'follower@test.com',
  password_hash: 'hashed_password_123',
  full_name: 'Follower User',
  bio: null,
  profile_picture_url: null,
};

const testFollowed = {
  username: 'followed_user',
  email: 'followed@test.com',
  password_hash: 'hashed_password_456',
  full_name: 'Followed User',
  bio: 'User to be followed',
  profile_picture_url: null,
};

const testInactiveUser = {
  username: 'inactive_user',
  email: 'inactive@test.com',
  password_hash: 'hashed_password_789',
  full_name: 'Inactive User',
  bio: null,
  profile_picture_url: null,
  is_active: false,
};

describe('createFollow', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a follow relationship', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([testFollower, testFollowed])
      .returning()
      .execute();

    const followerId = users[0].id;
    const followedId = users[1].id;

    const testInput: CreateFollowInput = {
      follower_id: followerId,
      followed_id: followedId,
    };

    const result = await createFollow(testInput);

    // Verify follow relationship
    expect(result.follower_id).toEqual(followerId);
    expect(result.followed_id).toEqual(followedId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update both users follow counts', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([testFollower, testFollowed])
      .returning()
      .execute();

    const followerId = users[0].id;
    const followedId = users[1].id;

    const testInput: CreateFollowInput = {
      follower_id: followerId,
      followed_id: followedId,
    };

    await createFollow(testInput);

    // Check updated counts
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.id, followerId)
        )
      )
      .union(
        db.select()
          .from(usersTable)
          .where(eq(usersTable.id, followedId))
      )
      .execute();

    const followerUser = updatedUsers.find(user => user.id === followerId);
    const followedUser = updatedUsers.find(user => user.id === followedId);

    expect(followerUser?.following_count).toEqual(1);
    expect(followedUser?.followers_count).toEqual(1);
  });

  it('should save follow relationship to database', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([testFollower, testFollowed])
      .returning()
      .execute();

    const followerId = users[0].id;
    const followedId = users[1].id;

    const testInput: CreateFollowInput = {
      follower_id: followerId,
      followed_id: followedId,
    };

    const result = await createFollow(testInput);

    // Query database to verify follow was saved
    const follows = await db.select()
      .from(followsTable)
      .where(eq(followsTable.id, result.id))
      .execute();

    expect(follows).toHaveLength(1);
    expect(follows[0].follower_id).toEqual(followerId);
    expect(follows[0].followed_id).toEqual(followedId);
    expect(follows[0].created_at).toBeInstanceOf(Date);
  });

  it('should prevent self-following', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values([testFollower])
      .returning()
      .execute();

    const userId = users[0].id;

    const testInput: CreateFollowInput = {
      follower_id: userId,
      followed_id: userId,
    };

    await expect(createFollow(testInput)).rejects.toThrow(/cannot follow themselves/i);
  });

  it('should prevent duplicate follows', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([testFollower, testFollowed])
      .returning()
      .execute();

    const followerId = users[0].id;
    const followedId = users[1].id;

    const testInput: CreateFollowInput = {
      follower_id: followerId,
      followed_id: followedId,
    };

    // Create initial follow
    await createFollow(testInput);

    // Attempt to create duplicate
    await expect(createFollow(testInput)).rejects.toThrow(/already exists/i);
  });

  it('should fail when follower does not exist', async () => {
    // Create only followed user
    const users = await db.insert(usersTable)
      .values([testFollowed])
      .returning()
      .execute();

    const followedId = users[0].id;
    const nonExistentUserId = 99999;

    const testInput: CreateFollowInput = {
      follower_id: nonExistentUserId,
      followed_id: followedId,
    };

    await expect(createFollow(testInput)).rejects.toThrow(/do not exist or are inactive/i);
  });

  it('should fail when followed user does not exist', async () => {
    // Create only follower user
    const users = await db.insert(usersTable)
      .values([testFollower])
      .returning()
      .execute();

    const followerId = users[0].id;
    const nonExistentUserId = 99999;

    const testInput: CreateFollowInput = {
      follower_id: followerId,
      followed_id: nonExistentUserId,
    };

    await expect(createFollow(testInput)).rejects.toThrow(/do not exist or are inactive/i);
  });

  it('should fail when follower user is inactive', async () => {
    // Create inactive follower and active followed user
    const users = await db.insert(usersTable)
      .values([testInactiveUser, testFollowed])
      .returning()
      .execute();

    const inactiveUserId = users[0].id;
    const followedId = users[1].id;

    const testInput: CreateFollowInput = {
      follower_id: inactiveUserId,
      followed_id: followedId,
    };

    await expect(createFollow(testInput)).rejects.toThrow(/do not exist or are inactive/i);
  });

  it('should fail when followed user is inactive', async () => {
    // Create active follower and inactive followed user
    const users = await db.insert(usersTable)
      .values([testFollower, testInactiveUser])
      .returning()
      .execute();

    const followerId = users[0].id;
    const inactiveUserId = users[1].id;

    const testInput: CreateFollowInput = {
      follower_id: followerId,
      followed_id: inactiveUserId,
    };

    await expect(createFollow(testInput)).rejects.toThrow(/do not exist or are inactive/i);
  });

  it('should maintain data consistency when creating multiple follows', async () => {
    // Create three users
    const users = await db.insert(usersTable)
      .values([
        testFollower,
        testFollowed,
        { ...testInactiveUser, is_active: true, username: 'third_user', email: 'third@test.com' }
      ])
      .returning()
      .execute();

    const followerId = users[0].id;
    const followed1Id = users[1].id;
    const followed2Id = users[2].id;

    // Create two follow relationships
    await createFollow({
      follower_id: followerId,
      followed_id: followed1Id,
    });

    await createFollow({
      follower_id: followerId,
      followed_id: followed2Id,
    });

    // Verify counts are correct
    const followerUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, followerId))
      .execute();

    const followedUsers = await db.select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.id, followed1Id)
        )
      )
      .union(
        db.select()
          .from(usersTable)
          .where(eq(usersTable.id, followed2Id))
      )
      .execute();

    expect(followerUser[0].following_count).toEqual(2);
    expect(followedUsers[0].followers_count).toEqual(1);
    expect(followedUsers[1].followers_count).toEqual(1);

    // Verify follow relationships exist in database
    const follows = await db.select()
      .from(followsTable)
      .where(eq(followsTable.follower_id, followerId))
      .execute();

    expect(follows).toHaveLength(2);
  });
});