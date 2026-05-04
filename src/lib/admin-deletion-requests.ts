export type AccountDeletionRequestStatus = "pending" | "reviewing" | "completed" | "cancelled";

export type AccountDeletionRequestSummaryInput = {
  id: string;
  status: AccountDeletionRequestStatus;
  requested_at?: string | null;
};

export type AccountDeletionRequestCounts = Record<AccountDeletionRequestStatus, number>;

export type AccountDeletionRequestSummary<TRequest extends AccountDeletionRequestSummaryInput> = {
  counts: AccountDeletionRequestCounts;
  openCount: number;
  sorted: TRequest[];
};

const statusRank: Record<AccountDeletionRequestStatus, number> = {
  pending: 0,
  reviewing: 1,
  completed: 2,
  cancelled: 3,
};

function requestedTime(request: AccountDeletionRequestSummaryInput): number {
  if (!request.requested_at) return 0;
  const time = new Date(request.requested_at).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function summarizeDeletionRequests<TRequest extends AccountDeletionRequestSummaryInput>(
  requests: TRequest[],
): AccountDeletionRequestSummary<TRequest> {
  const counts: AccountDeletionRequestCounts = {
    pending: 0,
    reviewing: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const request of requests) {
    counts[request.status] += 1;
  }

  return {
    counts,
    openCount: counts.pending + counts.reviewing,
    sorted: [...requests].sort((left, right) => {
      const statusDelta = statusRank[left.status] - statusRank[right.status];
      if (statusDelta !== 0) return statusDelta;
      return requestedTime(right) - requestedTime(left);
    }),
  };
}
