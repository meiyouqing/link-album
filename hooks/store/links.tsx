import {
  InfiniteData,
  useInfiniteQuery,
  UseInfiniteQueryResult,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ArchivedFormat,
  LinkIncludingShortenedCollectionAndTags,
  LinkRequestQuery,
} from "@/types/global";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { PostLinkSchemaType } from "@/lib/shared/schemaValidation";
import { uploadFile } from "@/lib/client/blobOperations";

const useLinks = (params: LinkRequestQuery = {}) => {
  const router = useRouter();

  const queryParamsObject = {
    sort: params.sort ?? Number(window.localStorage.getItem("sortBy")) ?? 0,
    collectionId:
      params.collectionId ?? router.pathname === "/collections/[id]"
        ? router.query.id
        : undefined,
    tagId:
      params.tagId ?? router.pathname === "/tags/[id]"
        ? router.query.id
        : undefined,
    pinnedOnly:
      params.pinnedOnly ?? router.pathname === "/links/pinned"
        ? true
        : undefined,
    searchQueryString: params.searchQueryString,
    searchByName: params.searchByName,
    searchByUrl: params.searchByUrl,
    searchByDescription: params.searchByDescription,
    searchByTextContent: params.searchByTextContent,
    searchByTags: params.searchByTags,
  } as LinkRequestQuery;

  const queryString = buildQueryString(queryParamsObject);

  const { data, ...rest } = useFetchLinks(queryString);

  const links = useMemo(() => {
    return data?.pages.reduce((acc, page) => {
      return [...acc, ...page];
    }, []);
  }, [data]);

  return {
    links,
    data: { ...data, ...rest },
  } as {
    links: LinkIncludingShortenedCollectionAndTags[];
    data: UseInfiniteQueryResult<InfiniteData<any, unknown>, Error>;
  };
};

const useFetchLinks = (params: string) => {
  const { status } = useSession();

  return useInfiniteQuery({
    queryKey: ["links", { params }],
    queryFn: async (params) => {
      const response = await fetch(
        "/api/v1/links?cursor=" +
          params.pageParam +
          ((params.queryKey[1] as any).params
            ? "&" + (params.queryKey[1] as any).params
            : "")
      );
      const data = await response.json();

      return data.response;
    },
    initialPageParam: 0,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) {
        return undefined;
      }
      return lastPage.at(-1).id;
    },
    enabled: status === "authenticated",
  });
};

const buildQueryString = (params: LinkRequestQuery) => {
  return Object.keys(params)
    .filter((key) => params[key as keyof LinkRequestQuery] !== undefined)
    .map(
      (key) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(
          params[key as keyof LinkRequestQuery] as string
        )}`
    )
    .join("&");
};

const useAddLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (link: PostLinkSchemaType) => {
      if (link.url || link.type === "url") {
        try {
          new URL(link.url || "");
        } catch (error) {
          throw new Error("invalid_url_guide");
        }
      }

      const response = await fetch("/api/v1/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(link),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.response);

      return data.response;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["dashboardData"], (oldData: any) => {
        if (!oldData?.links) return undefined;
        return {
          ...oldData,
          links: [data, ...oldData?.links],
        };
      });

      queryClient.setQueriesData({ queryKey: ["links"] }, (oldData: any) => {
        if (!oldData) return undefined;
        return {
          pages: [[data, ...oldData?.pages[0]], ...oldData?.pages.slice(1)],
          pageParams: oldData?.pageParams,
        };
      });

      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["publicLinks"] });
    },
  });
};

const useUpdateLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (link: LinkIncludingShortenedCollectionAndTags) => {
      const response = await fetch(`/api/v1/links/${link.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(link),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.response);

      return data.response;
    },
    onSuccess: (data) => {
      // queryClient.setQueryData(["dashboardData"], (oldData: any) => {
      //   if (!oldData?.links) return undefined;
      //   return oldData.links.map((e: any) => (e.id === data.id ? data : e));
      // });

      // queryClient.setQueriesData({ queryKey: ["links"] }, (oldData: any) => {
      //   if (!oldData) return undefined;
      //   return {
      //     pages: oldData.pages.map((page: any) =>
      //       page.map((item: any) => (item.id === data.id ? data : item))
      //     ),
      //     pageParams: oldData.pageParams,
      //   };
      // });

      queryClient.invalidateQueries({ queryKey: ["links"] }); // Temporary workaround
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] }); // Temporary workaround

      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["publicLinks"] });
    },
  });
};

const useDeleteLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/v1/links/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      // Handle 404 as success since the goal was to delete the link
      if (response.status === 404) {
        return { id, message: "Link was already deleted" };
      }

      // Handle 401 with a more user-friendly message
      if (response.status === 401) {
        throw new Error("You don't have permission to delete this link, or the link may have been moved to another collection.");
      }

      if (!response.ok) throw new Error(data.response);

      return data.response;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["dashboardData"], (oldData: any) => {
        if (!oldData?.links) return undefined;
        return {
          ...oldData,
          links: oldData.links.filter((e: any) => e.id !== data.id),
        };
      });

      queryClient.setQueriesData({ queryKey: ["links"] }, (oldData: any) => {
        if (!oldData) return undefined;
        return {
          pages: oldData.pages.map((page: any) =>
            page.filter((item: any) => item.id !== data.id)
          ),
          pageParams: oldData.pageParams,
        };
      });

      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["publicLinks"] });
    },
  });
};

const useGetLink = () => {
  const queryClient = useQueryClient();

  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      id,
      isPublicRoute = router.pathname.startsWith("/public") ? true : undefined,
    }: {
      id: number;
      isPublicRoute?: boolean;
    }) => {
      const path = isPublicRoute
        ? `/api/v1/public/links/${id}`
        : `/api/v1/links/${id}`;

      const response = await fetch(path);
      const data = await response.json();

      if (!response.ok) throw new Error(data.response);

      return data.response;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["dashboardData"], (oldData: any) => {
        if (!oldData?.links) return undefined;
        return {
          ...oldData,
          links: oldData.links.map((e: any) => (e.id === data.id ? data : e)),
        };
      });

      queryClient.setQueriesData({ queryKey: ["links"] }, (oldData: any) => {
        if (!oldData) return undefined;
        return {
          pages: oldData.pages.map((page: any) =>
            page.map((item: any) => (item.id === data.id ? data : item))
          ),
          pageParams: oldData.pageParams,
        };
      });

      queryClient.setQueriesData(
        { queryKey: ["publicLinks"] },
        (oldData: any) => {
          if (!oldData) return undefined;
          return {
            pages: oldData.pages.map((page: any) =>
              page.map((item: any) => (item.id === data.id ? data : item))
            ),
            pageParams: oldData.pageParams,
          };
        }
      );

      // queryClient.invalidateQueries({ queryKey: ["publicLinks"] });
    },
  });
};

const useBulkDeleteLinks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkIds: number[]) => {
      const response = await fetch("/api/v1/links", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ linkIds }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.response);

      return linkIds;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["dashboardData"], (oldData: any) => {
        if (!oldData?.links) return undefined;
        return oldData.links.filter((e: any) => !data.includes(e.id));
      });

      queryClient.setQueriesData({ queryKey: ["links"] }, (oldData: any) => {
        if (!oldData) return undefined;
        return {
          pages: oldData.pages.map((page: any) =>
            page.filter((item: any) => !data.includes(item.id))
          ),
          pageParams: oldData.pageParams,
        };
      });

      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["publicLinks"] });
    },
  });
};

const useUploadFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ link, file }: any) => {
      let fileType: ArchivedFormat | null = null;
      let linkType: "url" | "image" | "pdf" | null = null;

      if (file?.type === "image/jpg" || file.type === "image/jpeg") {
        fileType = ArchivedFormat.jpeg;
        linkType = "image";
      } else if (file.type === "image/png") {
        fileType = ArchivedFormat.png;
        linkType = "image";
      } else if (file.type === "application/pdf") {
        fileType = ArchivedFormat.pdf;
        linkType = "pdf";
      } else {
        return { ok: false, data: "Invalid file type." };
      }

      // PHASE 1 HYBRID ARCHITECTURE:
      // Step 1: Upload file directly to Netlify Functions (serverless)
      console.log('🚀 [Hybrid] Uploading file to Netlify Functions...');
      const uploadResult = await uploadFile({
        filePath: `uploads/${Date.now()}-${file.name}`,
        data: file,
        metadata: { 
          originalName: file.name, 
          fileType,
          linkType,
          size: file.size 
        }
      });

      if (!uploadResult.success) {
        throw new Error(`File upload failed: ${uploadResult.error}`);
      }

      console.log('✅ [Hybrid] File uploaded to Netlify Blobs');

      // Step 2: Save link metadata to database via Next.js API (traditional)
      console.log('🗄️ [Hybrid] Saving link metadata to database...');
      const response = await fetch("/api/v1/links", {
        body: JSON.stringify({
          ...link,
          type: linkType,
          name: link.name ? link.name : file.name,
          filePath: uploadResult.data?.filePath, // Reference to uploaded file
          fileSize: file.size,
          fileType: fileType
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        // If database save fails, cleanup the uploaded file
        console.log('❌ [Hybrid] Database save failed, cleaning up file...');
        // Note: We could call deleteFile here, but for now we'll let it be
        // await deleteFile(uploadResult.data?.filePath);
        throw new Error(data.response);
      }

      console.log('✅ [Hybrid] Link saved to database');

      // Step 3: Trigger background processing via Netlify Functions (optional)
      if (data.response?.id) {
        console.log('⚡ [Hybrid] Triggering background processing...');
        fetch('/.netlify/functions/process-link-hybrid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            linkId: data.response.id,
            filePath: uploadResult.data?.filePath,
            fileType,
            originalFile: file.name
          })
        }).catch(err => {
          console.warn('Background processing failed:', err);
          // Don't fail the main operation
        });
      }

      return data.response;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["dashboardData"], (oldData: any) => {
        if (!oldData?.links) return undefined;
        return {
          ...oldData,
          links: [data, ...oldData?.links],
        };
      });

      queryClient.setQueriesData({ queryKey: ["links"] }, (oldData: any) => {
        if (!oldData) return undefined;
        return {
          pages: [[data, ...oldData?.pages[0]], ...oldData?.pages.slice(1)],
          pageParams: oldData?.pageParams,
        };
      });

      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["publicLinks"] });
    },
  });
};

