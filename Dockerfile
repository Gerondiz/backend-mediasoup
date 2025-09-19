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

docker run -d \
  --name mediasoup-app \
  --restart unless-stopped \
  -p 3001:3001 \
  -p 40000-40019:40000-40019/udp \
  -p 40000-40019:40000-40019/tcp \
  -e MEDIASOUP_WORKERS=1 \
  -v /root/progs/backend-mediasoup/certs:/app/certs:ro \
  mediasoup-backend:latest