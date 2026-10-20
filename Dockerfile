# reviewer-harness — run the CLI without a local Node.js install.
#
#   docker build -t reviewer-harness .
#   docker run --rm -v "$PWD:/workspace" reviewer-harness status
#
# The CLI itself is copied to /app; your project is mounted at
# /workspace and used as the target (the CLI's default target is the
# working directory).
FROM node:20-alpine

WORKDIR /app
COPY . .
WORKDIR /workspace

ENTRYPOINT ["node", "/app/bin/cli.js"]
CMD ["status"]
