FROM ubuntu:24.04

ADD . PadelSync/


RUN apt-get update && apt-get upgrade -y
RUN apt-get install npm -y

WORKDIR /PadelSync
RUN npm install

WORKDIR /PadelSync/frontend
RUN npm install

WORKDIR /PadelSync
RUN node server.js & node auth_apis/app.js & 
WORKDIR /PadelSync/frontend
RUN npm start