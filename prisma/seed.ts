import { PrismaClient, UserRole, UserStatus, SubscriptionPlanType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Admin account
  const adminEmail = 'aplikasipunyowongkito@gmail.com';
  const adminPassword = 'AdminAdogalo2024!'; // Change this in production
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  // Create or update admin
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isVerified: true,
      verifiedAt: new Date(),
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Admin Adogalo',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  console.log(`✅ Admin created/updated: ${admin.email}`);

  // Create Platform Settings
  await prisma.platformSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      subscriptionEnabled: false,
      tukangSubscriptionPrice: 25000,
      supplierSubscriptionPrice: 49000,
      maintenanceMode: false,
    },
  });
  console.log('✅ Platform settings created');

  // Create default subscription plans for TUKANG
  const tukangPlans = [
    { name: 'Member', price: 25000, maxApplications: 20, priority: 1, sortOrder: 1 },
  ];

  for (const plan of tukangPlans) {
    await prisma.subscriptionPlanConfig.upsert({
      where: { 
        id: `tukang-${plan.name.toLowerCase().replace(/\s+/g, '-')}` 
      },
      update: plan,
      create: {
        id: `tukang-${plan.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...plan,
        type: SubscriptionPlanType.TUKANG,
        features: JSON.stringify([
          '20 lamaran per bulan',
          'Profil terverifikasi',
          'Akses semua proyek',
        ]),
      },
    });
  }
  console.log('✅ Tukang subscription plans created');

  // Create default subscription plans for SUPPLIER
  const supplierPlans = [
    { name: 'Member', price: 49000, maxApplications: 30, priority: 1, sortOrder: 1 },
  ];

  for (const plan of supplierPlans) {
    await prisma.subscriptionPlanConfig.upsert({
      where: { 
        id: `supplier-${plan.name.toLowerCase().replace(/\s+/g, '-')}` 
      },
      update: plan,
      create: {
        id: `supplier-${plan.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...plan,
        type: SubscriptionPlanType.SUPPLIER,
        features: JSON.stringify([
          '30 penawaran per bulan',
          'Profil terverifikasi',
          'Akses semua permintaan material',
        ]),
      },
    });
  }
  console.log('✅ Supplier subscription plans created');

  // Create sample categories
  const categories = [
    { name: 'Renovasi Rumah', description: 'Renovasi dan perbaikan rumah tinggal', icon: 'home' },
    { name: 'Bangun Baru', description: 'Pembangunan rumah atau gedung baru', icon: 'building' },
    { name: 'Renovasi Dapur', description: 'Renovasi dan desain dapur', icon: 'kitchen' },
    { name: 'Renovasi Kamar Mandi', description: 'Renovasi dan perbaikan kamar mandi', icon: 'bathroom' },
    { name: 'Cat & Finishing', description: 'Pengecatan dan finishing interior/eksterior', icon: 'paint' },
    { name: 'Atap & Plafon', description: 'Perbaikan dan pemasangan atap serta plafon', icon: 'roof' },
    { name: 'Listrik & Plumbing', description: 'Instalasi listrik dan plumbing', icon: 'electrical' },
    { name: 'Lanskap & Taman', description: 'Desain dan pembuatan taman', icon: 'garden' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { description: category.description, icon: category.icon },
      create: category,
    });
  }

  console.log(`✅ Created ${categories.length} categories`);

  // Create sample users for testing
  const sampleUsers = [
    {
      email: 'client@example.com',
      name: 'Budi Klien',
      role: UserRole.CLIENT,
    },
    {
      email: 'vendor@example.com',
      name: 'PT Maju Jaya',
      role: UserRole.VENDOR,
    },
    {
      email: 'tukang@example.com',
      name: 'Ahmad Tukang',
      role: UserRole.TUKANG,
      specialty: 'Tukang Batu',
      experience: 5,
    },
    {
      email: 'supplier@example.com',
      name: 'CV Material Prima',
      role: UserRole.SUPPLIER,
    },
  ];

  const userPassword = await bcrypt.hash('Password123!', 12);

  for (const userData of sampleUsers) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        password: userPassword,
        name: userData.name,
        role: userData.role,
        status: UserStatus.ACTIVE,
        isVerified: true,
        verifiedAt: new Date(),
        specialty: userData.specialty || null,
        experience: userData.experience || null,
      },
    });
  }

  console.log(`✅ Created ${sampleUsers.length} sample users`);
  console.log('\n📋 Login Credentials:');
  console.log('═══════════════════════════════════════');
  console.log('ADMIN:');
  console.log(`  Email: ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log('═══════════════════════════════════════');
  console.log('SAMPLE USERS (Password: Password123!):');
  sampleUsers.forEach(u => console.log(`  ${u.role}: ${u.email}`));
  console.log('═══════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
