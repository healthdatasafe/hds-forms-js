#!/bin/sh

# This script sets up the hds-forms-js build environment

# working dir fix
scriptsFolder=$(cd $(dirname "$0"); pwd)
cd $scriptsFolder/..

# check for well known prereqs that might be missing
hash git 2>&- || { echo >&2 "I require git."; exit 1; }
hash npm 2>&- || { echo >&2 "I require node and npm."; exit 1; }

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "Error: Node.js >= 20 required (found $(node -v))"
  exit 1
fi

echo "
Installing Node modules from 'package.json' if necessary...
"
npm install

echo "
Installing test app dependencies...
"
npm --prefix src-test-app install

if [ ! -d dist ]
then
  echo "
Setting up 'dist' folder for publishing to GitHub pages...
"
  git clone -b gh-pages git@github.com:healthdatasafe/hds-forms-js.git dist
fi

# Setup dev environment (pre-commit hook)
SETUP_DEV_ENV="./scripts/setup-dev-env.sh"
if [ -f "$SETUP_DEV_ENV" ]; then
  sh "$SETUP_DEV_ENV"
fi

echo "


If no errors were listed above, the setup is complete.
See the README for more info on writing and publishing.
"
