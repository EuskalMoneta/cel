FROM silarhi/php-apache:7.4-symfony

EXPOSE 80
WORKDIR /app

# Default APP_VERSION, real version will be given by the CD server
ARG APP_VERSION=dev
ENV APP_VERSION="${APP_VERSION}"

COPY symfony/ /app

RUN apt-get update && \
    apt-get install -y libpng-dev && \
    docker-php-ext-configure gd && \
    docker-php-ext-install gd

RUN mkdir -p var && \
    echo "APP_ENV=prod" > .env.local && \
    echo "DATABASE_URL=sqlite:///%kernel.project_dir%/var/db.sqlite" >> .env.local && \
    composer install --optimize-autoloader --no-interaction --no-ansi --no-dev && \
    bin/console cache:clear --no-warmup && \
    bin/console cache:warmup && \
    # =============================================
    # regenerate migrations for SQLite and run them
    rm src/Migrations/*.php && \
    bin/console doctrine:database:create && \
    bin/console doctrine:migrations:diff && \
    bin/console doctrine:migrations:migrate && \
    # =============================================
    chown -R www-data:www-data var

