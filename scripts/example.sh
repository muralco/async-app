#!/bin/bash

cd $(dirname $0)/..

if [ ! -d "./dist" ]; then
  npm run build
fi

if [ -z "$1" -o ! -d "./dist/examples/$1" ]; then
  echo "Usage: npm run example <name>"
  echo
  echo "Examples:"
  (cd ./dist/examples; find * -type d)
  echo
  exit 1
fi

cd "./dist/examples/$1"

node .
