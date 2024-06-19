FROM alpine:latest

RUN apk -q add npm

WORKDIR /app

COPY . .

RUN npm i

ENTRYPOINT ["/app/bin/rdap-validator"]
