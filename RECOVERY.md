# 🚨 RECOVERY.md — Инструкция по Восстановлению Somanatha Shop

> **Эта папка — спасательный круг бизнеса.**
> Внутри находится всё необходимое для запуска сайта заново на любом хостинге.
> Читайте строго по шагам. Не пропускайте ничего. Каждый шаг важен.

> 🔐 **Архив зашифрован!** Файл `.7z` защищён шифрованием AES-256.
> Без пароля открыть его **невозможно** — даже имена файлов внутри скрыты.
> Пароль хранится в: **GitHub → Settings → Secrets → Actions → `BACKUP_ARCHIVE_PASSWORD`**

---

## 📦 Что находится в этой папке?

| Папка / Файл | Что это |
|---|---|
| `secrets/.env.local` | Все пароли и ключи (хранить осторожно!) |
| `code/source.tar.gz` | Архив с исходным кодом сайта |
| `code/git-bundle.git` | Полная история изменений кода |
| `data/exports/` | База данных — товары, заказы, клиенты (файлы `.ndjson`) |
| `media/` | Все фотографии и видео товаров |
| `config/` | Конфигурация Firebase и настройки сайта |
| `functions-backup/` | Серверные функции (уведомления, платежи) |
| `tools/` | Скрипты для восстановления базы данных |
| `MANIFEST.json` | Статистика пакета (дата, количество записей) |
| `RECOVERY.md` | Этот файл 👋 |

---

## 📋 Что нужно знать перед началом

**Время восстановления:** ~1.5 часа при хорошем интернете

**Что вам понадобится:**
- Компьютер с Windows, Mac или Linux
- Доступ к аккаунту Google, который управляет проектом `somanatha-shop`
- Терминал (командная строка)

**Где открыть терминал:**
- Windows: нажмите `Win + R`, введите `cmd`, нажмите Enter
- Mac: нажмите `Cmd + Space`, введите `Terminal`

---

## 🛠 Подготовка — Установка инструментов

Выполните один раз. Если программы уже установлены — переходите к Шагу 1.

### Node.js
Скачайте с **https://nodejs.org** (кнопка **"LTS"**), установите как обычную программу.
```
node --version
```
Ожидаемый ответ: `v22.x.x` ✅

### Git
Скачайте с **https://git-scm.com/downloads**, установите с настройками по умолчанию.
```
git --version
```
Ожидаемый ответ: `git version 2.x.x` ✅

### Firebase CLI
```
npm install -g firebase-tools
firebase --version
```
Ожидаемый ответ: `13.x.x` ✅

### 7-Zip (для расшифровки архива)
Нужен для открытия зашифрованного файла `.7z`.

**Windows:** Скачайте с **https://www.7-zip.org** → установите как обычную программу.
После установки откройте **новый** терминал и проверьте:
```
7z --help
```
Должны появиться строки с версией 7-Zip ✅

**Mac:**
```
brew install p7zip
```

**Linux (Ubuntu/Debian):**
```
sudo apt-get install p7zip-full
```

---

## 🔓 Шаг 0 — Расшифруйте архив (ДЕЛАЕТСЯ ПЕРВЫМ)

Архив `.7z` зашифрован. Без этого шага вы не сможете ни открыть файлы, ни прочитать содержимое.

### Где взять пароль?
Пароль хранится в GitHub репозитории:
1. Откройте: **https://github.com/MAStif55/somanatha-shop**
2. Перейдите: **Settings → Secrets and variables → Actions**
3. Найдите секрет: **`BACKUP_ARCHIVE_PASSWORD`**
4. Скопируйте значение (нажмите на иконку копирования)

Если доступа к GitHub нет — обратитесь к владельцу проекта.

### Как распаковать архив?

Откройте терминал в папке, куда скачали архив, и выполните:
```
7z x somanatha-recovery-YYYY-MM-DD.7z
```
*(замените `YYYY-MM-DD` на фактическую дату в имени файла)*

7-Zip спросит пароль:
```
Enter password (will not be echoed):
```
Вставьте пароль и нажмите Enter (символы **не отображаются** — это нормально).

После успешной расшифровки в текущей папке появятся все файлы:
`RECOVERY.md`, `MANIFEST.json`, `secrets/`, `code/`, `data/`, `media/` и т.д.

> ✅ Вы сейчас в правильном месте! Переходите к Шагу 1.

---

## 🔐 Шаг 1 — Проверьте секреты (пароли и ключи)

