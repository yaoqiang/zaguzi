# 豆面扎股子 -- 基于[Pomelo](https://github.com/NetEase/pomelo/)


## Directory -

### web-server
web-server directory is the http service for game login or ect..

### game-server
game-server directory is the TCP(based on websocket, socket.io, etc) api for game logic..

### shared
shared directory is the public conf, util, etc.

## Installation

### one by one
- first install nodejs..(suggest use [nvm](https://github.com/creationix/nvm))
- install pomelo, npm install -g pomelo
- install mysql and execute database script on $PROJECT_HOME/game-server/config/schema/zgz.sql, then starting mysql server

> or you can use pm2 to deploy

## Configuration

- reset the host and port in $PROJECT_HOME/game-server/config/servers.json, or you can use pm2-*.json to deployment
- reset the mysql host and port on $PROJECT_HOME/shared/config/mysql.json

## Deployment & Development | Test | Production

**start game-server**
cd game-server ; npm install ; pomelo start

**start web-server**
cd web-server ; npm install ; node app.js

> Note: there is many way to start app, you can choose pm2 or dev with WebStorm
