#!/bin/bash

imgName=poo_bot:latest
conName=poobot

echo Building new image
docker build -t $imgName -f Dockerfile  .

echo Deleting old container
docker rm -f $conName

echo Starting new container
docker run -d -p 443:443 --name $conName $imgName