Все ключи уже находятся в папке `secrets/.env.local` внутри этого архива.
Их туда поместили автоматически при создании пакета.

### 1.1 Скопируйте .env.local в папку с кодом

Сначала распакуйте код (Шаг 2 объяснит подробно), затем скопируйте файл:

```
copy secrets\.env.local site\.env.local
```
*(На Mac/Linux: `cp secrets/.env.local site/.env.local`)*

### 1.2 Проверьте, все ли ключи на месте

```
cd site
node tools\audit-secrets.js --env .env.local
```

Если все ключи на месте, вы увидите:
```
🎉 All required secrets are present. Safe to deploy!
```

Если какие-то ключи отсутствуют (`❌ MISSING`), вам нужно добавить их вручную.
Найдите значения в Firebase Console (сайт: console.firebase.google.com) или обратитесь к владельцу проекта.

---

## 📂 Шаг 2 — Распакуйте исходный код

### 2.1 Создайте рабочую папку и распакуйте код

**Windows (PowerShell):**
```
mkdir site
tar -xzf code\source.tar.gz -C site
cd site
```

**Mac / Linux:**
```
mkdir site
tar -xzf code/source.tar.gz -C site
cd site
```

Внутри папки `site/` должны появиться файлы: `package.json`, `src/`, `functions/` и другие.

### 2.2 Скопируйте ключи
```
copy ..\secrets\.env.local .env.local
```
*(На Mac/Linux: `cp ../secrets/.env.local .env.local`)*

---

## 🗄 Шаг 3 — Восстановите базу данных

Здесь мы загрузим обратно все товары, заказы и клиентов из папки `data/exports/`.

### 3.1 Войдите в Firebase
```
firebase login
```
Откроется браузер — войдите через тот же Google-аккаунт, который управляет проектом `somanatha-shop`. Вернитесь в терминал.

### 3.2 Установите инструменты восстановления

```
cd ..\tools
npm install
```
*(Или `cd ../tools` на Mac/Linux)*

### 3.3 Запустите восстановление базы данных

```
node restore-firestore.js --in ..\data\exports
```
*(На Mac/Linux: `node restore-firestore.js --in ../data/exports`)*

Скрипт покажет прогресс:
```
  ✔  Firebase Admin SDK initialized

  Restoring products from products.ndjson (245 KB) ... ✔
      → 142 imported
  Restoring orders from orders.ndjson (1.2 MB) ... ✔
      → 1847 imported
  Restoring customers from customers.ndjson (380 KB) ... ✔
      → 923 imported
  ...

✔  Restore complete!  3847 docs processed
✔  3847 documents written to Firestore
```

> ⚠️ **Безопасно:** По умолчанию скрипт работает в режиме SKIP — он **не перезапишет** документы, которые уже есть в базе. Добавляет только отсутствующие.

### 3.4 Проверьте данные в Firebase Console

Откройте в браузере: **https://console.firebase.google.com → somanatha-shop → Firestore Database**

Убедитесь, что коллекции появились: `products`, `orders`, `customers`.

---

## 🖼 Шаг 4 — Загрузите медиафайлы

Загрузим фотографии и видео из папки `media/` обратно в Firebase Storage.

### Вариант А — Через команду (рекомендуется)

Вернитесь в папку `site/`:
```
cd ..\site
```
*(На Mac/Linux: `cd ../site`)*

Залогиньтесь в Google Cloud:
```
gcloud auth activate-service-account --key-file=..\secrets\service-account.json
```

