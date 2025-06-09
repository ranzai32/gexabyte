# frontend/Dockerfile

# --- Этап 1: Сборка React-приложения ---
FROM node:18-alpine AS build

WORKDIR /app

# Копируем package.json и package-lock.json для установки зависимостей
COPY package*.json ./
RUN npm install

# Копируем остальные файлы фронтенда
COPY . .

# Получаем переменные окружения как аргументы сборки
ARG VITE_BACKEND_URL
ARG VITE_UNISWAP_V3_SWAP_ROUTER_ADDRESS
ARG VITE_UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS
ARG VITE_BACKEND_OPERATOR_ADDRESS

# Записываем аргументы в .env файл, который будет использоваться Vite при сборке
RUN echo "VITE_BACKEND_URL=${VITE_BACKEND_URL}" > .env
RUN echo "VITE_UNISWAP_V3_SWAP_ROUTER_ADDRESS=${VITE_UNISWAP_V3_SWAP_ROUTER_ADDRESS}" >> .env
RUN echo "VITE_UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS=${VITE_UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS}" >> .env
RUN echo "VITE_BACKEND_OPERATOR_ADDRESS=${VITE_BACKEND_OPERATOR_ADDRESS}" >> .env

# Собираем production-версию приложения
RUN npm run build

# --- Этап 2: Настройка Nginx для раздачи статики ---
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html

# Удаляем стандартную страницу Nginx
RUN rm -rf ./*

# Копируем собранные файлы из этапа сборки
COPY --from=build /app/dist .

# Копируем конфигурацию Nginx
# Этот конфиг будет перенаправлять запросы /api на бэкенд
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт 80
EXPOSE 80

# Запускаем Nginx
ENTRYPOINT ["nginx", "-g", "daemon off;"]