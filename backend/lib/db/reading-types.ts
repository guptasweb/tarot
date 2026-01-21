// Reading type database operations

import { prisma } from './client';

/**
 * Get all active reading types
 */
export async function getActiveReadingTypes() {
  return prisma.readingType.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
  });
}

/**
 * Get featured reading types
 */
export async function getFeaturedReadingTypes() {
  return prisma.readingType.findMany({
    where: {
      isActive: true,
      isFeatured: true,
    },
    orderBy: { displayOrder: 'asc' },
  });
}

/**
 * Get reading type by slug
 */
export async function getReadingTypeBySlug(slug: string) {
  return prisma.readingType.findUnique({
    where: { slug },
  });
}

/**
 * Get reading type by ID
 */
export async function getReadingTypeById(id: string) {
  return prisma.readingType.findUnique({
    where: { id },
  });
}
