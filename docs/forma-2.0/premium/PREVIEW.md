# Тестовая версия Premium Fitness

Ветка `feature/forma-2.0`, Draft PR #4. Не запускать workflow Pages: он публикует production.
Для локальной проверки в отдельном origin (не использует данные действующего сайта):
```sh
git clone --branch feature/forma-2.0 https://github.com/prisashapri-ux/Forms-veb.git forma-preview
cd forma-preview
npm ci
npm test
npm run build
python -m http.server 8765 --bind 127.0.0.1 --directory dist
```
Node 22, Python 3. Открыть http://127.0.0.1:8765/ на ПК. Для телефона/планшета использовать отдельный HTTPS preview origin в Codex/Work, если доступен; не публиковать production и не переносить реальные данные или ключи в публичный preview.
Проверить пять экранов в обеих темах, SVG InBody, уведомление DeepSeek до ввода, 390/768/1024/1440 px, прокрутку и клавиатуру, тренировку, питание, backup/restore на синтетических данных. Реальный PDF и Safari проверять отдельно. До прохождения тестов не объединять PR. 
