.PHONY: setup

setup:
	@docker compose up --build --remove-orphans -d
	@pnpm db:migrate