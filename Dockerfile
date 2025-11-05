FROM ubuntu:24.04

ADD . PadelSync/


RUN apt-get update && apt-get upgrade -y
RUN apt-get install npm -y

WORKDIR /PadelSync
RUN npm install

WORKDIR /PadelSync/frontend
RUN npm install



CMD bash /PadelSync/init.sh