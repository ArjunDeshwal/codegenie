# You can use most Debian-based base images
FROM node:22-slim

# Install curl and a sandbox-local browser for public reference inspection.
RUN apt-get update && apt-get install -y curl chromium && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY compile_page.sh /compile_page.sh
RUN chmod +x /compile_page.sh

# Install dependencies and customize sandbox
WORKDIR /home/user/nextjs-app

RUN npx --yes create-next-app@15.5.23 . --yes

RUN npx --yes shadcn@4.8.3 init --yes --defaults --force
RUN npx --yes shadcn@4.8.3 add --yes \
    accordion alert alert-dialog avatar badge breadcrumb button button-group \
    calendar card carousel chart checkbox collapsible command context-menu \
    dialog drawer dropdown-menu empty field hover-card input input-group \
    input-otp item kbd label menubar native-select navigation-menu pagination \
    popover progress radio-group resizable scroll-area select separator sheet \
    sidebar skeleton slider sonner spinner switch table tabs textarea toggle \
    toggle-group tooltip
RUN npm install tw-animate-css clsx tailwind-merge
RUN npm install playwright-core@1.55.0 ipaddr.js@1.9.1

# Move the Nextjs app to the home directory and remove the nextjs-app directory
RUN mv /home/user/nextjs-app/* /home/user/ && rm -rf /home/user/nextjs-app

WORKDIR /home/user

RUN mkdir -p /home/user/.codegenie
COPY inspect-reference.mjs /home/user/.codegenie/inspect-reference.mjs

# shadcn 2.6 can generate components that import this helper without creating it.
RUN mkdir -p /home/user/lib && \
    echo 'import { clsx, type ClassValue } from "clsx"' > /home/user/lib/utils.ts && \
    echo 'import { twMerge } from "tailwind-merge"' >> /home/user/lib/utils.ts && \
    echo '' >> /home/user/lib/utils.ts && \
    echo 'export function cn(...inputs: ClassValue[]) {' >> /home/user/lib/utils.ts && \
    echo '  return twMerge(clsx(inputs))' >> /home/user/lib/utils.ts && \
    echo '}' >> /home/user/lib/utils.ts
