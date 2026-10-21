FROM php:8.4-cli-alpine

RUN apk add --no-cache \
    git curl libpq-dev libpng-dev libxml2-dev zip unzip oniguruma-dev \
    && docker-php-ext-install pdo pdo_pgsql bcmath opcache \
    && { \
        echo 'zend_extension=opcache'; \
        echo 'opcache.enable=1'; \
        echo 'opcache.enable_cli=1'; \
        echo 'opcache.memory_consumption=256'; \
        echo 'opcache.interned_strings_buffer=16'; \
        echo 'opcache.max_accelerated_files=20000'; \
        echo 'opcache.validate_timestamps=1'; \
        echo 'opcache.revalidate_freq=0'; \
    } > /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

EXPOSE 8000

CMD ["sh", "-c", "composer install --no-interaction && php artisan migrate --force && php artisan db:seed --force && php artisan config:cache && php artisan route:cache && php artisan serve --host=0.0.0.0 --port=8000 --no-reload"]