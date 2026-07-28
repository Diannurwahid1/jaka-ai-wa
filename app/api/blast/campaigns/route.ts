import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  executeCampaignNow,
} from "@/lib/blast";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    const campaign = await getCampaign(session.businessId, id);
    if (!campaign) {
      return NextResponse.json(
        { ok: false, reason: "Campaign not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, campaign });
  }

  const campaigns = await listCampaigns(session.businessId);
  return NextResponse.json({ ok: true, campaigns });
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const action = body?.action;

    // Execute campaign now
    if (action === "execute") {
      const campaignId = body?.campaignId;
      if (!campaignId) {
        return NextResponse.json(
          { ok: false, reason: "campaignId is required" },
          { status: 400 }
        );
      }
      const result = await executeCampaignNow(session.businessId, campaignId);
      return NextResponse.json({ ok: true, result });
    }

    // Create new campaign
    const { name, targetType, socialPlatforms, intervalMinutes, endDate, targets, items } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { ok: false, reason: "name is required" },
        { status: 400 }
      );
    }

    const campaign = await createCampaign(session.businessId, {
      name,
      targetType,
      socialPlatforms,
      intervalMinutes,
      endDate,
      targets,
      items,
    });

    return NextResponse.json({ ok: true, campaign });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, reason: "id is required" },
        { status: 400 }
      );
    }

    const campaign = await updateCampaign(session.businessId, id, data);
    return NextResponse.json({ ok: true, campaign });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession();
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { ok: false, reason: "id is required" },
        { status: 400 }
      );
    }

    await deleteCampaign(session.businessId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
