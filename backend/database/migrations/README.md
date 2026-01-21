# Database Migrations

## Initial Setup

### Option 1: Using Prisma Migrate (Recommended)

```bash
# Generate Prisma Client
npx prisma generate

# Create initial migration from schema
npx prisma migrate dev --name init

# Apply migrations
npx prisma migrate deploy
```

### Option 2: Using SQL Schema Directly

If you prefer to use the SQL schema file directly:

```bash
# Create database
createdb tarot_db

# Run schema
psql -d tarot_db < database/schema.sql

# Generate Prisma Client (still needed for TypeScript)
npx prisma generate
```

## Seed Data

After running migrations, seed the database:

```bash
npx prisma db seed
```

This creates:
- Credit packages
- Reading types
- Spread types
- System configuration

## Future Migrations

When you need to modify the schema:

1. Update `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name your_migration_name`
3. Prisma will generate SQL migration files automatically
