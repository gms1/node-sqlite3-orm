.PHONY: default test coverage coveralls

NODE_VERSION := $(shell node -v | awk -F. '{sub(/v/,""); print $$1}')

default: test

coverage:
	-rm -rf coverage
	npm run coverage:run
	npm run coverage:html

coveralls:
	@echo nodejs=$(NODE_VERSION)
	@if [ "$(NODE_VERSION)" -eq 8 ]; then npm run coverage:coveralls; fi

test:
	npm run clean
	npm run build
	npm run coverage:run
	npm run coverage:html
	npm run lint

