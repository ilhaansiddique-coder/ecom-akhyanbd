import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('Creating dummy admin user...');

    const email = 'admin@test.local';
    const password = 'Admin@123';
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    // Check if user already exists
    const existingUser = await prisma.$queryRaw`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (existingUser && existingUser.length > 0) {
      console.log(`✅ Admin user already exists: ${email}`);
      console.log(`   Password: ${password}`);
      return;
    }

    // Create new admin user with correct schema
    await prisma.$executeRaw`
      INSERT INTO users (
        id,
        email,
        password_hash,
        full_name,
        is_super_admin,
        email_verified,
        created_at,
        updated_at
      )
      VALUES (
        ${userId}::uuid,
        ${email},
        ${passwordHash},
        'Test Admin',
        true,
        true,
        NOW(),
        NOW()
      )
    `;

    console.log('\n✅ Admin user created successfully!\n');
    console.log(`========== LOGIN CREDENTIALS ==========`);
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role:     Super Admin`);
    console.log(`User ID:  ${userId}`);
    console.log(`========================================\n`);
    console.log('Use these credentials to log in at: http://localhost:3002/cdlogin');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
