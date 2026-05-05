export type SettingsDataAction = "dataExport" | "accountDeletion";
export type SettingsDataActionOutcome = "success" | "error";

export type SettingsDataStatus = {
  text: string;
  role: "status" | "alert";
  tone: "muted" | "destructive";
};

const actionMessages: Record<SettingsDataAction, Record<SettingsDataActionOutcome, string>> = {
  dataExport: {
    success: "Data export downloaded.",
    error: "Data export failed.",
  },
  accountDeletion: {
    success: "Account deletion request recorded.",
    error: "Account deletion request failed.",
  },
};

export function buildDataExportFilename({
  appShortName,
  now = new Date(),
}: {
  appShortName: string;
  now?: Date;
}) {
  const date = now.toISOString().slice(0, 10);
  return `${appShortName}-data-export-${date}.json`;
}

export function buildSettingsDataActionMessage({
  action,
  outcome,
}: {
  action: SettingsDataAction;
  outcome: SettingsDataActionOutcome;
}) {
  return actionMessages[action][outcome];
}

export function buildSettingsDataStatus({
  message,
  error,
}: {
  message: string | null;
  error: string | null;
}): SettingsDataStatus | null {
  if (error) {
    return {
      text: error,
      role: "alert",
      tone: "destructive",
    };
  }

  if (message) {
    return {
      text: message,
      role: "status",
      tone: "muted",
    };
  }

  return null;
}
