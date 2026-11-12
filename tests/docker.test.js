import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dockerfile = readFileSync(join(root, "Dockerfile"), "utf8");
const compose = readFileSync(join(root, "docker-compose.yml"), "utf8");

test("container runs as non-root with a pinned image", () => {
  // F-W2: container must not run as root (devops-basics rule 3).
  assert.ok(
    dockerfile.includes("USER node"),
    "Dockerfile must contain 'USER node'",
  );
  // F-W4: base image pinned to an exact patch, never a moving pointer
  // (devops-basics rule 11). Exact patch only — 'node:20-alpine' fails.
  assert.match(
    dockerfile,
    /^FROM node:20\.\d+\.\d+-alpine/m,
    "Dockerfile must pin an exact node:20.x.y-alpine base image",
  );
  // F-W2 (compose half): files written into the mounted volume must not
  // become root-owned on the host.
  assert.ok(
    compose.includes('user: "${UID:-1000}:${GID:-1000}"'),
    'docker-compose.yml must contain user: "${UID:-1000}:${GID:-1000}"',
  );
});
