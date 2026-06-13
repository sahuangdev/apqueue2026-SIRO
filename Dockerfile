FROM node:22-alpine

WORKDIR /app

# Install server dependencies
COPY server/package.json ./package.json
RUN npm install --omit=dev

# Copy server source + static assets
COPY server/ .

# Ensure runtime dirs exist (bind-mounted volumes override these)
RUN mkdir -p data assets/logos assets/media

EXPOSE 8888

ENV PORT=8888
ENV HOST=0.0.0.0

CMD ["node", "--no-warnings=ExperimentalWarning", "src/index.js"]
