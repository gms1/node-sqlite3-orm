.PHONY: default test

NODE_VERSION := $(shell node -v | awk -F. '{sub(/v/,""); print $$1}')

default: test

test:
	npm run clean
	npm run build
	npm run test:run
	npm run lint
	@echo nodejs=$(NODE_VERSION)
	@if [ "$(NODE_VERSION)" -gt 6 ]; then npm run coverage:run; fi

