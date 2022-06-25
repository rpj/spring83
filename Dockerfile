FROM node:16 as base
WORKDIR /usr/src/spring83
COPY package*.json ./
RUN npm install
COPY common/*.js common/
STOPSIGNAL SIGINT

FROM base as serve
ENV NODE_ENV=prod
ENV SPRING83_CONTENT_DIR=/content
ENV TZ="America/Los_Angeles"
COPY server/*.js server/
COPY client/* client/
COPY serve .
COPY public-boards.json .
CMD ["/usr/src/spring83/serve"]

FROM base as putnew
COPY putnew .
WORKDIR /home
ENTRYPOINT ["/usr/src/spring83/putnew"]
