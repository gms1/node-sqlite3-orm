.PHONY: default test coveralls

NODE_VERSION := $(shell node -v | awk -F. '{sub(/v/,""); print $$1}')

default: test

coveralls:
	@echo nodejs=$(NODE_VERSION)
	@if [ "$(NODE_VERSION)" -eq 8 ]; then npm run coverage:coveralls; fi

test:
	npm run rebuild
	npm run lint
	-rm -rf coverage
	npm run coverage:run
	npm run coverage:html

