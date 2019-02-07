FROM python:3.6-alpine

MAINTAINER Richard Stones richard.stones@kcl.ac.uk

RUN apk add gcc musl-dev python3-dev libffi-dev openssl-dev libmemcached-dev

WORKDIR /mgtk

COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt
RUN pip install gunicorn

COPY megatrack megatrack
COPY migrations migrations
COPY scripts scripts
COPY run.py ./
COPY boot.sh ./
RUN chmod +x boot.sh

RUN mkdir logs

ENV FLASK_APP megatrack/__init__.py
ENV PYTHONPATH /mgtk

EXPOSE 5000
# pass dev_mode = "false" to entrypoint
CMD ["false"]
ENTRYPOINT ["./boot.sh"]
