.PHONY: default test coverage

NODE_VERSION := $(shell node -v | awk -F. '{sub(/v/,""); print $$1}')

default: test

coverage:
	-rm -rf coverage
	npm run coverage:run
	npm run coverage:html

test:
	npm run clean
	npm run build
	npm run test:run
	npm run lint
	@echo nodejs=$(NODE_VERSION)
	@if [ "$(NODE_VERSION)" -gt 6 ]; then npm run coverage:run; fi

