import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { premiumPackagesTable } from '../db/schema';
import { type CreatePremiumPackageInput } from '../schema';
import { getPremiumPackages } from '../handlers/get_premium_packages';
import { eq } from 'drizzle-orm';

const basicPackage: CreatePremiumPackageInput = {
  name: 'Basic Premium',
  description: 'Basic premium features',
  price: 9.99,
  duration_days: 30,
  features: ['Ad-free experience', 'Basic analytics']
};

const proPackage: CreatePremiumPackageInput = {
  name: 'Pro Premium',
  description: 'Professional premium features',
  price: 19.99,
  duration_days: 30,
  features: ['All basic features', 'Advanced analytics', 'Priority support']
};

const enterprisePackage: CreatePremiumPackageInput = {
  name: 'Enterprise',
  description: 'Enterprise level features',
  price: 49.99,
  duration_days: 30,
  features: ['All pro features', 'Custom branding', 'API access']
};

describe('getPremiumPackages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no packages exist', async () => {
    const result = await getPremiumPackages();
    
    expect(result).toBeInstanceOf(Array);
    expect(result).toHaveLength(0);
  });

  it('should return only active premium packages', async () => {
    // Create active package
    await db.insert(premiumPackagesTable)
      .values({
        name: basicPackage.name,
        description: basicPackage.description,
        price: basicPackage.price.toString(),
        duration_days: basicPackage.duration_days,
        features: basicPackage.features,
        is_active: true
      })
      .execute();

    // Create inactive package
    await db.insert(premiumPackagesTable)
      .values({
        name: 'Inactive Package',
        description: 'This should not appear',
        price: '99.99',
        duration_days: 30,
        features: ['Hidden feature'],
        is_active: false
      })
      .execute();

    const result = await getPremiumPackages();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Basic Premium');
    expect(result[0].is_active).toBe(true);
  });

  it('should return packages ordered by price ascending', async () => {
    // Insert packages in reverse price order
    await db.insert(premiumPackagesTable)
      .values({
        name: enterprisePackage.name,
        description: enterprisePackage.description,
        price: enterprisePackage.price.toString(),
        duration_days: enterprisePackage.duration_days,
        features: enterprisePackage.features,
        is_active: true
      })
      .execute();

    await db.insert(premiumPackagesTable)
      .values({
        name: basicPackage.name,
        description: basicPackage.description,
        price: basicPackage.price.toString(),
        duration_days: basicPackage.duration_days,
        features: basicPackage.features,
        is_active: true
      })
      .execute();

    await db.insert(premiumPackagesTable)
      .values({
        name: proPackage.name,
        description: proPackage.description,
        price: proPackage.price.toString(),
        duration_days: proPackage.duration_days,
        features: proPackage.features,
        is_active: true
      })
      .execute();

    const result = await getPremiumPackages();

    expect(result).toHaveLength(3);
    // Should be ordered by price: Basic (9.99), Pro (19.99), Enterprise (49.99)
    expect(result[0].name).toEqual('Basic Premium');
    expect(result[0].price).toEqual(9.99);
    expect(result[1].name).toEqual('Pro Premium');
    expect(result[1].price).toEqual(19.99);
    expect(result[2].name).toEqual('Enterprise');
    expect(result[2].price).toEqual(49.99);
  });

  it('should return all required fields with correct types', async () => {
    await db.insert(premiumPackagesTable)
      .values({
        name: basicPackage.name,
        description: basicPackage.description,
        price: basicPackage.price.toString(),
        duration_days: basicPackage.duration_days,
        features: basicPackage.features,
        is_active: true
      })
      .execute();

    const result = await getPremiumPackages();

    expect(result).toHaveLength(1);
    const pkg = result[0];

    // Check all required fields exist
    expect(pkg.id).toBeDefined();
    expect(pkg.name).toEqual('Basic Premium');
    expect(pkg.description).toEqual('Basic premium features');
    expect(pkg.price).toEqual(9.99);
    expect(typeof pkg.price).toBe('number'); // Verify numeric conversion
    expect(pkg.duration_days).toEqual(30);
    expect(pkg.features).toEqual(['Ad-free experience', 'Basic analytics']);
    expect(pkg.is_active).toBe(true);
    expect(pkg.created_at).toBeInstanceOf(Date);
    expect(pkg.updated_at).toBeInstanceOf(Date);
  });

  it('should handle packages with null description', async () => {
    await db.insert(premiumPackagesTable)
      .values({
        name: 'No Description Package',
        description: null,
        price: '15.99',
        duration_days: 30,
        features: ['Some feature'],
        is_active: true
      })
      .execute();

    const result = await getPremiumPackages();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('No Description Package');
    expect(result[0].description).toBeNull();
    expect(result[0].price).toEqual(15.99);
  });

  it('should save and retrieve packages correctly in database', async () => {
    // Insert a package
    const insertResult = await db.insert(premiumPackagesTable)
      .values({
        name: proPackage.name,
        description: proPackage.description,
        price: proPackage.price.toString(),
        duration_days: proPackage.duration_days,
        features: proPackage.features,
        is_active: true
      })
      .returning()
      .execute();

    const createdPackage = insertResult[0];

    // Verify it exists in database
    const dbPackages = await db.select()
      .from(premiumPackagesTable)
      .where(eq(premiumPackagesTable.id, createdPackage.id))
      .execute();

    expect(dbPackages).toHaveLength(1);
    expect(dbPackages[0].name).toEqual('Pro Premium');
    expect(parseFloat(dbPackages[0].price)).toEqual(19.99);

    // Verify handler retrieves it correctly
    const handlerResult = await getPremiumPackages();
    expect(handlerResult).toHaveLength(1);
    expect(handlerResult[0].id).toEqual(createdPackage.id);
    expect(handlerResult[0].price).toEqual(19.99);
  });

  it('should handle mixed active and inactive packages correctly', async () => {
    // Create multiple packages with different active states
    const packages = [
      { ...basicPackage, is_active: true },
      { ...proPackage, is_active: false },
      { ...enterprisePackage, is_active: true }
    ];

    for (const pkg of packages) {
      await db.insert(premiumPackagesTable)
        .values({
          name: pkg.name,
          description: pkg.description,
          price: pkg.price.toString(),
          duration_days: pkg.duration_days,
          features: pkg.features,
          is_active: pkg.is_active
        })
        .execute();
    }

    const result = await getPremiumPackages();

    // Should only return active packages (Basic and Enterprise)
    expect(result).toHaveLength(2);
    
    // Verify correct packages returned and ordered by price
    expect(result[0].name).toEqual('Basic Premium');
    expect(result[0].price).toEqual(9.99);
    expect(result[1].name).toEqual('Enterprise');
    expect(result[1].price).toEqual(49.99);
    
    // Verify all returned packages are active
    result.forEach(pkg => {
      expect(pkg.is_active).toBe(true);
    });
  });
});