const useUpdatePreview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ linkId, file }: { linkId: number; file: File }) => {
      const formBody = new FormData();

      if (!linkId || !file)
        throw new Error("Error generating preview: Invalid parameters");

      formBody.append("file", file);

      const res = await fetch(
        `/api/v1/archives/${linkId}?format=` + ArchivedFormat.jpeg,
        {
          body: formBody,
          method: "PUT",
        }
      );

      const data = res.json();

      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["dashboardData"], (oldData: any) => {
        if (!oldData?.links) return undefined;
        return {
          ...oldData,
          links: oldData.links.map((e: any) =>
            e.id === data.response.id
              ? {
                  ...e,
                  preview: `archives/preview/${e.collectionId}/${e.id}.jpeg`,
                }
              : e
          ),
        };
      });

      queryClient.setQueriesData({ queryKey: ["links"] }, (oldData: any) => {
        if (!oldData) return undefined;
        return {
          pages: oldData.pages.map((page: any) =>
            page.map((item: any) =>
              item.id === data.response.id
                ? {
                    ...item,
                    preview: `archives/preview/${item.collectionId}/${item.id}.jpeg`,
                    updatedAt: new Date().toISOString(),
                  }
                : item
            )
          ),
          pageParams: oldData.pageParams,
        };
      });
    },
  });
};

const useBulkEditLinks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      links,
      newData,
      removePreviousTags,
    }: {
      links: LinkIncludingShortenedCollectionAndTags[];
      newData: Pick<
        LinkIncludingShortenedCollectionAndTags,
        "tags" | "collectionId"
      >;
      removePreviousTags: boolean;
    }) => {
      const response = await fetch("/api/v1/links", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ links, newData, removePreviousTags }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.response);

      return data.response;
    },
    onSuccess: (data, { links, newData, removePreviousTags }) => {
      // TODO: Fix these
      // queryClient.setQueryData(["dashboardData"], (oldData: any) => {
      //   if (!oldData?.links) return undefined;
      //   return oldData.links.map((e: any) =>
      //     data.find((d: any) => d.id === e.id) ? data : e
      //   );
      // });
      // queryClient.setQueriesData({ queryKey: ["links"] }, (oldData: any) => {
      //   if (!oldData) return undefined;
      //   return {
      //     pages: oldData.pages.map((page: any) => for (item of links) {
      //       page.map((item: any) => (item.id === data.id ? data : item))
      //     }
      //     ),
      //     pageParams: oldData.pageParams,
      //   };
      // });
      queryClient.invalidateQueries({ queryKey: ["links"] }); // Temporary workaround
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] }); // Temporary workaround

      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["publicLinks"] });
    },
  });
};

const resetInfiniteQueryPagination = async (
  queryClient: any,
  queryKey: any
) => {
  queryClient.setQueriesData({ queryKey }, (oldData: any) => {
    if (!oldData) return undefined;

    return {
      pages: oldData.pages.slice(0, 1),
      pageParams: oldData.pageParams.slice(0, 1),
    };
  });

  await queryClient.invalidateQueries(queryKey);
};

export {
  useLinks,
  useAddLink,
  useUpdateLink,
  useDeleteLink,
  useBulkDeleteLinks,
  useUploadFile,
  useGetLink,
  useBulkEditLinks,
  resetInfiniteQueryPagination,
  useUpdatePreview,
};
