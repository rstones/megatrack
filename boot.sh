#!/bin/sh

dev_mode=$1

while true; do
#    flask db upgrade
    python megatrack/manage.py db upgrade
    if [[ "$?" == "0" ]]; then
        break
    fi
    echo Upgrade command failed, retrying in 5 secs...
    sleep 5
done

if [ $dev_mode == "true" ]
then
	exec gunicorn -b :5000 --reload --access-logfile - --error-logfile - run:application
else
	exec gunicorn -b :5000 --access-logfile - --error-logfile - run:application
fi
