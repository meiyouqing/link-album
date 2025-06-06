# Stage: monolith-builder
# Purpose: Uses the Rust image to build monolith
# Notes:
#  - Fine to leave extra here, as only the resulting binary is copied out
FROM docker.io/rust:1.81-bullseye AS monolith-builder

ENV OPENSSL_NO_ASM=1

RUN set -eux && cargo install --locked monolith

# Stage: main-app
# Purpose: Compiles the frontend and
# Notes:
#  - Nothing extra should be left here.  All commands should cleanup
FROM node:18.18-bullseye-slim AS main-app

ARG DEBIAN_FRONTEND=noninteractive

ENV NODE_OPTIONS=--max_old_space_size=4096

RUN mkdir /data

WORKDIR /data

COPY ./package.json ./yarn.lock ./playwright.config.ts ./

RUN --mount=type=cache,sharing=locked,target=/usr/local/share/.cache/yarn \
    set -eux && \
    yarn install --network-timeout 10000000 && \
    # Install curl for healthcheck, and ca-certificates to prevent monolith from failing to retrieve resources due to invalid certificates
    apt-get update && \
    apt-get install -yqq --no-install-recommends curl ca-certificates && \
    apt-get autoremove && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy the compiled monolith binary from the builder stage
COPY --from=monolith-builder /usr/local/cargo/bin/monolith /usr/local/bin/monolith

RUN set -eux && \
    npx playwright install --with-deps chromium && \
    apt-get clean && \
    yarn cache clean

COPY . .

RUN yarn prisma generate
RUN yarn build

HEALTHCHECK --interval=30s \
            --timeout=5s \
            --start-period=10s \
            --retries=3 \
            CMD [ "/usr/bin/curl", "--silent", "--fail", "http://127.0.0.1:3001/" ]

EXPOSE 3001

CMD yarn prisma migrate deploy && yarn start
