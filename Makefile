.DEFAULT_GOAL := build

build: 
	npm run prepack
	npm run postpack
.PHONY:build

install: build
	npm install -g .
.PHONY:install