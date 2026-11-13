# reviewer-harness — run the CLI without a local Node.js install.
#
#   docker build -t reviewer-harness .
#   docker run --rm -v "$PWD:/workspace" reviewer-harness status
#
# The CLI itself is copied to /app; your project is mounted at
# /workspace and used as the target (the CLI's default target is the
# working directory).
#
# Node version: package.json's engines (>=18) is the support floor;
# the image pins its own runtime exactly (below) so builds reproduce.
FROM node:20.20.2-alpine

WORKDIR /app
# Only what the runtime loads: the CLI, its library, the bundled
# skills/agents/commands/templates, and package.json (read for the
# version by lib/validate.js). Tests, docs, and the landing page are
# not shipped in the image; .dockerignore keeps secrets and backups
# out of the build context.
COPY --chown=node:node package.json ./
COPY --chown=node:node bin/ ./bin/
COPY --chown=node:node lib/ ./lib/
COPY --chown=node:node skills/ ./skills/
COPY --chown=node:node agents/ ./agents/
COPY --chown=node:node commands/ ./commands/
COPY --chown=node:node templates/ ./templates/
USER node
WORKDIR /workspace

ENTRYPOINT ["node", "/app/bin/cli.js"]
CMD ["status"]
