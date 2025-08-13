import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { premiumPackagesTable } from '../db/schema';
import { type CreatePremiumPackageInput } from '../schema';
import { createPremiumPackage } from '../handlers/create_premium_package';
import { eq, gte, and } from 'drizzle-orm';

// Simple test input
const testInput: CreatePremiumPackageInput = {
  name: 'Premium Monthly',
  description: 'Monthly premium subscription with all features',
  price: 9.99,
  duration_days: 30,
  features: ['Ad-free experience', 'Priority support', 'Advanced analytics']
};

describe('createPremiumPackage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a premium package', async () => {
    const result = await createPremiumPackage(testInput);

    // Basic field validation
    expect(result.name).toEqual('Premium Monthly');
    expect(result.description).toEqual(testInput.description!);
    expect(result.price).toEqual(9.99);
    expect(typeof result.price).toBe('number');
    expect(result.duration_days).toEqual(30);
    expect(result.features).toEqual(['Ad-free experience', 'Priority support', 'Advanced analytics']);
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save premium package to database', async () => {
    const result = await createPremiumPackage(testInput);

    // Query using proper drizzle syntax
    const packages = await db.select()
      .from(premiumPackagesTable)
      .where(eq(premiumPackagesTable.id, result.id))
      .execute();

    expect(packages).toHaveLength(1);
    expect(packages[0].name).toEqual('Premium Monthly');
    expect(packages[0].description).toEqual(testInput.description!);
    expect(parseFloat(packages[0].price)).toEqual(9.99);
    expect(packages[0].duration_days).toEqual(30);
    expect(packages[0].features).toEqual(['Ad-free experience', 'Priority support', 'Advanced analytics']);
    expect(packages[0].is_active).toBe(true);
    expect(packages[0].created_at).toBeInstanceOf(Date);
    expect(packages[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create premium package without description', async () => {
    const inputWithoutDescription: CreatePremiumPackageInput = {
      name: 'Basic Premium',
      price: 4.99,
      duration_days: 7,
      features: ['Ad-free experience']
    };

    const result = await createPremiumPackage(inputWithoutDescription);

    expect(result.name).toEqual('Basic Premium');
    expect(result.description).toBeNull();
    expect(result.price).toEqual(4.99);
    expect(result.duration_days).toEqual(7);
    expect(result.features).toEqual(['Ad-free experience']);
    expect(result.is_active).toBe(true);
  });

  it('should create premium package with multiple features', async () => {
    const inputWithManyFeatures: CreatePremiumPackageInput = {
      name: 'Premium Ultimate',
      description: 'Ultimate premium package',
      price: 19.99,
      duration_days: 365,
      features: [
        'Ad-free experience',
        'Priority support',
        'Advanced analytics',
        'Custom themes',
        'Extra storage',
        'Early access to features'
      ]
    };

    const result = await createPremiumPackage(inputWithManyFeatures);

    expect(result.features).toHaveLength(6);
    expect(result.features).toContain('Custom themes');
    expect(result.features).toContain('Early access to features');
    expect(result.price).toEqual(19.99);
    expect(result.duration_days).toEqual(365);
  });

  it('should query premium packages by price range correctly', async () => {
    // Create multiple test packages
    await createPremiumPackage({
      name: 'Budget Package',
      price: 2.99,
      duration_days: 7,
      features: ['Basic features']
    });

    await createPremiumPackage(testInput); // 9.99

    await createPremiumPackage({
      name: 'Premium Package',
      price: 15.99,
      duration_days: 90,
      features: ['All features']
    });

    // Query packages in mid-price range
    const conditions = [
      gte(premiumPackagesTable.price, '5.00'), // Price stored as string
      eq(premiumPackagesTable.is_active, true)
    ];

    const packages = await db.select()
      .from(premiumPackagesTable)
      .where(and(...conditions))
      .execute();

    expect(packages.length).toBeGreaterThan(0);
    packages.forEach(pkg => {
      expect(parseFloat(pkg.price)).toBeGreaterThanOrEqual(5.00);
      expect(pkg.is_active).toBe(true);
    });

    // Verify we got the expected packages
    const packageNames = packages.map(pkg => pkg.name);
    expect(packageNames).toContain('Premium Monthly');
    expect(packageNames).toContain('Premium Package');
    expect(packageNames).not.toContain('Budget Package');
  });

  it('should handle empty features array', async () => {
    const inputWithEmptyFeatures: CreatePremiumPackageInput = {
      name: 'Minimal Package',
      price: 0.99,
      duration_days: 1,
      features: []
    };

    const result = await createPremiumPackage(inputWithEmptyFeatures);

    expect(result.features).toEqual([]);
    expect(result.features).toHaveLength(0);
    expect(result.name).toEqual('Minimal Package');
  });
});