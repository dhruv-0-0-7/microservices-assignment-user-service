FROM node:18.15.0-alpine3.17

RUN mkdir /service-user
WORKDIR /service-user

COPY package*.json .
RUN npm ci

COPY . .
