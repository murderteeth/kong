
build:
	@docker compose build

dev:
	@docker compose up -d redis
	@docker compose up -d postgres
	@tmux new-session -d -s devenv

	# Split the window into two equal horizontal panes
	@tmux splitw -v -p 50

	# Select the top pane
	@tmux selectp -t 0

	# Split the top pane into three equal vertical panes
	@tmux splitw -h -p 50
	@tmux selectp -t 0 
	@tmux splitw -h -p 50

	# Run commands in the three top panes
	@tmux send-keys -t devenv:0.0 'docker compose up extractor --build' C-m
	@tmux send-keys -t devenv:0.1 'docker compose up loader --build' C-m
	@tmux send-keys -t devenv:0.2 'docker compose up gql --build' C-m

	# Select bottom pane (interactive terminal)
	@tmux selectp -t 3

	@tmux attach-session -t devenv
	@docker compose down

redis:
	@docker compose up -d redis --build

postgres:
	@docker compose up -d postgres --build

.PHONY: extractor
extractor:
	@docker compose up extractor --build

.PHONY: loader
loader:
	@docker compose up loader --build

.PHONY: gql
gql:
	@docker compose up gql --build

bullmq-dash:
	@docker compose up bullmq-dash --build

tidy:
	@docker compose down
	-@tmux kill-server
