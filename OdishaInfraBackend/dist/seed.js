"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const prisma_1 = __importDefault(require("./lib/prisma"));
const DEFAULT_AMENITIES = [
    // Recreation
    { name: 'Swimming Pool', icon: 'droplet', category: 'Recreation' },
    { name: 'Gymnasium', icon: 'activity', category: 'Recreation' },
    { name: 'Club House', icon: 'home', category: 'Recreation' },
    { name: "Children's Play Area", icon: 'smile', category: 'Recreation' },
    { name: 'Indoor Games', icon: 'target', category: 'Recreation' },
    { name: 'Spa & Sauna', icon: 'heart', category: 'Recreation' },
    { name: 'Party Hall', icon: 'music', category: 'Recreation' },
    { name: 'Mini Theatre', icon: 'film', category: 'Recreation' },
    // Sports
    { name: 'Tennis Court', icon: 'circle', category: 'Sports' },
    { name: 'Badminton Court', icon: 'award', category: 'Sports' },
    { name: 'Basketball Court', icon: 'disc', category: 'Sports' },
    { name: 'Cricket Pitch', icon: 'crosshair', category: 'Sports' },
    { name: 'Jogging Track', icon: 'map', category: 'Sports' },
    { name: 'Yoga Deck', icon: 'sun', category: 'Sports' },
    { name: 'Cycling Track', icon: 'navigation', category: 'Sports' },
    // Safety
    { name: '24/7 Security', icon: 'shield', category: 'Safety' },
    { name: 'CCTV Surveillance', icon: 'video', category: 'Safety' },
    { name: 'Power Backup', icon: 'zap', category: 'Safety' },
    { name: 'Fire Safety', icon: 'alert-triangle', category: 'Safety' },
    { name: 'Intercom', icon: 'phone', category: 'Safety' },
    { name: 'Gated Community', icon: 'lock', category: 'Safety' },
    { name: 'Earthquake Resistant', icon: 'alert-octagon', category: 'Safety' },
    // Convenience
    { name: 'Parking', icon: 'truck', category: 'Convenience' },
    { name: 'Elevator', icon: 'arrow-up', category: 'Convenience' },
    { name: 'Garden/Park', icon: 'sun', category: 'Convenience' },
    { name: 'Rainwater Harvesting', icon: 'cloud-rain', category: 'Convenience' },
    { name: 'Solar Power', icon: 'sunrise', category: 'Convenience' },
    { name: 'Waste Management', icon: 'trash-2', category: 'Convenience' },
    { name: 'EV Charging', icon: 'battery-charging', category: 'Convenience' },
    { name: 'Wi-Fi Enabled', icon: 'wifi', category: 'Convenience' },
    { name: 'Visitor Parking', icon: 'navigation', category: 'Convenience' },
    { name: 'ATM', icon: 'credit-card', category: 'Convenience' },
    // Lifestyle
    { name: 'Cafeteria', icon: 'coffee', category: 'Lifestyle' },
    { name: 'Convenience Store', icon: 'shopping-bag', category: 'Lifestyle' },
    { name: 'Medical Facility', icon: 'plus-circle', category: 'Lifestyle' },
    { name: 'Pet-Friendly Zone', icon: 'heart', category: 'Lifestyle' },
    { name: 'Amphitheatre', icon: 'volume-2', category: 'Lifestyle' },
    { name: 'Library', icon: 'book', category: 'Lifestyle' },
    { name: 'Co-Working Space', icon: 'monitor', category: 'Lifestyle' },
    // Infrastructure
    { name: 'Water Treatment Plant', icon: 'droplet', category: 'Infrastructure' },
    { name: 'Sewage Treatment', icon: 'settings', category: 'Infrastructure' },
    { name: 'Gas Pipeline', icon: 'wind', category: 'Infrastructure' },
    { name: 'Wide Roads', icon: 'trending-up', category: 'Infrastructure' },
    { name: 'Street Lighting', icon: 'sun', category: 'Infrastructure' },
    { name: 'Boundary Wall', icon: 'square', category: 'Infrastructure' },
];
async function main() {
    console.log('🌱 Seeding database...');
    // Seed default amenities
    for (const amenity of DEFAULT_AMENITIES) {
        await prisma_1.default.amenityMaster.upsert({
            where: { name: amenity.name },
            update: { icon: amenity.icon, category: amenity.category },
            create: {
                name: amenity.name,
                icon: amenity.icon,
                category: amenity.category,
                isDefault: true,
                approvalStatus: 'APPROVED',
                approvedAt: new Date(),
            },
        });
    }
    console.log(`✅ Seeded ${DEFAULT_AMENITIES.length} default amenities`);
    // Seed platform settings
    await prisma_1.default.platformSettings.upsert({
        where: { id: 'default' },
        update: {},
        create: {
            id: 'default',
            subscriptionEnabled: false,
            freeListingEnabled: true,
            defaultCommissionPct: 2.0,
        },
    });
    console.log('✅ Seeded platform settings (default 2% commission)');
    console.log('🎉 Seeding complete!');
}
main()
    .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma_1.default.$disconnect();
});
//# sourceMappingURL=seed.js.map