#!/bin/zsh -l
cd -- "${0:A:h}" || exit 1
if ! command -v npm >/dev/null 2>&1; then
  print 'Node.js is required to start Scripture Trails.'
  read '?Press Return to close.'
  exit 1
fi
npm run dev -- --open