Загрузите файлы:
```
gsutil -m cp -r ..\media\products gs://somanatha-shop.appspot.com/products
gsutil -m cp -r ..\media\static gs://somanatha-shop.appspot.com/static
```
*(На Mac/Linux замените `..\` на `../`)*

Дождитесь завершения (10–40 минут в зависимости от объёма).

### Вариант Б — Через веб-интерфейс (проще, но медленнее)

1. Откройте: **https://console.firebase.google.com → somanatha-shop → Storage**
2. Нажмите **Upload folder**
3. Выберите папку `media/products/` → загрузите
4. Повторите для `media/static/`

---

## 🚀 Шаг 5 — Сборка и публикация сайта

Теперь соберём и опубликуем сайт.

### 5.1 Установите все зависимости

Убедитесь, что находитесь в папке `site/`:
```
npm install
```
Займёт 2–5 минут. Нормально появление строк типа `added 847 packages` ✅

### 5.2 Проверьте сайт локально (необязательно, но рекомендуется)

```
npm run dev
```
Откройте браузер: **http://localhost:3000**
Если сайт открывается — код работает ✅ Остановите: `Ctrl+C`

### 5.3 Соберите финальную версию

```
npm run build
```
Займёт 2–5 минут. В конце должно появиться:
```
✓ Compiled successfully
✓ Generating static pages (XX/XX)
```

Если сборка упала с ошибкой — проверьте, что `.env.local` на месте и заполнен.

### 5.4 Опубликуйте сайт

```
firebase deploy --only hosting --project somanatha-shop
```
По завершении Firebase выдаст ссылку:
```
✔  Deploy complete!
Hosting URL: https://somanatha-shop.web.app
```

### 5.5 Разверните серверные функции

```
cd functions
npm install
firebase deploy --only functions --project somanatha-shop
cd ..
```

---

## ✅ Финальная проверка

Откройте сайт в браузере и убедитесь:

- [ ] Главная страница открывается
- [ ] Товары отображаются с фотографиями
- [ ] Можно добавить товар в корзину и открыть её
- [ ] Форма заказа отправляется (вам приходит уведомление в Telegram)
- [ ] Платёжная страница открывается при выборе "оплата картой"
- [ ] Страница `/admin` открывается и требует авторизацию

Если все пункты ✅ — восстановление завершено! 🎉

---

## ⚠️ Частые ошибки и их решение

### ❌ `'firebase' is not recognized` — Firebase CLI не найдена

**Решение:**
1. Закройте терминал, откройте новый
2. Выполните: `npm install -g firebase-tools`
3. Проверьте: `firebase --version`

---

### ❌ `Error: Failed to get credentials` — нет доступа к Firebase

**Причина:** Вы не вошли в Firebase, или у аккаунта нет прав.

**Решение:**
1. `firebase logout`
2. `firebase login`
3. Войдите через **тот Google-аккаунт**, который создавал проект
4. Если не знаете какой — зайдите в Firebase Console → Project Settings → Members и попросите владельца добавить ваш аккаунт

---

### ❌ Сборка (`npm run build`) упала с ошибкой о переменных окружения

**Причина:** `.env.local` отсутствует или в нём пустые значения.

**Решение:**
1. Убедитесь, что файл `secrets/.env.local` полностью скопирован в папку `site/`
2. Запустите аудит: `node tools/audit-secrets.js --env .env.local`
3. Добавьте недостающие ключи из Firebase Console

---

### ❌ Сайт открывается, но товары не показываются

**Причина:** База данных не восстановлена или Storage не настроен.

**Решение:**
1. Проверьте Firebase Console → Firestore — есть ли коллекция `products`?
2. Если нет — повторите Шаг 3
3. Проверьте Firebase Console → Storage — есть ли папка `products/`?
4. Если нет — повторите Шаг 4

---

### ❌ Уведомления в Telegram не приходят

**Причина:** `TELEGRAM_BOT_TOKEN` или `TELEGRAM_CHAT_ID` в `functions/.env` неверные.

**Решение:**
1. Посмотрите значения в `secrets/.env.local`
2. Установите их в Firebase Functions: `firebase functions:config:set telegram.bot_token="..." telegram.chat_id="..."`
3. Переразверните функции: `firebase deploy --only functions`

---

## 📞 Контакты для экстренной связи

| Кого позвать | Когда |
|---|---|
| **Владелец проекта** | Нет доступа к паролям / аккаунту Google / Firebase |
| **Разработчик** | Незнакомые ошибки при сборке, код не компилируется |
| **Google Firebase Support** | https://firebase.google.com/support |

---

## 🔧 Продвинутые операции (для разработчика)

### Восстановить только определённые коллекции
```
node tools/restore-firestore.js --in data/exports --collections products,settings
```

### Принудительно перезаписать все данные (⚠️ опасно — спросит подтверждение)
```
node tools/restore-firestore.js --in data/exports --overwrite
```

### Симуляция восстановления (без записи в базу)
```
node tools/restore-firestore.js --in data/exports --dry-run
```

### Восстановить git-историю для продолжения разработки
```
git clone code/git-bundle.git ./project-restored
cd project-restored
git remote remove origin
git remote add origin https://github.com/MAStif55/somanatha-shop.git
```

---

*📅 Дата создания пакета: см. `MANIFEST.json` → поле `created_at`*
*🔖 Версия инструкции: 2.0*
