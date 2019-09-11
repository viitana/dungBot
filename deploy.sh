#!/bin/bash

imgName=viitana/poo_bot
conName=poobot

echo $DOCKER_USERNAME

echo Building new image
docker build -t $imgName -f Dockerfile  .

echo Deleting old container
docker rm -f $conName

echo Starting new container
docker run -d -p 443:443 --name $conName $imgName