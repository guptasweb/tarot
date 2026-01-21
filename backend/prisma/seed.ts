// Seed script for initial database data
// Run with: npx prisma db seed

import { PrismaClient } from '@prisma/client';
import { seedReadingTypes } from './seeds/reading-types';
import { seedSpreadTypes } from './seeds/spread-types';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed credit packages
  console.log('📦 Creating credit packages...');
  const creditPackages = [
    {
      name: 'Single Reading',
      credits: 1,
      priceCents: 499, // $4.99
      description: 'Perfect for a single tarot reading',
      displayOrder: 1,
      isActive: true,
    },
    {
      name: '3-Pack',
      credits: 3,
      priceCents: 1299, // $12.99 (save $2.98)
      description: 'Get 3 readings at a discounted price',
      displayOrder: 2,
      isActive: true,
    },
    {
      name: '5-Pack',
      credits: 5,
      priceCents: 1999, // $19.99 (save $4.96)
      description: 'Best value - 5 readings with maximum savings',
      displayOrder: 3,
      isActive: true,
    },
  ];

  for (const pkg of creditPackages) {
    await prisma.creditPackage.upsert({
      where: { name: pkg.name },
      update: pkg,
      create: pkg,
    });
  }

  // Seed reading types
  await seedReadingTypes();

  // Seed spread types
  await seedSpreadTypes();

  // Seed system config
  console.log('⚙️ Creating system configuration...');
  const systemConfigs = [
    {
      key: 'maintenance_mode',
      value: false,
      description: 'Enable to prevent new sessions',
    },
    {
      key: 'max_concurrent_sessions_per_guest',
      value: 3,
      description: 'Prevent abuse',
    },
    {
      key: 'session_cleanup_hours',
      value: 720,
      description: 'Delete expired sessions after 30 days',
    },
    {
      key: 'transcript_expiry_days',
      value: 90,
      description: 'Auto-delete transcripts after 90 days',
    },
    {
      key: 'max_message_length',
      value: 2000,
      description: 'Character limit per message',
    },
    {
      key: 'rate_limit_messages_per_hour',
      value: 100,
      description: 'Prevent spam',
    },
    {
      key: 'guest_session_expiry_days',
      value: 30,
      description: 'Guest sessions expire after 30 days',
    },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, description: config.description },
      create: config,
    });
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
