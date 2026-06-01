FROM node:20-alpine

WORKDIR /workspace

COPY package*.json ./
RUN npm ci

EXPOSE 4000

CMD ["npm", "run", "dev"]
