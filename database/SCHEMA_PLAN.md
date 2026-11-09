# Модел на данните — игра по снимки
Статус: проектен модел. Няма създадена база или изпълнен schema.sql. Реализацията е за седмица 2.
PK — първичен ключ; FK — външен ключ. Всички полета са задължителни освен отбелязаните nullable. UUID ключовете се генерират с gen_random_uuid(), с изключение на профила.

## public.profiles
- id uuid PK/FK → auth.users.id, ON DELETE CASCADE.
- nickname varchar(30), UNIQUE, дължина 3–30; публичен псевдоним.
- created_at timestamptz, default now().
Имейлът остава в Auth и не се публикува в класацията.

## public.regions
- id smallint PK, диапазон 1–28, вътрешен идентификатор.
- name varchar(80), UNIQUE; center_name varchar(80).
София (столица) и Софийска област са отделни редове.

## private.locations
- id uuid PK; region_id smallint FK → public.regions.id, ON DELETE RESTRICT.
- name varchar(120).
- latitude numeric(9,6), CHECK [-90,90]; longitude numeric(9,6), CHECK [-180,180].
- fact text; fact_source_url text; coordinate_source_url text.
- verified boolean, default false.
Името, точните координати и фактът са частни до отговора. В първата версия всяко място е конкретна еднозначна точка в една област. Обекти, пресичащи няколко области, не се включват без уточнение.

## public.questions
- id uuid PK; location_id uuid FK → private.locations.id, ON DELETE RESTRICT.
- prompt text; difficulty smallint CHECK 1–3; category text CHECK in ('city','nature','landmark').
- image_path text; image_page_url text; image_author text; image_license text; attribution_text text.
- verified boolean, default false.
Снимката-въпрос е свързана с едно място. Няма директен клиентски достъп до таблицата; сървърът връща само текущия въпрос и разрешените атрибуции. Пътят и файлът на изображението не бива ненужно да изписват отговора, но лицензът винаги се спазва.

## public.sessions
- id uuid PK; profile_id uuid FK → profiles.id, ON DELETE CASCADE.
- mode text CHECK in ('ranked','practice').
- region_filter_id smallint nullable FK → regions.id, ON DELETE RESTRICT; null означава всички области.
- category_filter text nullable; initial_level smallint CHECK 1–3.
- status text CHECK in ('active','completed','abandoned').
- total_points integer CHECK 0–25000, default 0.
- started_at timestamptz, default now(); completed_at timestamptz nullable.
Сървърът разрешава ranked само при всички области/теми и initial_level=1. Пълен резултат изисква точно пет оценени рунда.

## public.attempts
- id uuid PK; session_id uuid FK → sessions.id, ON DELETE CASCADE.
- question_id uuid FK → questions.id, ON DELETE RESTRICT.
- round_no smallint CHECK 1–5.
- guess_lat numeric(9,6) nullable CHECK [-90,90]; guess_lng numeric(9,6) nullable CHECK [-180,180].
- distance_km double precision nullable, крайно число ≥0.
- points smallint nullable CHECK 0–5000; answered_at timestamptz nullable.
- UNIQUE(session_id, round_no); UNIQUE(session_id, question_id).
Сървърът създава предстоящ рунд с null за предположението и оценката. При избор на нов рунд заключва сесията и проверява `location_id` през въпросите от всички нейни опити. Уникалността по `question_id` сама по себе си позволява две различни снимки на едно място. При отговор всички полета за предположение, разстояние, точки и answered_at се попълват заедно; частично попълнен резултат е забранен с CHECK. Заключването на реда/транзакция осигурява само едно оценяване при повторни заявки.

## Връзки и отчет
Един профил → много сесии → до пет опита. Въпрос → много опити. Място → много снимки-въпроси. Област → много места и сесии с филтър. Частната таблица locations има FK към public.regions. ER: docs/design/03-er-diagram.png и ER_DIAGRAM.mmd.

## Планирани права
RLS за всяка таблица в public и минимални GRANT права. Областите могат да се четат публично. Профилът е достъпен за собственика при auth.uid()=id; позволена е само редакция на собствения псевдоним, без прехвърляне на id. Сесиите и опитите са видими само на собственика; връзката attempts→sessions установява собствеността. Няма директен клиентски запис на авторитетни точки, нови рундове и статус completed.

questions не се излага директно на anon/authenticated; текущият въпрос се връща чрез контролирана Edge Function. private.locations е в неизложена схема без клиентски GRANT. Само доверен сървър чете координатите и разкрива правилното място след запис на отговор. Публичният маршрут за класация връща псевдоним и точки от пълни ranked сесии, без идентификатори, координати и имейли.

Edge Function проверява автентичността и собственика на сесията, допустимия рунд, координатите и еднократното оценяване. Секретният ключ остава само на сървъра. Гостът играе тренировка с краткотрайна сървърна сесия; не записва в таблиците за класирани потребители и няма права за чужди опити. Доверената оценка на госта и лимитите ще се специфицират при реализацията.

Това е план, не доказана сигурност. Нужни са проверки с два акаунта и гост, опит за промяна на чужда сесия, повторно потвърждение и директно четене на истинските координати.
