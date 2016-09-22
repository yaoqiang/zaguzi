#!/bin/bash
targetpath='/root/workspace/backup/mongobak'
nowtime=$(date -d '-3 days' "+%Y%m%d")
if [ -d "${targetpath}/${nowtime}/" ]
then
  rm -rf "${targetpath}/${nowtime}/"
  echo "=======${targetpath}/${nowtime}/===删除完毕=="
fi
echo "===$nowtime ==="