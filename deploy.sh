imgName=poo_bot
conName=poobot

git checkout master
git reset --hard HEAD
git pull

echo Building new image
docker build -t $imgName -f Dockerfile .

echo Deleting old container
docker rm -f $conName

echo Starting new container
docker run -d -p 443:443 -e TGBOT_TOKEN=$1 --name $conName $imgName