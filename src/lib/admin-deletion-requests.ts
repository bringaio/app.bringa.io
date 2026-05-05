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

export type AccountDeletionReviewStatus = "reviewing" | "cancelled";

export type AccountDeletionReview = {
  ok: boolean;
  adminNote: string | null;
};

export type AccountDeletionExecution = {
  ok: boolean;
  adminNote: string | null;
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

export function buildDeletionRequestReview({
  status,
  note,
}: {
  status: AccountDeletionReviewStatus;
  note: string;
}): AccountDeletionReview {
  const adminNote = note.trim() || null;

  if (status === "cancelled" && (!adminNote || adminNote.length < 3)) {
    return { ok: false, adminNote: null };
  }

  return { ok: true, adminNote };
}

export function buildDeletionRequestExecution({
  status,
  note,
}: {
  status: AccountDeletionRequestStatus;
  note: string;
}): AccountDeletionExecution {
  const adminNote = note.trim() || null;

  if (status !== "reviewing" || !adminNote || adminNote.length < 8) {
    return { ok: false, adminNote: null };
  }

  return { ok: true, adminNote };
}

export function canReviewDeletionRequestStatus(status: AccountDeletionRequestStatus): boolean {
  return status === "pending" || status === "reviewing";
}

export function canExecuteDeletionRequestStatus(status: AccountDeletionRequestStatus): boolean {
  return status === "reviewing";
}
