import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('Creating dummy admin user...');

    const email = 'admin@test.local';
    const password = 'Admin@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`✅ Admin user already exists: ${email}`);
      console.log(`   Password: ${password}`);
      return;
    }

    // Create new admin user
    const adminUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'Test Admin',
        role: 'admin',
        phone: '01234567890',
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log(`\nLogin Credentials:`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`\nUser ID: ${adminUser.id}`);
    console.log(`Role: ${adminUser.role}`);

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
