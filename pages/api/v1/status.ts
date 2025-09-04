import type { NextApiRequest, NextApiResponse } from "next";
import verifyUser from "@/lib/api/verifyUser";
import { prisma } from "@/lib/api/db";

export default async function status(req: NextApiRequest, res: NextApiResponse) {
  const user = await verifyUser({ req, res });
  if (!user) return;

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Get pending links count
    const pendingLinksCount = await prisma.link.count({
      where: {
        url: { not: null },
        OR: [
          { image: null },
          { pdf: null },
          { readable: null },
          { monolith: null },
        ],
        collection: {
          ownerId: user.id,
        },
      },
    });

    // Get recent links
    const recentLinks = await prisma.link.findMany({
      where: {
        collection: {
          ownerId: user.id,
        },
      },
      orderBy: { lastPreserved: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        url: true,
        lastPreserved: true,
        image: true,
        pdf: true,
        readable: true,
        monolith: true,
      },
    });

    // Check if running on Netlify
    const isNetlify = process.env.NETLIFY === "true";
    const netlifyUrl = process.env.URL || process.env.NETLIFY_URL;

    return res.status(200).json({
      response: {
        pendingLinksCount,
        recentLinks,
        environment: {
          isNetlify,
          netlifyUrl,
          functionsEnabled: isNetlify,
        },
        lastChecked: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error getting status:", error);
    return res.status(500).json({
      response: "Failed to get status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
