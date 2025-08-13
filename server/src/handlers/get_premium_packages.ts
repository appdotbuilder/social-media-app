import { db } from '../db';
import { premiumPackagesTable } from '../db/schema';
import { type PremiumPackage } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getPremiumPackages = async (): Promise<PremiumPackage[]> => {
  try {
    const results = await db.select()
      .from(premiumPackagesTable)
      .where(eq(premiumPackagesTable.is_active, true))
      .orderBy(asc(premiumPackagesTable.price))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(pkg => ({
      ...pkg,
      price: parseFloat(pkg.price) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to get premium packages:', error);
    throw error;
  }
};