FROM node:12

# App dir in container
WORKDIR /usr/src/app

# Install dependencies

COPY package*.json ./
RUN npm ci

# Bundle source

COPY . .

# Start

RUN chmod 777 src/entrypoint.sh

EXPOSE 443
CMD ["bash", "src/entrypoint.sh"]