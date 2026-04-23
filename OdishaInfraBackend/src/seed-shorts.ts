import 'dotenv/config';
import prisma from './lib/prisma';

async function main() {
  console.log('🎬 Seeding test shorts...');

  // Get existing developers and properties
  const devUser1 = await prisma.user.findUnique({ where: { phone: '+919999999999' } });
  const devUser2 = await prisma.user.findUnique({ where: { phone: '+919988776655' } });
  const properties = await prisma.property.findMany({ take: 8, orderBy: { createdAt: 'asc' } });

  if (!devUser1 || !devUser2 || properties.length === 0) {
    console.log('❌ Run seed-test.ts first to create developers and properties');
    return;
  }

  // Free public MP4 sample videos (Cloudinary + Pexels CDN)
  const shorts = [
    {
      propertyId: properties[0].id, // Azure Heights
      uploaderId: devUser1.id,
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/w_480,h_854,c_fill,q_auto/samples/elephants.mp4',
      thumbnailUrl: 'https://res.cloudinary.com/demo/video/upload/so_0,w_480,h_854,c_fill/samples/elephants.jpg',
      caption: '🏙️ Azure Heights — Bhubaneswar\'s tallest new launch! 2 & 3 BHK from ₹45L. Book now and get early bird pricing! #AzureHeights #Bhubaneswar #NewLaunch',
      duration: 28, viewCount: 4821, likeCount: 312,
    },
    {
      propertyId: properties[1].id, // Pearl Residency
      uploaderId: devUser1.id,
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/w_480,h_854,c_fill,q_auto/samples/sea-turtle.mp4',
      thumbnailUrl: 'https://res.cloudinary.com/demo/video/upload/so_0,w_480,h_854,c_fill/samples/sea-turtle.jpg',
      caption: '🌿 Pearl Residency Patia — Walk through our model apartment! 3BHK with lake-facing balcony. Near Infosys & TCS. ₹72L onwards. #PearlResidency #Patia',
      duration: 35, viewCount: 3102, likeCount: 198,
    },
    {
      propertyId: properties[2].id, // Utkal Greens
      uploaderId: devUser2.id,
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/w_480,h_854,c_fill,q_auto/samples/cld-sample-video.mp4',
      thumbnailUrl: 'https://res.cloudinary.com/demo/video/upload/so_0,w_480,h_854,c_fill/samples/landscapes/landscape-panorama.jpg',
      caption: '🏡 Utkal Greens Cuttack — Ready to move 2BHK starting ₹28L! CDA Sector 9, Cuttack. RERA approved. Visit site today! #UtkalGreens #Cuttack #ReadyToMove',
      duration: 22, viewCount: 1893, likeCount: 145,
    },
    {
      propertyId: properties[3].id, // Sunrise Villas
      uploaderId: devUser2.id,
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/w_480,h_854,c_fill,q_auto/samples/dance-2.mp4',
      thumbnailUrl: 'https://res.cloudinary.com/demo/video/upload/so_0,w_480,h_854,c_fill/samples/landscapes/beach-panorama.jpg',
      caption: '🌊 Sunrise Villas Puri — Private pool beachside villa just 2km from Puri beach! 4 & 5 BHK from ₹2.2Cr. Limited units! #SunriseVillas #Puri #LuxuryVilla',
      duration: 42, viewCount: 9341, likeCount: 876,
    },
    {
      propertyId: properties[6].id, // Greenfield Township
      uploaderId: devUser1.id,
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/w_480,h_854,c_fill,q_auto/samples/dance-3.mp4',
      thumbnailUrl: 'https://res.cloudinary.com/demo/video/upload/so_0,w_480,h_854,c_fill/samples/landscapes/architecture-signs.jpg',
      caption: '🏘️ Greenfield Township — 25 acres of integrated living in Bhubaneswar! Schools, hospital, shopping — all inside. 1BHK from ₹18L! #Greenfield #Township #BBSR',
      duration: 38, viewCount: 6204, likeCount: 521,
    },
    {
      propertyId: properties[5].id, // Sambalpur Heights
      uploaderId: devUser2.id,
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/w_480,h_854,c_fill,q_auto/samples/oceans/prediving-360.mp4',
      thumbnailUrl: 'https://res.cloudinary.com/demo/video/upload/so_0,w_480,h_854,c_fill/samples/landscapes/nature-mountains.jpg',
      caption: '🏔️ Sambalpur Heights — Pre-launch offer! Book your 2BHK from ₹32L near VSS Medical College, Sambalpur. RERA approved! #Sambalpur #PreLaunch',
      duration: 30, viewCount: 1124, likeCount: 89,
    },
  ];

  let count = 0;
  for (const s of shorts) {
    await prisma.short.create({ data: s });
    count++;
    const prop = properties.find(p => p.id === s.propertyId);
    console.log(`  ✓ Short for ${prop?.name}`);
  }

  console.log(`\n✅ ${count} shorts seeded!`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
