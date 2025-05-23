import type { NextApiRequest, NextApiResponse } from "next";
import * as process from "process";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({ response: getEnvData() });
}

export const getEnvData = () => {
  return {
    DISABLE_REGISTRATION:
      process.env.NEXT_PUBLIC_DISABLE_REGISTRATION === "true" || null,
    ADMIN: Number(process.env.NEXT_PUBLIC_ADMIN) || null,
    RSS_POLLING_INTERVAL_MINUTES:
      Number(process.env.NEXT_PUBLIC_RSS_POLLING_INTERVAL_MINUTES) || null,
    EMAIL_PROVIDER: process.env.NEXT_PUBLIC_EMAIL_PROVIDER === "true" || null,
    MAX_FILE_BUFFER: Number(process.env.NEXT_PUBLIC_MAX_FILE_BUFFER) || null,
    AI_ENABLED: !!process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT_URL || null,
  };
};
