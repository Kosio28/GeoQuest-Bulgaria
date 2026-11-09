# GeoQuest Bulgaria

GeoQuest Bulgaria е училищен проект на **Константин и Илиан**, ученици в 10. клас. Идеята е ученици от 5. до 8. клас да упражняват географията на България, като разпознават места по снимки и ги посочват на карта.

## Как ще се играе

1. Виждаш снимка на място в България.
2. Поставяш маркер върху картата и потвърждаваш предположението си.
3. Виждаш правилното място, разстоянието до твоя маркер, спечелените точки и кратък географски факт.
4. След пет рунда получаваш общ резултат.

Планирани са три нива. След две точни предположения поред трудността се повишава с едно ниво, а след две неточни поред се понижава. Предвидени са тренировка с избор на област, регистрация, лична история и класация. За първата версия ще използваме статични снимки с разрешен лиценз.

## Технологии

- **HTML, CSS и JavaScript** за интерфейса и играта.
- **Leaflet** за интерактивната карта и маркерите.
- **Supabase** за профилите, съхранението на резултатите и правата за достъп.

## Етап 1

Срокът за етапа е **14 ноември 2026 г.** Локално са подготвени проучване на три сходни игри, план, два означени макета, модел на базата с ER диаграма, 12 описания на задачи и чернова на седмичния отчет. Играта и базата предстои да се разработят.

Планираната структура е `docs/` за документацията и макетите, `database/` за модела на данните, `src/` за играта, `tests/` за тестовете и `presentation/` за материалите за защита.

## Play the prototype

The home page now runs a five-round game. Choose **Classic** to follow connected imagery, or **No Move** to stay on the starting panorama. Both modes let you look around and zoom without a time limit. Expand the guessing map, click to place or move your pin, and select **GUESS**. Each round is worth up to 5,000 points; the game summary shows your score, distances, and elapsed time.

The game uses MapLibre GL JS and the [OpenStreetMap Standard tile service](https://operations.osmfoundation.org/policies/tiles/) for interactive, on-demand map browsing. Keep the attribution visible. The curated Mapillary pool is selected without repeats within a game, and starting captures are checked against Mapillary and the Bulgarian boundary before a round starts.

Run **npm test** for distance, scoring, and round progression checks.

## Setup and Panorama Lab

The TypeScript prototype uses MapillaryJS and Vite. Use Node.js 22.12 or later.

1. Sign in to the [Mapillary developer dashboard](https://www.mapillary.com/dashboard/developers), choose **Register application**, and enable the **READ** scope for public imagery. Copy the application's **Access Token**. Vite makes this client token available to the browser. Keep the client secret and any user access token out of the project.
2. In the project root, beside `package.json`, create or edit `.env.local` and save this line with your actual client access token:

   ```dotenv
   VITE_MAPILLARY_ACCESS_TOKEN=your_client_access_token_here
   ```

   Keep [the example configuration](.env.example) free of credentials. Run `git check-ignore -v .env.local` to verify the ignore rule and `git ls-files -- .env.local` to confirm the file is untracked. The second command should print nothing.
3. Run `npm ci` and then `npm run dev`. Restart Vite if it was running when you saved the token. Open the local URL printed by Vite and select **Play**. Open **Panorama Lab** from the home page for the Phase 1 controls: **Load random panorama**, manual ID lookup, and **Scan coverage**.

To verify navigation with a known capture, enter `881801330329324` under **Mapillary image ID** and select **Load ID**. The lab should identify the Sofia capture as spherical. Under **Navigation connections**, choose **Next · 558486230070761** if it appears and confirm that the displayed image ID changes.

Drag the panorama to turn or look up and down. Scroll or use the zoom buttons. Use the connection buttons to navigate and the fullscreen button to expand the viewer. If the browser declines native fullscreen, the viewer fills the browser viewport.

Run `npm run build` for type checking and a production build. Run `npm run coverage` for a fresh terminal sample with the same token. Interactive imagery needs network access and WebGL.

See the [Bulgaria coverage report](docs/MAPILLARY_COVERAGE.md) for results, scope, and data sources.
