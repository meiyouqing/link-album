import { prisma } from "@/lib/api/db";
import fetchTitleAndHeaders from "@/lib/shared/fetchTitleAndHeaders";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { createFolder } from "@/lib/api/blobOperations";
import setCollection from "../../setCollection";
import {
  PostLinkSchema,
  PostLinkSchemaType,
} from "@/lib/shared/schemaValidation";
import { hasPassedLimit } from "../../verifyCapacity";

// Function to trigger link processing via Netlify Function
async function triggerLinkProcessing(linkId: number) {
  try {
    let functionUrl = '';
    
    // 检测运行环境并设置正确的URL
    if (process.env.NETLIFY_URL || process.env.URL) {
      // Netlify生产环境
      const baseUrl = process.env.NETLIFY_URL || process.env.URL;
      functionUrl = `${baseUrl}/.netlify/functions/process-link`;
    } else if (process.env.NODE_ENV === 'development') {
      // 本地开发环境 - 使用netlify dev的默认端口
      functionUrl = 'http://localhost:8888/.netlify/functions/process-link';
    } else {
      console.log('Unable to determine environment - skipping link processing');
      return;
    }

    console.log(`Triggering link processing for link ${linkId} at: ${functionUrl}`);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ linkId }),
    });

    if (!response.ok) {
      console.error('Failed to trigger link processing:', response.status, await response.text());
    } else {
      const result = await response.json();
      console.log('Link processing triggered successfully for link:', linkId, result);
    }
  } catch (error) {
    console.error('Error triggering link processing:', error);
    // Don't throw - we don't want to fail link creation if processing fails
  }
}

export default async function postLink(
  body: PostLinkSchemaType,
  userId: number
) {
  const dataValidation = PostLinkSchema.safeParse(body);

  if (!dataValidation.success) {
    return {
      response: `Error: ${
        dataValidation.error.issues[0].message
      } [${dataValidation.error.issues[0].path.join(", ")}]`,
      status: 400,
    };
  }

  const link = dataValidation.data;

  const linkCollection = await setCollection({
    userId,
    collectionId: link.collection?.id,
    collectionName: link.collection?.name,
  });

  if (!linkCollection)
    return { response: "Collection is not accessible.", status: 400 };

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (user?.preventDuplicateLinks) {
    const url = link.url?.trim().replace(/\/+$/, ""); // trim and remove trailing slashes from the URL
    const hasWwwPrefix = url?.includes(`://www.`);
    const urlWithoutWww = hasWwwPrefix ? url?.replace(`://www.`, "://") : url;
    const urlWithWww = hasWwwPrefix ? url : url?.replace("://", `://www.`);

    const existingLink = await prisma.link.findFirst({
      where: {
        OR: [{ url: urlWithWww }, { url: urlWithoutWww }],
        collection: {
          ownerId: userId,
        },
      },
    });

    if (existingLink)
      return {
        response: "Link already exists",
        status: 409,
      };
  }

  const hasTooManyLinks = await hasPassedLimit(userId, 1);

  if (hasTooManyLinks) {
    return {
      response: `Your subscription has reached the maximum number of links allowed.`,
      status: 400,
    };
  }

  const { title = "", headers = new Headers() } = link.url
    ? await fetchTitleAndHeaders(link.url)
    : {};

  const name =
    link.name && link.name !== "" ? link.name : link.url ? title : "";

  const contentType = headers?.get("content-type");
  let linkType = "url";
  let imageExtension = "png";

  if (!link.url) linkType = link.type || "url";
  else if (contentType === "application/pdf") linkType = "pdf";
  else if (contentType?.startsWith("image")) {
    linkType = "image";
    if (contentType === "image/jpeg") imageExtension = "jpeg";
    else if (contentType === "image/png") imageExtension = "png";
  }

  if (!link.tags) link.tags = [];

  const newLink = await prisma.link.create({
    data: {
      url: link.url?.trim() || null,
      name,
      description: link.description,
      type: linkType,
      createdBy: {
        connect: {
          id: userId,
        },
      },
      collection: {
        connect: {
          id: linkCollection.id,
        },
      },
      tags: {
        connectOrCreate: link.tags?.map((tag) => ({
          where: {
            name_ownerId: {
              name: tag.name.trim(),
              ownerId: linkCollection.ownerId,
            },
          },
          create: {
            name: tag.name.trim(),
            owner: {
              connect: {
                id: linkCollection.ownerId,
              },
            },
          },
        })),
      },
    },
    include: { tags: true, collection: true },
  });

  await prisma.link.update({
    where: { id: newLink.id },
    data: {
      image: link.image
        ? `archives/${newLink.collectionId}/${newLink.id}.${
            link.image === "png" ? "png" : "jpeg"
          }`
        : undefined,
    },
  });

  createFolder({ filePath: `archives/${newLink.collectionId}` });

  // Trigger link processing asynchronously (don't wait for it)
  if (newLink.url) {
    triggerLinkProcessing(newLink.id).catch(error => {
      console.error('Failed to trigger link processing:', error);
    });
  }

  return { response: newLink, status: 200 };
}
