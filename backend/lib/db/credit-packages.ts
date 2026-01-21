// Credit package database operations

import { prisma } from './client';
import { CreditPackageWithPrice } from '../types/database';

/**
 * Get all active credit packages
 */
export async function getActiveCreditPackages(): Promise<CreditPackageWithPrice[]> {
  const packages = await prisma.creditPackage.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
  });

  return packages.map((pkg) => ({
    ...pkg,
    priceDollars: pkg.priceCents / 100,
  }));
}

/**
 * Get credit package by ID
 */
export async function getCreditPackageById(id: string) {
  const pkg = await prisma.creditPackage.findUnique({
    where: { id },
  });

  if (!pkg) return null;

  return {
    ...pkg,
    priceDollars: pkg.priceCents / 100,
  };
}

/**
 * Get credit package by Stripe price ID
 */
export async function getCreditPackageByStripePriceId(stripePriceId: string) {
  const pkg = await prisma.creditPackage.findUnique({
    where: { stripePriceId },
  });

  if (!pkg) return null;

  return {
    ...pkg,
    priceDollars: pkg.priceCents / 100,
  };
}
