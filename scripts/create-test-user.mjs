import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🔧 Creating test user in Neon...\n');

    const email = 'testadmin@akhiyan.com';
    const password = 'TestAdmin@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if exists
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      console.log(`✅ Test user already exists!\n`);
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}\n`);
      console.log(`Is Admin: ${existing.isSuperAdmin}`);
      return;
    }

    // Create new admin user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        fullName: 'Test Admin',
        phone: '01700000099',
        emailVerified: true,
        isSuperAdmin: true
      }
    });

    console.log('✅ TEST ADMIN USER CREATED SUCCESSFULLY!\n');
    console.log('╔════════════════════════════════════╗');
    console.log('║        LOGIN CREDENTIALS            ║');
    console.log('╚════════════════════════════════════╝\n');
    console.log(`  📧 Email:    ${email}`);
    console.log(`  🔐 Password: ${password}\n`);
    console.log('API Login URL: POST /api/v1/auth/login');
    console.log('Dashboard Login: http://localhost:3000/cdlogin\n');
    console.log('User ID: ' + user.id);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
