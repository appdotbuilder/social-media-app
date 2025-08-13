import { db } from '../db';
import { premiumPackagesTable } from '../db/schema';
import { type CreatePremiumPackageInput, type PremiumPackage } from '../schema';

export const createPremiumPackage = async (input: CreatePremiumPackageInput): Promise<PremiumPackage> => {
  try {
    // Insert premium package record
    const result = await db.insert(premiumPackagesTable)
      .values({
        name: input.name,
        description: input.description || null,
        price: input.price.toString(), // Convert number to string for numeric column
        duration_days: input.duration_days, // Integer column - no conversion needed
        features: input.features // JSON array - no conversion needed
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const premiumPackage = result[0];
    return {
      ...premiumPackage,
      price: parseFloat(premiumPackage.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Premium package creation failed:', error);
    throw error;
  }
};