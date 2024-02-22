# Используем базовый образ Node.js
FROM node:16-alpine as builder

# Устанавливаем рабочую директорию в контейнере
WORKDIR /app

# Копируем package.json и package-lock.json в контейнер
COPY package*.json ./

RUN npm ci --verbose --no-audit

# Копируем остальные файлы проекта в контейнер
COPY tsconfig.json ./
COPY src ./src/
COPY scripts ./scripts/
COPY scripts ./scripts/
COPY public ./public/
COPY config ./config/

RUN npm run build

# Stage 2: Запустить Nginx и использовать собранные файлы React
FROM nginx:alpine

# Копировать собранные файлы React из предыдущего этапа в Nginx
COPY --from=builder /app/build /usr/share/nginx/html/web-app

# Указать порт, который будет использоваться во время выполнения контейнера
EXPOSE 80

# Команда для запуска Nginx при запуске контейнера
CMD ["nginx", "-g", "daemon off;"]