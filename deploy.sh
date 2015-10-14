#!/bin/bash
node_modules/.bin/pm2 kill
node_modules/.bin/pm2 start pm2.json