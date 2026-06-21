FROM node:20-alpine

WORKDIR /app

# Önce bağımlılıklar (katman önbelleği için)
COPY package.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 7000
CMD ["node", "src/index.js"]
