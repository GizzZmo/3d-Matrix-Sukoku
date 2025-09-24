# PHP Leaderboard Service
FROM php:8.2-cli

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY backend/php/composer.json .
RUN composer install --no-dev --optimize-autoloader

COPY backend/php/ .

EXPOSE 8083

CMD ["php", "-S", "0.0.0.0:8083", "index.php"]