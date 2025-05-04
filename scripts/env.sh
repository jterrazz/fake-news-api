#! /bin/bash

# Set default DATABASE_URL if not already set
export DATABASE_URL="${DATABASE_URL:-file:../database/main.sqlite}"