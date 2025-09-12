import { prisma } from "@/lib/api/db";
import { Link } from "@prisma/client";
import { removeFiles } from "@/lib/api/manageLinkFiles";

export default async function deleteLink(userId: number, linkId: number) {
  if (!linkId) return { response: "Please choose a valid link.", status: 401 };

  // First get the link with its collection information directly
  const linkWithCollection = await prisma.link.findUnique({
    where: { id: linkId },
    select: { 
      id: true, 
      collectionId: true,
      collection: {
        select: {
          id: true,
          ownerId: true,
          members: {
            select: {
              userId: true,
              canDelete: true
            }
          }
        }
      }
    }
  });

  if (!linkWithCollection) {
    return { response: "Link not found or already deleted.", status: 404 };
  }

  // Check permissions directly on the collection
  const collection = linkWithCollection.collection;
  const memberHasAccess = collection.members.some(
    (member) => member.userId === userId && member.canDelete
  );

  if (!(collection.ownerId === userId || memberHasAccess)) {
    return { response: "Collection is not accessible.", status: 401 };
  }

  try {
    const deleteLink: Link = await prisma.link.delete({
      where: {
        id: linkId,
      },
    });

    removeFiles(linkId, collection.id);

    return { response: deleteLink, status: 200 };
  } catch (error) {
    // Handle case where link was deleted between our check and the actual deletion
    if ((error as any).code === 'P2025') { // Prisma "Record not found" error
      return { response: "Link not found or already deleted.", status: 404 };
    }
    throw error;
  }
}
