#!/bin/bash

git stash
git pull
git stash pop

pushd ui
npm install
npm run build
popd

pushd backend
npm install
popd
