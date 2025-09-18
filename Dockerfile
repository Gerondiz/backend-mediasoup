FROM node:20-alpine

RUN apk add --no-cache python3 py3-pip make g++ git cmake linux-headers

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3001
EXPOSE 40000-49999/udp
EXPOSE 40000-49999/tcp

CMD ["npm", "start"]