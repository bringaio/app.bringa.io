import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDataExportFilename,
  buildSettingsDataActionMessage,
  buildSettingsDataStatus,
} from "../src/lib/settings-data-actions.ts";

test("builds date-stamped data export filenames", () => {
  assert.equal(
    buildDataExportFilename({
      appShortName: "bringa",
      now: new Date("2026-05-05T23:30:00.000Z"),
    }),
    "bringa-data-export-2026-05-05.json",
  );
});

test("builds settings data action messages", () => {
  assert.equal(buildSettingsDataActionMessage({ action: "dataExport", outcome: "success" }), "Data export downloaded.");
  assert.equal(buildSettingsDataActionMessage({ action: "dataExport", outcome: "error" }), "Data export failed.");
  assert.equal(
    buildSettingsDataActionMessage({ action: "accountDeletion", outcome: "success" }),
    "Account deletion request recorded.",
  );
  assert.equal(
    buildSettingsDataActionMessage({ action: "accountDeletion", outcome: "error" }),
    "Account deletion request failed.",
  );
});

test("builds accessible settings data status", () => {
  assert.equal(buildSettingsDataStatus({ message: null, error: null }), null);
  assert.deepEqual(buildSettingsDataStatus({ message: "Data export downloaded.", error: null }), {
    text: "Data export downloaded.",
    role: "status",
    tone: "muted",
  });
  assert.deepEqual(buildSettingsDataStatus({ message: "Data export downloaded.", error: "Data export failed." }), {
    text: "Data export failed.",
    role: "alert",
    tone: "destructive",
  });
});
