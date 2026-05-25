import { prisma } from "@/lib/prisma";

export type BusinessSummary = {
  id: string;
  slug: string;
  name: string;
  isDefault: boolean;
};

export type BusinessProfile = {
  id: string;
  slug: string;
  name: string;
  niche: string;
  brandSummary: string;
  audience: string;
  brandVisualStyle: string;
  isDefault: boolean;
};

function mapBusiness(business: { id: string; slug: string; name: string; isDefault: boolean }): BusinessSummary {
  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    isDefault: business.isDefault
  };
}

export async function getBusinessById(businessId: string) {
  if (!businessId.trim()) {
    return null;
  }

  const business = await prisma.business.findUnique({ where: { id: businessId.trim() } });
  return business ? mapBusiness(business) : null;
}

export async function getBusinessProfileById(businessId: string): Promise<BusinessProfile | null> {
  if (!businessId.trim()) {
    return null;
  }

  const business = await prisma.business.findUnique({ where: { id: businessId.trim() } });
  if (!business) return null;

  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    niche: business.niche,
    brandSummary: business.brandSummary,
    audience: business.audience,
    brandVisualStyle: business.brandVisualStyle,
    isDefault: business.isDefault
  };
}

export async function getDefaultBusiness() {
  const business = await prisma.business.findFirst({ where: { isDefault: true }, orderBy: { createdAt: "asc" } });
  return business ? mapBusiness(business) : null;
}

export async function ensureDefaultBusiness() {
  const existing = await getDefaultBusiness();
  if (existing) {
    return existing;
  }

  const created = await prisma.business.create({
    data: {
      slug: "default-business",
      name: "Default Business",
      isDefault: true
    }
  });

  return mapBusiness(created);
}

export async function findBusinessByWaSessionId(waSessionId: string) {
  const trimmed = waSessionId.trim();
  if (!trimmed) {
    return null;
  }

  const config = await prisma.appConfig.findFirst({
    where: { waSessionId: trimmed },
    include: { business: true }
  });

  return config?.business ? mapBusiness(config.business) : null;
}

export async function listBusinesses() {
  const businesses = await prisma.business.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
  });
  return businesses.map(mapBusiness);
}

export async function updateBusinessProfile(
  businessId: string,
  patch: Partial<Pick<{ name: string; niche: string; brandSummary: string; audience: string; brandVisualStyle: string; slug: string }, "name" | "niche" | "brandSummary" | "audience" | "brandVisualStyle" | "slug">>
) {
  const data: Record<string, string> = {};
  if (typeof patch.name === "string") data.name = patch.name.trim();
  if (typeof patch.slug === "string") data.slug = patch.slug.trim();
  if (typeof patch.niche === "string") data.niche = patch.niche.trim();
  if (typeof patch.brandSummary === "string") data.brandSummary = patch.brandSummary.trim();
  if (typeof patch.audience === "string") data.audience = patch.audience.trim();
  if (typeof patch.brandVisualStyle === "string") data.brandVisualStyle = patch.brandVisualStyle.trim();

  const updated = await prisma.business.update({
    where: { id: businessId },
    data
  });

  return mapBusiness(updated);
}
