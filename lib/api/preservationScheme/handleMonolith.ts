import { execSync } from "child_process";
import createFile from "../storage/createFile";
import { prisma } from "../db";
import { Link } from "@prisma/client";

const handleMonolith = async (link: Link, content: string) => {
  // Early return if monolith feature is disabled (default) or if URL is missing
  if (!process.env.ENABLE_MONOLITH || process.env.ENABLE_MONOLITH === 'false' || !link.url) return;

  try {
    let html = execSync(
      `monolith "${link.url}" ${
        process.env.MONOLITH_CUSTOM_OPTIONS || "-j -F"
      } -o -`,
      {
        timeout: 120000,
        maxBuffer: 1024 * 1024 * Number(process.env.MONOLITH_MAX_BUFFER || 5),
      }
    );

    if (!html?.length)
      return console.error("Error archiving as Monolith: Empty buffer");

    if (
      Buffer.byteLength(html) >
      1024 * 1024 * Number(process.env.MONOLITH_MAX_BUFFER || 6)
    )
      return console.error("Error archiving as Monolith: Buffer size exceeded");

    await createFile({
      data: html,
      filePath: `archives/${link.collectionId}/${link.id}.html`,
    }).then(async () => {
      await prisma.link.update({
        where: { id: link.id },
        data: {
          monolith: `archives/${link.collectionId}/${link.id}.html`,
        },
      });
    });
  } catch (err) {
    console.error("Uncaught Monolith error:", err);
  }
};

export default handleMonolith;
