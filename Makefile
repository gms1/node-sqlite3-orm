.PHONY: default all clean build tslint test dist

default: all test

all: clean build tslint

clean:
	npm run clean

build:
	npm run build

tslint:
	npm run tslint

test:
	npm run test

dist: all test
	npm run package
	cd package && npm publish

