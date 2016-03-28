#!/bin/bash
cd zgz ; git pull ; pomelo stop ; pomelo kill; pm2 kill ;
pm2 start web-server/app.js ; cd game-server ; cnpm install ; pomelo start --daemon --env=production ;
printf "deploy successful.\n"