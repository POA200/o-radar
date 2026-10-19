-- Add GECKO_TERMINAL to the existing ListingDiscoverySource enum
ALTER TYPE "ListingDiscoverySource" ADD VALUE IF NOT EXISTS 'GECKO_TERMINAL';
