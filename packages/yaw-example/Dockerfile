FROM node:24-slim AS ssg-base

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 \
    libgbm1 libasound2 libpango-1.0-0 libcairo2 libxshmfence1 \
 && rm -rf /var/lib/apt/lists/*

FROM node:24-alpine AS build

WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/yaw-common/package.json packages/yaw-common/
COPY packages/yaw/package.json packages/yaw/
COPY packages/yaw-transformer/package.json packages/yaw-transformer/
COPY packages/yaw-ts-plugin/package.json packages/yaw-ts-plugin/
COPY packages/yaw-ssg/package.json packages/yaw-ssg/
COPY packages/yaw-example/package.json packages/yaw-example/
RUN npm ci

COPY tsconfig.base.json tsconfig.json ./

COPY packages/yaw-common packages/yaw-common
RUN npm run build -w packages/yaw-common

COPY packages/yaw-transformer packages/yaw-transformer
RUN npm run build -w packages/yaw-transformer

COPY packages/yaw packages/yaw
RUN npm run build -w packages/yaw

COPY packages/yaw-ssg packages/yaw-ssg
RUN npm run build -w packages/yaw-ssg

COPY packages/yaw-ts-plugin packages/yaw-ts-plugin
COPY packages/yaw-example packages/yaw-example
RUN cd packages/yaw-example && npm run build

# SSG capture -- @sparticuz/chromium provides a headless binary
FROM ssg-base AS ssg

WORKDIR /repo
COPY --from=build /repo /repo
RUN npm install @sparticuz/chromium -w packages/yaw-ssg

WORKDIR /repo/packages/yaw-example
RUN npm run build:ssg

FROM nginx:alpine
COPY --from=ssg /repo/packages/yaw-example/public /usr/share/nginx/html
ARG NGINX_CONF=nginx.conf
COPY packages/yaw-example/${NGINX_CONF} /etc/nginx/conf.d/default.conf
EXPOSE 80
