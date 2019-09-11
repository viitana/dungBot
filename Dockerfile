FROM node:12

# App dir in container
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Bundle source
COPY . .

# Start
EXPOSE 443
CMD ["npm", "start"]