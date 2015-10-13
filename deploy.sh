#!/bin/bash
npm install
pm2 start pm2.json
pm2 save
