#!/bin/bash

# Check if the tmux session 'devenv' already exists
tmux has-session -t devenv 2>/dev/null

if ! tmux has-session -t devenv 2>/dev/null; then
  echo "Creating new tmux session: devenv"
  tmux new-session -d -s devenv
  
  tmux splitw -v -l 50% -t devenv
  tmux selectp -t 0
  tmux splitw -h -l 80% -t devenv
  tmux selectp -t 2
  tmux splitw -h -l 50% -t devenv
else
  echo "Using existing 'devenv' tmux session."
fi
