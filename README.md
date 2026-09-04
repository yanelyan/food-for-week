# Food_for_week

Telegram Mini App и обычное веб-приложение для планирования питания и автоматического формирования единого списка покупок.

## Что умеет MVP 2

- импортировать рецепты по ссылке с Food.ru, Рамблер/Еда, Gastronom.ru и Яндекс Лавки;
- удалять параметры отслеживания из ссылок и не сохранять один рецепт дважды;
- хранить несколько категорий приёма пищи у одного рецепта и фильтровать каталог;
- планировать несколько блюд на один приём пищи;
- показывать текущий цикл и следующие восемь недель — 63 дня;
- добавлять рецепт из каталога, свайпом вправо или из конкретного блока плана;
- объединять одинаковые ингредиенты и совместимые единицы;
- формировать и настраивать персональный блок «Должно быть дома» для специй, масел, воды и других базовых продуктов;
- исправлять категории и ингредиенты после импорта;
- работать со специальным тестовым пользователем локально и через Telegram-авторизацию в production;
- работать внутри Telegram и как обычный адаптивный сайт.

## Правило дня закупок

При первом запуске пользователь обязательно выбирает день закупок. План начинается с текущего или последнего дня закупки и содержит девять недель. Список покупок охватывает дни после текущего дня закупки до следующего дня закупки включительно.

Например, при закупках по четвергам список считается с пятницы по следующую четверг. В новый день закупки начинается новый цикл и отметки предыдущего списка больше не используются.

## Стек

- frontend: React, TypeScript, Vite и Tailwind CSS;
- backend: Python, FastAPI, SQLAlchemy и Alembic;
- база данных: PostgreSQL в Docker, SQLite для быстрой локальной разработки;
- локальный запуск и последующее развёртывание на NAS: Docker Compose.

## Быстрый локальный запуск через Docker

Понадобятся Docker и Docker Compose.

```bash
cp .env.example .env
docker compose up --build
```

После запуска:

- приложение: [http://localhost:5173](http://localhost:5173);
- документация API: [http://localhost:8000/docs](http://localhost:8000/docs);
- проверка backend: [http://localhost:8000/api/health](http://localhost:8000/api/health).

PostgreSQL, миграции, backend и frontend запускаются автоматически. Данные базы сохраняются в Docker volume.

Файл `.env.example` предназначен только для разработки: он включает специального локального
пользователя. Не публикуйте такой экземпляр в интернете.

## Подготовка production на NAS

Для закрытого production-режима используйте `.env.production.example` как основу, задайте
настоящий `TELEGRAM_BOT_TOKEN`, сложный пароль БД, HTTPS-адрес API и точный адрес frontend.
Backend не запускается в production без токена Telegram. Перед публикацией также нужны HTTPS
reverse proxy и резервное копирование; полная инструкция развёртывания будет оформлена на этапе
NAS-деплоя.

## Запуск без Docker

Для frontend нужны Node.js 24 и pnpm 11. Для backend нужны Python 3.13 и PostgreSQL либо SQLite.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements-dev.txt

cd frontend
pnpm install
pnpm dev
```

Backend запускается в отдельном терминале:

```bash
cd backend
../.venv/bin/alembic upgrade head
PYTHONPATH=. ../.venv/bin/uvicorn app.main:app --reload --port 8000
```

Для временного локального запуска с SQLite:

```bash
cd backend
DATABASE_URL=sqlite:///./food_for_week.sqlite3 ../.venv/bin/alembic upgrade head
DATABASE_URL=sqlite:///./food_for_week.sqlite3 APP_ENV=local PYTHONPATH=. \
  ../.venv/bin/uvicorn app.main:app --reload --port 8000
```

## Проверки

```bash
PYTHONPATH=backend .venv/bin/pytest backend/tests
.venv/bin/ruff check backend
.venv/bin/ruff format --check backend

cd frontend
pnpm lint
pnpm test
pnpm build
```

Те же проверки выполняются в GitHub Actions для каждого push и Pull Request.

## Структура

```text
backend/   FastAPI, модели, миграции, импорт и расчёт покупок
frontend/  React, TypeScript, Vite, Tailwind CSS
docs/      продуктовые решения и тестовые ссылки
```

## Документация

- [Текущие решения MVP 2](docs/tekushchie-resheniya-mvp.md)
- [Отложенные функции](docs/otlozhennye-voprosy.md)
- [Тестовые рецепты Food.ru](docs/testovye-retsepty-food-ru.md)
- [Тестовые рецепты новых источников](docs/testovye-retsepty-mvp-2.md)

## Текущий статус

MVP 2 реализован для локального запуска. Следующие этапы — пользовательская проверка полного сценария, развёртывание на NAS и подключение Telegram-бота.
