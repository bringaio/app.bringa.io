import assert from "node:assert/strict";
import test from "node:test";

import { buildPageTitle } from "../src/lib/app-config-format.ts";

test("builds the app name when no page title is provided", () => {
  const config = {
    app: {
      name: "Community Portal",
      titleTemplate: "%s | Community Portal",
    },
  };

  assert.equal(buildPageTitle(config, undefined), "Community Portal");
  assert.equal(buildPageTitle(config, ""), "Community Portal");
});

test("formats page titles from the deployment title template", () => {
  const config = {
    app: {
      name: "Community Portal",
      titleTemplate: "%s | Community Portal",
    },
  };

  assert.equal(buildPageTitle(config, "Settings"), "Settings | Community Portal");
});
