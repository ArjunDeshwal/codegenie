#!/bin/bash

# This script runs during building the sandbox template
# and makes sure the Next.js app is (1) running and (2) the `/` page is compiled
function ping_server() {
	counter=0
	while (( counter < 60 )); do
	  response=$(curl --silent --max-time 2 -o /dev/null -w "%{http_code}" "http://localhost:3000" || true)
	  if [[ ${response} == 200 ]]; then
	    echo "Preview server is ready."
	    return 0
	  fi
	  counter=$((counter + 1))
	  sleep 1
	done
	echo "Preview server did not become ready within 60 seconds." >&2
	return 1
}

ping_server &
cd /home/user && exec npx next dev --turbopack --hostname 0.0.0.0 --port 3000
