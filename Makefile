SHELL := /bin/bash
BASEDIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

# Settings
PROJECT := life-captain
APPLICATION := $(PROJECT)-api
INFRASTRUCTURE := $(PROJECT)-database $(PROJECT)-database-migration

# Targets (application)
DOCKER_ENVIRONMENT := ENVIRONMENT=docker source ./scripts/environment.sh
DOCKER_COMPOSE := $(DOCKER_ENVIRONMENT) && docker compose -p $(PROJECT) -f $(BASEDIR)/scripts/docker/docker-compose.yml
DOCKER_VOLUMES := -v "$(BASEDIR)/src:/home/src" -v "$(BASEDIR)/tests:/home/__tests__" -v "$(BASEDIR)/prisma:/home/prisma" -v "$(BASEDIR)/db:/home/db"

build:
	docker build . -t $(APPLICATION)

start:
	$(DOCKER_COMPOSE) run $(APPLICATION) npm run start

dev:
	$(DOCKER_COMPOSE) run $(DOCKER_VOLUMES) $(APPLICATION) npm run dev

infra:
	$(DOCKER_COMPOSE) up $(INFRASTRUCTURE)

test:
	$(DOCKER_COMPOSE) run $(DOCKER_VOLUMES) $(APPLICATION) npm run test

lint-type:
	$(DOCKER_COMPOSE) run $(DOCKER_VOLUMES) $(APPLICATION) npm run lint-type

lint-code:
	$(DOCKER_COMPOSE) run $(DOCKER_VOLUMES) $(APPLICATION) npm run lint-code

lint-style:
	$(DOCKER_COMPOSE) run $(DOCKER_VOLUMES) $(APPLICATION) npm run lint-style

.PHONY: build start start-dev start-infra test lint-type lint-code lint-style
