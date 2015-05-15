大同扎股子-基于Pomelo
===


#web-server is the http service for game login or ect..

#game-server is the socket api for game logic..

===
Install
===
#first install nodejs..
#npm install -g pomelo

#install mysql and execute database script on game-server/config/schema/zgz.sql, then starting mysql server

#resetting the mysql host,port on shared/config/mysql.json 


#cd game-server && run npm install
#cd web-server && run npm install

===
Deployment

===
cd web-server && node app.js
open a new terminal 
cd game-server && pomelo start
