.PHONY: setup

setup:
	@docker compose up --build --remove-orphans -d
	@pnpm exec prisma migrate reset --force
	@pnpm exec prisma migrate dev