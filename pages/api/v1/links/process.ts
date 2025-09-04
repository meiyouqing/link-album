import type { NextApiRequest, NextApiResponse } from "next";
import verifyUser from "@/lib/api/verifyUser";

export default async function processLink(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await verifyUser({ req, res });
  if (!user) return;

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { linkId } = req.body;

    // Get the base URL for Netlify Functions
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    // Call the Netlify Function
    const response = await fetch(`${baseUrl}/.netlify/functions/process-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ linkId }),
    });

    if (!response.ok) {
      throw new Error(`Function call failed: ${response.status}`);
    }

    const result = await response.json();

    return res.status(200).json({
      response: "Link processing started",
      details: result,
    });
  } catch (error) {
    console.error("Error calling process link function:", error);
    return res.status(500).json({
      response: "Failed to process link",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
