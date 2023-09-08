
build:
	@docker compose build

up:
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
	@tmux send-keys -t devenv:0.0 'yarn workspace gql start' C-m
	@tmux send-keys -t devenv:0.1 'yarn workspace web dev' C-m
	@tmux send-keys -t devenv:0.2 'yarn workspace ingest start' C-m

	# Bottom pane (terminal)
	@tmux send-keys -t devenv:0.3 'yarn workspace terminal start' C-m
	@tmux selectp -t 3

	@tmux attach-session -t devenv
	@docker compose down

redis:
	@docker compose up -d redis --build

postgres:
	@docker compose up -d postgres --build

.PHONY: ingest
ingest:
	@docker compose up ingest --build

.PHONY: gql
gql:
	@docker compose up gql --build

.PHONY: terminal
terminal:
	@yarn workspace terminal start

down:
	@docker compose down
	-@tmux kill-server
