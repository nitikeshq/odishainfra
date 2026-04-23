import 'dotenv/config';
import prisma from './lib/prisma';

async function main() {
  console.log('🌱 Seeding test properties...');

  const devUser = await prisma.user.upsert({
    where: { phone: '+919999999999' },
    update: { isVerified: true },
    create: { phone: '+919999999999', name: 'Skyline Developers', role: 'DEVELOPER', isVerified: true },
  });
  const dev1 = await prisma.developerProfile.upsert({
    where: { userId: devUser.id },
    update: {},
    create: { userId: devUser.id, companyName: 'Skyline Developers Pvt Ltd', description: 'Premium real estate developers in Odisha with 15+ years of experience.', kycStatus: 'APPROVED', totalProjects: 12 },
  });

  const devUser2 = await prisma.user.upsert({
    where: { phone: '+919988776655' },
    update: { isVerified: true },
    create: { phone: '+919988776655', name: 'Utkal Realty', role: 'DEVELOPER', isVerified: true },
  });
  const dev2 = await prisma.developerProfile.upsert({
    where: { userId: devUser2.id },
    update: {},
    create: { userId: devUser2.id, companyName: 'Utkal Realty', description: 'Trusted builder delivering quality homes across Bhubaneswar and Cuttack.', kycStatus: 'APPROVED', totalProjects: 8 },
  });

  const props = [
    {
      developerId: dev1.id, name: 'Azure Heights', slug: 'azure-heights-bhubaneswar',
      description: 'Landmark residential tower offering premium 2 & 3 BHK apartments with world-class amenities and panoramic city views.',
      highlights: 'RERA Approved,Rooftop Pool,24/7 Security,EV Charging,Club House',
      propertyType: 'APARTMENT', status: 'NEW_LAUNCH', listingStatus: 'ACTIVE', isFeatured: true,
      priceMin: 4500000, priceMax: 8500000, pricePerSqft: 4200, emiStarting: 32000,
      bhkConfig: '2/3 BHK', areaMin: 1050, areaMax: 1980, totalFloors: 22, totalUnits: 264, availableUnits: 187, totalTowers: 3,
      address: 'Plot 42, Jaydev Vihar', locality: 'Jaydev Vihar', city: 'Bhubaneswar', pincode: '751013',
      latitude: 20.2961, longitude: 85.8189, reraNumber: 'RP/01/2024/00123', reraApproved: true, govtApproved: true,
    },
    {
      developerId: dev1.id, name: 'Pearl Residency', slug: 'pearl-residency-patia',
      description: 'Luxurious 3 & 4 BHK apartments in Patia with lush green landscapes and proximity to Infosys and TCS campuses.',
      highlights: 'Gated Community,Gymnasium,Kids Play Area,Jogging Track,Solar Power',
      propertyType: 'APARTMENT', status: 'UNDER_CONSTRUCTION', listingStatus: 'ACTIVE', isFeatured: true,
      priceMin: 7200000, priceMax: 14000000, pricePerSqft: 5100, emiStarting: 52000,
      bhkConfig: '3/4 BHK', areaMin: 1400, areaMax: 2750, totalFloors: 18, totalUnits: 144, availableUnits: 89, totalTowers: 2,
      address: 'Sector 7, Patia', locality: 'Patia', city: 'Bhubaneswar', pincode: '751024',
      latitude: 20.3527, longitude: 85.8191, reraNumber: 'RP/01/2024/00187', reraApproved: true, govtApproved: true,
    },
    {
      developerId: dev2.id, name: 'Utkal Greens', slug: 'utkal-greens-cuttack',
      description: 'Affordable premium 2 BHK homes in a peaceful green neighbourhood of Cuttack, designed for families who value quality living.',
      highlights: 'RERA Approved,24/7 Water Supply,Power Backup,Community Hall,Lift',
      propertyType: 'APARTMENT', status: 'READY_TO_MOVE', listingStatus: 'ACTIVE', isFeatured: false,
      priceMin: 2800000, priceMax: 4200000, pricePerSqft: 3200, emiStarting: 20000,
      bhkConfig: '2 BHK', areaMin: 880, areaMax: 1320, totalFloors: 8, totalUnits: 96, availableUnits: 22, totalTowers: 2,
      address: 'Sector 9, CDA', locality: 'CDA', city: 'Cuttack', pincode: '753014',
      latitude: 20.4625, longitude: 85.8828, reraNumber: 'RP/02/2023/00056', reraApproved: true, govtApproved: true,
    },
    {
      developerId: dev2.id, name: 'Sunrise Villas', slug: 'sunrise-villas-puri',
      description: 'Exclusive beachside 4 & 5 BHK villas just 2 km from Puri sea beach with private pools, landscaped gardens, and direct sea views.',
      highlights: 'Sea View,Private Pool,Smart Home,24/7 Security,Vastu Compliant',
      propertyType: 'VILLA', status: 'NEW_LAUNCH', listingStatus: 'ACTIVE', isFeatured: true,
      priceMin: 22000000, priceMax: 45000000, pricePerSqft: 8500, emiStarting: 160000,
      bhkConfig: '4/5 BHK', areaMin: 2800, areaMax: 5200, totalFloors: 2, totalUnits: 24, availableUnits: 18, totalTowers: 0,
      address: 'Sea Breeze Road', locality: 'Sea Beach Road', city: 'Puri', pincode: '752002',
      latitude: 19.7993, longitude: 85.8311, reraNumber: 'RP/03/2024/00092', reraApproved: true, govtApproved: false,
    },
    {
      developerId: dev1.id, name: 'Tech Square', slug: 'tech-square-bbsr',
      description: 'Modern Grade-A commercial office spaces and retail shops in the fastest-growing business district of Bhubaneswar.',
      highlights: 'Grade-A Office,High-Speed Elevators,Backup Power,CCTV,Central AC',
      propertyType: 'COMMERCIAL', status: 'UNDER_CONSTRUCTION', listingStatus: 'ACTIVE', isFeatured: false,
      priceMin: 5500000, priceMax: 25000000, pricePerSqft: 6500,
      areaMin: 600, areaMax: 4000, totalFloors: 12, totalUnits: 80, availableUnits: 60, totalTowers: 1,
      address: 'Mancheswar Industrial Estate', locality: 'Mancheswar', city: 'Bhubaneswar', pincode: '751010',
      latitude: 20.2681, longitude: 85.8491, reraApproved: false, govtApproved: true,
    },
    {
      developerId: dev2.id, name: 'Sambalpur Heights', slug: 'sambalpur-heights',
      description: 'Premium 2 & 3 BHK apartments in Sambalpur, close to VSS University and major hospitals.',
      highlights: 'RERA Approved,Rooftop Garden,Gym,Kids Park,24/7 Security',
      propertyType: 'APARTMENT', status: 'PRE_LAUNCH', listingStatus: 'ACTIVE', isFeatured: false,
      priceMin: 3200000, priceMax: 5800000, pricePerSqft: 3800, emiStarting: 24000,
      bhkConfig: '2/3 BHK', areaMin: 950, areaMax: 1550, totalFloors: 14, totalUnits: 112, availableUnits: 112, totalTowers: 2,
      address: 'Ainthapali', locality: 'Ainthapali', city: 'Sambalpur', pincode: '768004',
      latitude: 21.4669, longitude: 83.9812, reraNumber: 'RP/05/2024/00044', reraApproved: true, govtApproved: true,
    },
    {
      developerId: dev1.id, name: 'Greenfield Township', slug: 'greenfield-township-bbsr',
      description: 'A self-contained township over 25 acres with 1/2/3 BHK apartments, row houses, schools, hospital, and shopping complex — all in one address.',
      highlights: 'Township,Schools Inside,Hospital,Shopping Complex,Lake View',
      propertyType: 'TOWNSHIP', status: 'UNDER_CONSTRUCTION', listingStatus: 'ACTIVE', isFeatured: true,
      priceMin: 1800000, priceMax: 12000000, pricePerSqft: 3400, emiStarting: 13000,
      bhkConfig: '1/2/3 BHK', areaMin: 550, areaMax: 3500, totalFloors: 15, totalUnits: 800, availableUnits: 540, totalTowers: 8,
      address: 'Sundarpada', locality: 'Sundarpada', city: 'Bhubaneswar', pincode: '751002',
      latitude: 20.2201, longitude: 85.7748, reraNumber: 'RP/01/2023/00211', reraApproved: true, govtApproved: true,
    },
    {
      developerId: dev2.id, name: 'Rourkela Elites', slug: 'rourkela-elites',
      description: 'Premium 3 BHK apartments in the steel city for SAIL/NTPC professionals. Spacious layouts with modern finishes.',
      highlights: 'Power Backup,Gym,CCTV,Parking,Vastu Compliant',
      propertyType: 'APARTMENT', status: 'READY_TO_MOVE', listingStatus: 'ACTIVE', isFeatured: false,
      priceMin: 4200000, priceMax: 7500000, pricePerSqft: 4000, emiStarting: 31000,
      bhkConfig: '3 BHK', areaMin: 1200, areaMax: 1900, totalFloors: 10, totalUnits: 80, availableUnits: 15, totalTowers: 2,
      address: 'Civil Township', locality: 'Civil Township', city: 'Rourkela', pincode: '769004',
      latitude: 22.2604, longitude: 84.8536, reraNumber: 'RP/04/2022/00033', reraApproved: true, govtApproved: true,
    },
  ];

  let count = 0;
  for (const p of props) {
    await prisma.property.upsert({
      where: { slug: p.slug },
      update: { listingStatus: 'ACTIVE', isFeatured: p.isFeatured },
      create: p as any,
    });
    count++;
    console.log(`  ✓ ${p.name} (${p.city})`);
  }

  console.log(`\n✅ ${count} properties seeded!`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
