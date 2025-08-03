import type { ApiResponse, PaginatedBetsResponse } from '@repo/common/types';
import { useQuery } from '@tanstack/react-query';
import { NotepadTextIcon } from 'lucide-react';

import { fetchAllBets } from '@/api/bets';
import { CommonDataTable } from '@/components/ui/common-data-table';

import { columns } from './columns';

function CasinoBets(): JSX.Element {
  const pagination = { pageIndex: 0, pageSize: 10 } as const;

  const { data } = useQuery<ApiResponse<PaginatedBetsResponse>>({
    queryKey: ['casino-bets'],
    queryFn: () =>
      fetchAllBets({
        page: 1,
        pageSize: pagination.pageSize,
        apiKey: (import.meta.env.ADMIN_API_KEY as string | undefined) ?? 'test',
      }),
    placeholderData: prev => prev,
  });

  return (
    <div className="container py-6">
      <div className="flex items-center gap-2">
        <NotepadTextIcon className="size-4 icon-neutral-weak" />
        <h2 className="font-semibold">Casino Bets</h2>
      </div>
      <CommonDataTable
        columns={columns}
        data={data?.data.bets || []}
        hidePagination
        pageCount={1}
        pagination={pagination}
        rowCount={data?.data.pagination.totalCount || 0}
        setPagination={() => {
          /* no-op */
        }}
      />
    </div>
  );
}

export default CasinoBets;
