FROM node:22-alpine AS base
WORKDIR /workspace
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY plugins/collaboration/package.json plugins/collaboration/package.json
COPY plugins/files/package.json plugins/files/package.json
COPY plugins/hello-world/package.json plugins/hello-world/package.json
COPY plugins/inventory/package.json plugins/inventory/package.json
COPY plugins/ai/package.json plugins/ai/package.json
COPY plugins/projects/package.json plugins/projects/package.json
RUN pnpm install --frozen-lockfile=false

FROM deps AS dev
COPY . .
EXPOSE 3000 5173
CMD ["pnpm", "dev"]

FROM deps AS build
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
COPY . .
RUN pnpm build

FROM build AS api-prod
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "@lab/api", "start"]

FROM nginx:1.27-alpine AS web-prod
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 80
