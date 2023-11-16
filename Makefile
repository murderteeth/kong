
dev:
	@docker compose up -d redis
	@docker compose up -d postgres
	@tmux new-session -d -s devenv

	@tmux splitw -v -p 50
	@tmux selectp -t 0
	@tmux splitw -h -p 50
	@tmux selectp -t 0 
	@tmux splitw -h -p 50

	# Run commands in the three top panes
	@tmux send-keys -t devenv:0.0 '' C-m
	@tmux send-keys -t devenv:0.1 'yarn workspace web dev' C-m
	@tmux send-keys -t devenv:0.2 'yarn workspace ingest dev' C-m

	# Bottom pane (terminal)
	@tmux send-keys -t devenv:0.3 'yarn workspace terminal dev' C-m
	@tmux selectp -t 3

	@tmux attach-session -t devenv
	@docker compose down


.PHONY: ingest
ingest:
	@docker compose up -d redis
	@docker compose up -d postgres
	@tmux new-session -d -s devenv

	@tmux splitw -h -p 50
	@tmux selectp -t 1
	@tmux splitw -v -p 50

	@tmux send-keys -t devenv:0.0 'yarn workspace ingest dev' C-m
	@tmux send-keys -t devenv:0.1 'yarn workspace terminal dev' C-m
	@tmux send-keys -t devenv:0.2 'sleep 10 && psql --host=localhost --port=5432 --username=user --dbname=user' C-m

	@tmux selectp -t 1

	@tmux attach-session -t devenv
	@docker compose down


test:
	@yarn workspace lib test
	@yarn workspace ingest test


down:
	@docker compose down
	-@tmux kill-server
