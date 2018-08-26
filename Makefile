.PHONY: default test coveralls build

NODE_VERSION := $(shell node -v | awk -F. '{sub(/v/,""); print $$1}')

default: test

build:
	npm run clean
	npm run build

coveralls:
	@echo nodejs=$(NODE_VERSION)
	@if [ "$(NODE_VERSION)" -eq 8 ]; then npm run coverage:coveralls; fi

test: build
	-rm -rf coverage
	npm run coverage:run
	npm run coverage:html
	npm run lint

