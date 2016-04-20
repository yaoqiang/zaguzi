#!/bin/sh
mongostat 5 > ~/workspace/logs/mongostat.log 2>&1 &
mongotop 5 > ~/workspace/logs/mongotop.log 2>&1 &
