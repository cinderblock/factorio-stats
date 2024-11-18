#!/bin/bash

git pull

pushd ui
npm install
npm run build
popd

pushd backend
npm install
popd
