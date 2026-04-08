import { notFound } from "next/navigation";

import { CreatorClient } from "@/components/creator/creator-client";
import { CreatorPlatform } from "@/types/creator";

const allowedPlatforms: CreatorPlatform[] = ["threads", "instagram", "linkedin", "facebook"];

export default function CreatorPlatformPage({ params }: { params: { platform: string } }) {
  const platform = params.platform.toLowerCase() as CreatorPlatform;

  if (!allowedPlatforms.includes(platform)) {
    notFound();
  }

  return <CreatorClient platform={platform} />;
}
