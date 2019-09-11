FROM i386/ubuntu:18.04

RUN apt-get update
RUN apt-get install -y npm
RUN apt-get install -y node-gyp

# App dir in container
WORKDIR /usr/src/app

# Install dependencies

RUN which python
COPY package*.json ./

RUN npm i better-sqlite3

RUN apt-get install -y pkg-config
RUN apt-get install -y curl
RUN apt-get install -y libpixman-1-0
RUN apt-get install -y libcairo2-dev
RUN apt-get install -y libpango1.0-dev
RUN apt-get install -y libjpeg-dev

RUN npm i

# Bundle source

COPY . .

# Start

RUN chmod 777 src/entrypoint.sh

EXPOSE 443
CMD ["bash", "src/entrypoint.sh"]
