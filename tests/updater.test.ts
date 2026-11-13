import assert from "node:assert/strict";
import test from "node:test";

import { explain, selectSupported, type Packument, type ReleaseMeta } from "../lib/updater";

function release(version: string, extra: Partial<ReleaseMeta> = {}): ReleaseMeta {
  return {
    version,
    dependencies: {},
    peerDependencies: {},
    deprecated: false,
    ...extra,
  };
}

function doc(name: string, versions: ReleaseMeta[], latest?: string): Packument {
  const map: Packument["versions"] = {};
  for (const meta of versions) map[meta.version] = meta;
  return {
    name,
    distTags: { latest: latest ?? versions[versions.length - 1].version },
    versions: map,
  };
}

test("a peer range holds a component below the vendor's latest stable release", () => {
  const docs = {
    widget: doc("widget", [release("2.0.0", { peerDependencies: { helper: "^1.0.0" } })]),
    helper: doc("helper", [release("1.2.0"), release("2.0.0")]),
  };
  const [widget, helper] = selectSupported({ names: ["widget", "helper"], docs, nodeVersion: "22.23.4" });
  assert.equal(widget.version, "2.0.0");
  assert.equal(helper.version, "1.2.0");
  assert.equal(helper.latest, "2.0.0");
  assert.equal(helper.heldBy?.source, "widget");
  assert.match(explain(helper, "22.23.4"), /widget allows \(\^1\.0\.0\)/);
});

test("a dependency's peer range is part of what the set supports", () => {
  const docs = {
    app: doc("app", [release("1.0.0", { dependencies: { parser: "^1.0.0" } })]),
    language: doc("language", [release("5.9.3"), release("6.0.3"), release("7.0.2")]),
  };
  const extras = {
    parser: doc("parser", [release("1.4.0", { peerDependencies: { language: ">=4.8.4 <6.1.0" } })]),
  };
  const chosen = selectSupported({
    names: ["app", "language"],
    docs,
    extras,
    nodeVersion: "22.23.4",
  }).find((item) => item.name === "language");
  assert.equal(chosen?.version, "6.0.3");
  assert.equal(chosen?.latest, "7.0.2");
  assert.equal(chosen?.heldBy?.source, "app via parser");
});

test("prerelease and deprecated releases are outside the supported line", () => {
  const docs = {
    tool: doc(
      "tool",
      [
        release("1.0.0", { deprecated: true }),
        release("1.2.0"),
        release("2.0.0-rc.1"),
        release("2.0.0", { deprecated: true }),
      ],
      "2.0.0-rc.1",
    ),
  };
  const [tool] = selectSupported({ names: ["tool"], docs, nodeVersion: "22.23.4" });
  assert.equal(tool.version, "1.2.0");
  assert.equal(tool.latest, "1.2.0");
  assert.equal(explain(tool, "22.23.4"), "1.2.0 is the latest stable release.");
});

test("an installed prerelease line is not replaced by an older stable major", () => {
  const docs = {
    auth: doc("auth", [release("4.24.15"), release("5.0.0-beta.30"), release("5.0.0-beta.32")]),
  };
  const [auth] = selectSupported({
    names: ["auth"],
    docs,
    nodeVersion: "22.23.4",
    floors: { auth: "5.0.0-beta.30" },
  });
  assert.equal(auth.version, "5.0.0-beta.32");
  assert.equal(auth.latest, "5.0.0-beta.32");
});

test("a package that has only published prereleases uses the newest one", () => {
  const docs = {
    auth: doc("auth", [release("5.0.0-beta.30"), release("5.0.0-beta.32")], "5.0.0-beta.32"),
  };
  const [auth] = selectSupported({ names: ["auth"], docs, nodeVersion: "22.23.4" });
  assert.equal(auth.version, "5.0.0-beta.32");
  assert.equal(auth.latest, "5.0.0-beta.32");
  assert.match(explain(auth, "22.23.4"), /latest published release/);
});

test("this host's Node drops a release the vendor published for a newer runtime", () => {
  const docs = {
    tool: doc("tool", [
      release("1.0.0", { enginesNode: ">=18" }),
      release("2.0.0", { enginesNode: ">=24" }),
    ]),
  };
  const [tool] = selectSupported({ names: ["tool"], docs, nodeVersion: "22.23.4" });
  assert.equal(tool.version, "1.0.0");
  assert.equal(tool.latest, "2.0.0");
  assert.equal(tool.nodeRange, ">=24");
  assert.match(explain(tool, "22.23.4"), /Node >=24/);
});

test("a stale nested peer does not override the parent package's support range", () => {
  const docs = {
    lint: doc("lint", [release("2.0.0", { dependencies: { plugin: "^1.0.0" }, peerDependencies: { engine: ">=9" } })]),
    engine: doc("engine", [release("9.9.0", { deprecated: true }), release("10.1.0")]),
  };
  const extras = {
    plugin: doc("plugin", [release("1.8.0", { peerDependencies: { engine: "^9.0.0" } })]),
  };
  const engine = selectSupported({ names: ["lint", "engine"], docs, extras, nodeVersion: "22.23.4" }).find(
    (item) => item.name === "engine",
  );
  assert.equal(engine?.version, "10.1.0");
  assert.equal(engine?.heldBy, null);
});

test("one direct component's dependency range does not downgrade another", () => {
  const docs = {
    cli: doc("cli", [release("4.0.0", { dependencies: { cn: "^0.2.4" } })]),
    cn: doc("cn", [release("0.2.4"), release("0.5.2")]),
  };
  const cn = selectSupported({ names: ["cli", "cn"], docs, nodeVersion: "22.23.4" }).find((item) => item.name === "cn");
  assert.equal(cn?.version, "0.5.2");
});

test("Next and its ESLint config stay on a release both packages publish", () => {
  const docs = {
    next: doc("next", [release("16.4.5"), release("16.5.0")]),
    "eslint-config-next": doc("eslint-config-next", [release("16.4.5")]),
  };
  const chosen = selectSupported({ names: ["next", "eslint-config-next"], docs, nodeVersion: "22.23.4" });
  assert.deepEqual(
    chosen.map((item) => item.version),
    ["16.4.5", "16.4.5"],
  );
  const next = chosen[0];
  assert.equal(next.latest, "16.5.0");
  assert.ok(next.pairedWith.includes("eslint-config-next"));
});
