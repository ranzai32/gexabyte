# backend/Dockerfile

FROM node:18-alpine

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы бэкенда
COPY . .

# Бэкенд будет слушать этот порт
EXPOSE 3001

# Команда для запуска сервера
CMD printenv && node server.js