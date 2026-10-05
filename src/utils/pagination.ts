import type { PaginationParams } from "~/common/types";

/** Build only pagination fields, leaving resource-specific filters to the caller. */
export function paginationQuery(
  params: PaginationParams = {},
  { includeZeroPageSize = false }: { includeZeroPageSize?: boolean } = {}
): Record<string, string> {
  const { after, before, include_total_count, per_page } = params;
  return {
    ...(after && { after }),
    ...(before && { before }),
    ...(include_total_count !== undefined && {
      include_total_count: String(include_total_count),
    }),
    // Older list endpoints omit zero; newer endpoints send any non-null size.
    ...((includeZeroPageSize ? per_page != null : !!per_page) && {
      per_page: String(per_page),
    }),
  };
}
