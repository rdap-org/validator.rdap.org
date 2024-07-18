# RDAP Validator

This repository contains:

* a [JavaScript library](lib/rdap-validator.js) which implements an RDAP validator;
* a [CLI tool](bin/rdap-validator) that uses the library;
* a [single-page web application](rdap-validator.html) which provides a web frontend.

## Using the CLI tool

Once you've checked out this repository, run `npm i` to install its dependencies.

Then you can run `bin/rdap-validator --help`.

### Using Docker

Build a Docker image using `docker buildx build -t rdap-validator .`.

Then run the docker image using `docker run --rm rdap-validator --help`.

## Web interface

The web frontend is built using Jekyll. Built it using `jekyll build`. You can
run a simple local webserver using `jekyll serve`.
