# Dev-oriented image: installs deps and runs the Next.js dev server.
# A multi-stage production build is added in Phase 9 alongside the Vercel
# deploy (Vercel does not use this file — it builds directly from source).
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
