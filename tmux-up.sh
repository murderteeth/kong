#!/bin/bash

# Start a new session in the background called 'work'
tmux new-session -d -s work

# Split the window into two equal horizontal panes
tmux splitw -v -p 50

# Select the top pane
tmux selectp -t 0

# Split the top pane into three equal vertical panes
tmux splitw -h -p 50
tmux selectp -t 0 
tmux splitw -h -p 50

# Run your commands in the three top panes
tmux send-keys -t work:0.0 'docker start kong_container && docker logs -f kong_container' C-m
tmux send-keys -t work:0.1 'yarn dev' C-m
tmux send-keys -t work:0.2 'yarn inngest-dev' C-m

# Select the bottom pane (interactive terminal)
tmux selectp -t 3

# Attach to the session
tmux attach-session -t work
