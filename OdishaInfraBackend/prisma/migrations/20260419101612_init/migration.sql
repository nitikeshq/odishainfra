-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'DEVELOPER', 'ADMIN');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'VILLA', 'PLOT', 'DUPLEX', 'ROW_HOUSE', 'PENTHOUSE', 'STUDIO', 'FARMHOUSE', 'COMMERCIAL', 'OFFICE_SPACE', 'SHOP', 'WAREHOUSE', 'HOSPITALITY', 'MIXED_USE', 'INDUSTRIAL', 'TOWNSHIP');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('NEW_LAUNCH', 'PRE_LAUNCH', 'UNDER_CONSTRUCTION', 'READY_TO_MOVE', 'SOLD_OUT');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'VALIDATED', 'CONNECTED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CALLBACK_VALIDATED', 'CALLBACK_CONNECTED', 'NEW_PROJECT', 'PRICE_DROP', 'PLATFORM_UPDATE', 'LEAD_RECEIVED', 'KYC_UPDATE', 'SUBSCRIPTION_ALERT', 'COMMISSION_UPDATE', 'AMENITY_APPROVED', 'AMENITY_REJECTED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING');

-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "fcmToken" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otps" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "channel" "OtpChannel" NOT NULL DEFAULT 'SMS',
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyLogo" TEXT,
    "description" TEXT,
    "website" TEXT,
    "reraNumber" TEXT,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "establishedYear" INTEGER,
    "totalProjects" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "kycDocuments" JSONB,
    "kycReviewedAt" TIMESTAMP(3),
    "kycReviewNotes" TEXT,
    "commissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "commissionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "developer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "highlights" TEXT,
    "propertyType" "PropertyType" NOT NULL,
    "status" "PropertyStatus" NOT NULL,
    "listingStatus" "ListingStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "priceMin" DOUBLE PRECISION,
    "priceMax" DOUBLE PRECISION,
    "pricePerSqft" DOUBLE PRECISION,
    "emiStarting" DOUBLE PRECISION,
    "bhkConfig" TEXT,
    "areaMin" DOUBLE PRECISION,
    "areaMax" DOUBLE PRECISION,
    "plotAreaMin" DOUBLE PRECISION,
    "plotAreaMax" DOUBLE PRECISION,
    "plotAreaUnit" TEXT,
    "totalFloors" INTEGER,
    "totalUnits" INTEGER,
    "availableUnits" INTEGER,
    "totalTowers" INTEGER,
    "parkingSlots" INTEGER,
    "address" TEXT,
    "locality" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Odisha',
    "pincode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "reraNumber" TEXT,
    "reraApproved" BOOLEAN NOT NULL DEFAULT false,
    "reraCertUrl" TEXT,
    "govtApproved" BOOLEAN NOT NULL DEFAULT false,
    "govtApprovalNo" TEXT,
    "environmentClearance" BOOLEAN NOT NULL DEFAULT false,
    "buildingPermit" BOOLEAN NOT NULL DEFAULT false,
    "occupancyCert" BOOLEAN NOT NULL DEFAULT false,
    "fireSafetyCert" BOOLEAN NOT NULL DEFAULT false,
    "commencement" BOOLEAN NOT NULL DEFAULT false,
    "completionCert" BOOLEAN NOT NULL DEFAULT false,
    "approvalNotes" TEXT,
    "brochureUrl" TEXT,
    "brochureS3Key" TEXT,
    "possessionDate" TIMESTAMP(3),
    "launchDate" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "wishlistCount" INTEGER NOT NULL DEFAULT 0,
    "callbackCount" INTEGER NOT NULL DEFAULT 0,
    "shortCount" INTEGER NOT NULL DEFAULT 0,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_media" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "s3Key" TEXT,
    "mediaType" TEXT NOT NULL DEFAULT 'IMAGE',
    "type" TEXT NOT NULL DEFAULT 'image',
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floor_plans" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "area" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "floor_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_units" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "carpetArea" DOUBLE PRECISION,
    "builtUpArea" DOUBLE PRECISION,
    "superArea" DOUBLE PRECISION,
    "plotArea" DOUBLE PRECISION,
    "plotAreaUnit" TEXT,
    "price" DOUBLE PRECISION,
    "pricePerSqft" DOUBLE PRECISION,
    "bedrooms" DOUBLE PRECISION,
    "bathrooms" INTEGER,
    "balconies" INTEGER,
    "floorPlanUrl" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "totalUnits" INTEGER,
    "availableUnits" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nearby_places" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "distance" DOUBLE PRECISION,
    "distanceText" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nearby_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenity_master" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "category" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "amenity_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_amenities" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "amenityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "category" TEXT,

    CONSTRAINT "property_amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shorts" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "videoS3Key" TEXT,
    "thumbnailUrl" TEXT,
    "thumbnailS3Key" TEXT,
    "caption" TEXT,
    "duration" DOUBLE PRECISION,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "callback_requests" (
    "id" TEXT NOT NULL,
    "leadNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "bestTimeToCall" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "validatedAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "callback_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_views" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_campaigns" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL DEFAULT 'ALL',
    "targetRole" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "openRate" DOUBLE PRECISION,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthly" DOUBLE PRECISION NOT NULL,
    "maxProjects" INTEGER NOT NULL DEFAULT 5,
    "maxShorts" INTEGER NOT NULL DEFAULT 10,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_subscriptions" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "paymentRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "developer_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "subscriptionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "freeListingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxFreeProjects" INTEGER NOT NULL DEFAULT 100,
    "callbackSlaHours" INTEGER NOT NULL DEFAULT 48,
    "kycSlaHours" INTEGER NOT NULL DEFAULT 72,
    "featuredMaxCount" INTEGER NOT NULL DEFAULT 5,
    "defaultCommissionPct" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "appVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "unitType" TEXT,
    "buyerName" TEXT,
    "saleAmount" DOUBLE PRECISION NOT NULL,
    "commissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "commissionAmount" DOUBLE PRECISION NOT NULL,
    "commissionPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "message" TEXT,
    "source" TEXT NOT NULL DEFAULT 'landing_page',
    "propertyId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "otps_phone_code_idx" ON "otps"("phone", "code");

-- CreateIndex
CREATE INDEX "otps_email_code_idx" ON "otps"("email", "code");

-- CreateIndex
CREATE UNIQUE INDEX "developer_profiles_userId_key" ON "developer_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "properties_slug_key" ON "properties"("slug");

-- CreateIndex
CREATE INDEX "properties_city_propertyType_status_idx" ON "properties"("city", "propertyType", "status");

-- CreateIndex
CREATE INDEX "properties_listingStatus_idx" ON "properties"("listingStatus");

-- CreateIndex
CREATE INDEX "properties_isFeatured_idx" ON "properties"("isFeatured");

-- CreateIndex
CREATE INDEX "properties_locality_city_idx" ON "properties"("locality", "city");

-- CreateIndex
CREATE UNIQUE INDEX "amenity_master_name_key" ON "amenity_master"("name");

-- CreateIndex
CREATE INDEX "amenity_master_category_idx" ON "amenity_master"("category");

-- CreateIndex
CREATE INDEX "amenity_master_approvalStatus_idx" ON "amenity_master"("approvalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "property_amenities_propertyId_amenityId_key" ON "property_amenities"("propertyId", "amenityId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlists_userId_propertyId_key" ON "wishlists"("userId", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "callback_requests_leadNumber_key" ON "callback_requests"("leadNumber");

-- CreateIndex
CREATE INDEX "callback_requests_status_idx" ON "callback_requests"("status");

-- CreateIndex
CREATE INDEX "callback_requests_propertyId_idx" ON "callback_requests"("propertyId");

-- CreateIndex
CREATE INDEX "property_views_userId_idx" ON "property_views"("userId");

-- CreateIndex
CREATE INDEX "property_views_propertyId_idx" ON "property_views"("propertyId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "developer_subscriptions_developerId_key" ON "developer_subscriptions"("developerId");

-- CreateIndex
CREATE INDEX "sales_developerId_idx" ON "sales"("developerId");

-- CreateIndex
CREATE INDEX "sales_propertyId_idx" ON "sales"("propertyId");

-- CreateIndex
CREATE INDEX "website_leads_isRead_idx" ON "website_leads"("isRead");

-- AddForeignKey
ALTER TABLE "developer_profiles" ADD CONSTRAINT "developer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_media" ADD CONSTRAINT "property_media_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_units" ADD CONSTRAINT "property_units_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nearby_places" ADD CONSTRAINT "nearby_places_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "amenity_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shorts" ADD CONSTRAINT "shorts_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shorts" ADD CONSTRAINT "shorts_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "callback_requests" ADD CONSTRAINT "callback_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "callback_requests" ADD CONSTRAINT "callback_requests_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_views" ADD CONSTRAINT "property_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_views" ADD CONSTRAINT "property_views_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_subscriptions" ADD CONSTRAINT "developer_subscriptions_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_subscriptions" ADD CONSTRAINT "developer_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
