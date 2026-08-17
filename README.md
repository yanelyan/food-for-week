# Food_for_week

Telegram Mini App и обычное веб-приложение для планирования питания на семь дней и автоматического формирования общего списка покупок.

## MVP

- фоновый импорт рецептов с [food.ru](https://food.ru/) по ссылке;
- каталог сохранённых рецептов;
- распределение нескольких блюд по дням и четырём приёмам пищи;
- фиксированный семидневный план;
- автоматическое объединение одинаковых ингредиентов и совместимых единиц;
- отметка купленных продуктов;
- минимальное исправление ингредиентов после импорта;
- автоматическая Telegram-авторизация в production и тестовый пользователь локально;
- работа внутри Telegram и как обычного сайта;
- адаптивный интерфейс с нижним меню и горизонтальными свайпами.

## Планируемый стек

- frontend: React, TypeScript, Vite и Tailwind CSS;
- backend: Python и FastAPI;
- база данных: PostgreSQL;
- локальный запуск и последующее развёртывание на NAS: Docker Compose.

## Быстрый запуск через Docker

Понадобятся Docker и Docker Compose.

```bash
cp .env.example .env
docker compose up --build
```

После запуска:

- приложение: [http://localhost:5173](http://localhost:5173);
- документация API: [http://localhost:8000/docs](http://localhost:8000/docs);
- проверка backend: [http://localhost:8000/api/health](http://localhost:8000/api/health).

PostgreSQL, миграции базы, backend и frontend запускаются автоматически. Данные базы сохраняются в Docker volume.

## Запуск без Docker

Для frontend нужны Node.js 24 и pnpm 11. Для backend нужны Python 3.13 и доступный PostgreSQL.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements-dev.txt

cd frontend
pnpm install
pnpm dev
```

Backend запускается в отдельном терминале после настройки `DATABASE_URL`:

```bash
cd backend
../.venv/bin/alembic upgrade head
PYTHONPATH=. ../.venv/bin/uvicorn app.main:app --reload --port 8000
```

Для временного локального запуска backend можно использовать SQLite:

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

Те же проверки автоматически выполняются в GitHub Actions для каждого push и Pull Request.

## Структура

```text
backend/   FastAPI, SQLAlchemy, Alembic, импорт food.ru
frontend/  React, TypeScript, Vite, Tailwind CSS
docs/      продуктовые решения и тестовые ссылки
```

Ключевые данные каждого пользователя изолированы: рецепты, недельный план и отметки покупок. Локальная разработка использует специального тестового пользователя. В production backend проверяет подпись Telegram Mini App через `TELEGRAM_BOT_TOKEN`.

## Документация

- [Текущие решения по MVP](docs/tekushchie-resheniya-mvp.md)
- [Отложенные вопросы и функции](docs/otlozhennye-voprosy.md)
- [Тестовые рецепты food.ru](docs/testovye-retsepty-food-ru.md)

## Текущий статус

MVP реализован для локального запуска. Развёртывание на NAS и подключение Telegram-бота запланированы после проверки локальной версии.
