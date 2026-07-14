# You can use most Debian-based base images
FROM node:22-slim

# Install curl
RUN apt-get update && apt-get install -y curl && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY compile_page.sh /compile_page.sh
RUN chmod +x /compile_page.sh

# Install dependencies and customize sandbox
WORKDIR /home/user/nextjs-app

RUN npx --yes create-next-app@15.5.18 . --yes

RUN npx --yes shadcn@2.6.3 init --yes -b neutral --force
RUN npx --yes shadcn@2.6.3 add --all --yes
RUN npm install tw-animate-css clsx tailwind-merge

# Move the Nextjs app to the home directory and remove the nextjs-app directory
RUN mv /home/user/nextjs-app/* /home/user/ && rm -rf /home/user/nextjs-app

WORKDIR /home/user

# shadcn 2.6 can generate components that import this helper without creating it.
RUN mkdir -p /home/user/lib && \
    echo 'import { clsx, type ClassValue } from "clsx"' > /home/user/lib/utils.ts && \
    echo 'import { twMerge } from "tailwind-merge"' >> /home/user/lib/utils.ts && \
    echo '' >> /home/user/lib/utils.ts && \
    echo 'export function cn(...inputs: ClassValue[]) {' >> /home/user/lib/utils.ts && \
    echo '  return twMerge(clsx(inputs))' >> /home/user/lib/utils.ts && \
    echo '}' >> /home/user/lib/utils.ts
