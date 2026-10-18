.PHONY: setup prod

setup:
	@docker compose up --build --remove-orphans -d
	@pnpm db:migrate

prod:
	@docker compose --profile prod up --build -d app
