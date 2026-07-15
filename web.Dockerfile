FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend ./
ENV NEXT_PUBLIC_API_BASE_URL=https://vor-pro-api-282062-9-1327631927.sh.run.tcloudbase.com
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
EXPOSE 2367
CMD ["npm", "run", "start"]
