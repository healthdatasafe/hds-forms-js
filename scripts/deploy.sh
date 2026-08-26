#!/usr/bin/env bash
# Deploy to gh-pages.
set -euo pipefail

scriptsFolder=$(cd $(dirname "$0"); pwd)
cd "$scriptsFolder/.."

MAIN_BRANCH="main"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" != "$MAIN_BRANCH" ]; then
  echo "ERROR: Deploy only allowed from '$MAIN_BRANCH' (current: $BRANCH)."
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: Working tree is not clean."
  git status --short
  exit 1
fi

if [ ! -d dist/.git ]; then
  echo "ERROR: dist/ is not a gh-pages checkout. Run 'npm run setup' first."
  exit 1
fi

COMMIT_SHORT="$(git rev-parse --short HEAD)"
COMMIT_FULL="$(git rev-parse HEAD)"
echo "Deploying commit $COMMIT_SHORT ..."

# Reset dist/ to remote gh-pages HEAD so the deploy is idempotent regardless
# of any leftover local state (interrupted previous build, manual edits, etc.).
echo "Resetting dist/ to origin/gh-pages..."
git -C dist fetch origin gh-pages
git -C dist reset --hard origin/gh-pages
git -C dist clean -fdx -e .git

# Refuse to build against a node_modules that does not match package-lock.json.
# A dependency bump pulled from git but never `npm install`ed produces a bundle
# linked against the OLD library while the source expects the new one - lint,
# tests and the build all stay green and the only symptom is a white screen in
# the browser, after deploy. (Broke app.hds.ngo 2026-08-25: hds-lib 1.3.4
# installed, 1.5.0 required.) Checks direct dependencies only, so nested
# dev-tool dedupe differences do not cause false alarms.
(node -e '
const fs = require("fs");
let want, have;
try { want = JSON.parse(fs.readFileSync("package-lock.json", "utf8")).packages || {}; } catch (e) { process.exit(0); }
try { have = JSON.parse(fs.readFileSync("node_modules/.package-lock.json", "utf8")).packages || {}; }
catch (e) { console.error("ERROR: node_modules/ is missing or was not installed by npm."); console.error("Run: npm install"); process.exit(1); }
const drift = [], linked = [];
for (const [p, meta] of Object.entries(want)) {
  if (!p || (p.match(/node_modules\//g) || []).length !== 1) continue;
  const got = have[p];
  if (!got) continue;
  const name = p.replace(/^node_modules\//, "");
  if (got.link && !meta.link) { linked.push(name + " -> " + got.resolved); continue; }
  if (meta.version && got.version && meta.version !== got.version) drift.push(name + ": installed " + got.version + ", lockfile wants " + meta.version);
}
if (linked.length) {
  console.error("ERROR: npm-linked dependencies present - the build would not match the lockfile.");
  linked.forEach(function (l) { console.error("  " + l); });
  console.error("Unlink before deploying: npm install");
}
if (drift.length) {
  console.error("ERROR: node_modules is out of sync with package-lock.json - refusing to build a stale bundle.");
  drift.slice(0, 10).forEach(function (d) { console.error("  " + d); });
  if (drift.length > 10) console.error("  ... and " + (drift.length - 10) + " more");
  console.error("Run: npm install");
}
if (linked.length || drift.length) process.exit(1);
')


echo "Building library..."
npm run build
echo "Building test app..."
npx vite build src-test-app
echo "Build OK."

# Sanity-check build output before committing — a silent build failure that
# emptied dist/ but produced nothing must not be committed
# (broke demo-app.datasafe.dev on 2026-05-04, see _macro/_plans/_TEMP/_done/fix-demo-app-spa-404-loop.md).
if [ ! -s dist/index.html ]; then
  echo "ERROR: dist/index.html is missing or empty after build — refusing to deploy."
  exit 1
fi

# No custom domain — served at healthdatasafe.github.io/hds-forms-js/
rm -f dist/CNAME
# Bypass Jekyll processing (needed for version.json etc.)
touch dist/.nojekyll

# Generate version.json
cat > dist/version.json << VEOF
{
  "commit": "$COMMIT_FULL",
  "commitShort": "$COMMIT_SHORT",
  "branch": "$MAIN_BRANCH",
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
VEOF
git -C dist add -A
if git -C dist diff --cached --quiet; then
  echo "No changes in dist/ — nothing to deploy."
  exit 0
fi
git -C dist commit -m "deploy $COMMIT_SHORT ($COMMIT_FULL)"
git -C dist push

echo "Deployed $COMMIT_SHORT to gh-pages."
