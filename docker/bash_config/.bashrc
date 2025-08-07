# ~/.bashrc: executed by bash(1) for non-login shells.

# If not running interactively, don't do anything
case $- in
    *i*) ;;
      *) return;;
esac

# Load custom configuration
if [ -f ~/.bashrc_custom ]; then
    . ~/.bashrc_custom
fi

# Load aliases
if [ -f ~/.bash_aliases ]; then
    . ~/.bash_aliases
fi

# Source global definitions if available
if [ -f /etc/bashrc ]; then
    . /etc/bashrc
fi
