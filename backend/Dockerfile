FROM php:8.4-cli-alpine

RUN apk add --no-cache \
    git curl libpq-dev libpng-dev libxml2-dev zip unzip oniguruma-dev \
    && docker-php-ext-install pdo pdo_pgsql bcmath

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

EXPOSE 8000

CMD ["sh", "-c", "composer install --no-interaction && php artisan key:generate --force && php artisan migrate --force && php artisan db:seed --force && php artisan serve --host=0.0.0.0 --port=8000"]