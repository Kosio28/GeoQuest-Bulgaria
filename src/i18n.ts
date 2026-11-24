export type Language = 'en' | 'bg';
let language: Language = 'bg';
try { language = localStorage.getItem('geoquest-language') === 'en' ? 'en' : 'bg'; } catch { /* Optional storage. */ }
const pairs = `Skip to content|Към съдържанието
Where in Bulgaria?|Къде в България?
Five panoramas. One country. Trust your instincts.|Пет панорами. Една страна. Довери се на усета си.
Explore real places, follow the clues, and put your geography skills to the test.|Разгледай истински места, следвай следите и изпитай географските си умения.
Choose your mode|Избери режим
Classic|Класически
No Move|Без движение
Move, look around, and zoom|Движи се, оглеждай се и приближавай
Look around and zoom from one spot|Оглеждай се и приближавай от едно място
Difficulty|Трудност
Relaxed|Спокойно
Easy|Лесно
Normal|Нормално
Hard|Трудно
Expert|Експерт
Unlimited time|Без ограничение
Play Bulgaria|Играй в България
How to play|Как се играе
Explore|Разгледай
Place your pin|Постави маркер
Chase 25,000|Преследвай 25 000
Look for signs, scenery, and familiar places.|Търси знаци, пейзажи и познати места.
Choose a location on the map. Move your pin until it feels right.|Избери място на картата. Премести маркера, докато си сигурен.
Five rounds. Up to 5,000 points each. The closer, the better.|Пет рунда. До 5 000 точки всеки. Колкото по-близо, толкова по-добре.
Account|Профил
Your account|Твоят профил
Close|Затвори
Close account|Затвори профила
Sign in to save your games and see your past scores.|Влез, за да запазваш игрите и да виждаш резултатите си.
Email|Имейл
Password|Парола
Sign in|Вход
Create account|Регистрация
Past scores|Предишни резултати
Load more|Зареди още
Sign out|Изход
My scores|Моите резултати
Loading your account…|Зареждане на профила…
Could not load your account. Close this window and try again.|Профилът не се зареди. Затвори прозореца и опитай отново.
Loading scores…|Зареждане на резултатите…
Finish a five-round game to see your first score here.|Завърши игра от пет рунда, за да видиш първия си резултат тук.
Could not load your scores.|Резултатите не се заредиха.
Retry|Опитай отново
Back to sign in|Обратно към вход
At least 8 characters|Поне 8 знака
Creating your account…|Създаване на профил…
Signing in…|Влизане…
Check your email for a confirmation link, then sign in.|Провери имейла си за връзка за потвърждение, после влез.
Could not connect. Try again.|Няма връзка. Опитай отново.
Signed out.|Излезе от профила.
Could not sign out. Check your connection and try again.|Изходът е неуспешен. Провери връзката и опитай отново.
This confirmation link has expired or is invalid. Try signing in or creating your account again.|Връзката за потвърждение е изтекла или невалидна. Опитай да влезеш или да се регистрираш отново.
Loading the game…|Зареждане на играта…
The game could not load. Check your connection and try again.|Играта не се зареди. Провери връзката и опитай отново.
Retry round|Опитай рунда отново
Retry saving|Опитай запазването отново
GUESS|ПОТВЪРДИ
Your guess|Твоят маркер
Actual location|Истинско място
Imagery:|Изображения:
Expand map|Разгъни картата
Shrink map|Свий картата
Next photo|Следваща снимка
Previous photo|Предишна снимка
Step forward|Напред
Step back|Назад
Step left|Наляво
Step right|Надясно
Turn left|Завърти наляво
Turn right|Завърти надясно
Turn around|Обърни се
Nearby photo|Близка снимка
No Move · Drag to look around. Scroll to zoom.|Без движение · Влачи за оглед. Превърти за приближаване.
Moving…|Преместване…
Drag to look around. Scroll to zoom.|Влачи за оглед. Превърти за приближаване.
No connected photos here. You can still look around and zoom.|Тук няма свързани снимки. Можеш да се оглеждаш и приближаваш.
Looking for nearby photos…|Търсене на близки снимки…
Some map data could not load. Check your connection.|Част от картата не се зареди. Провери връзката.
Finding a verified Bulgarian panorama…|Търсене на проверена панорама от България…
Set VITE_MAPILLARY_ACCESS_TOKEN in .env.local and restart the server.|Настрой VITE_MAPILLARY_ACCESS_TOKEN в .env.local и рестартирай сървъра.
No more verified panoramas are available.|Няма повече проверени панорами.
The guessing map could not start. Check that WebGL is enabled and retry.|Картата не се зареди. Провери дали WebGL е включен и опитай отново.
GAME COMPLETE|ИГРАТА ЗАВЪРШИ
ROUND|РУНД
RESULT|РЕЗУЛТАТ
Round|Рунд
pts|т.
away|разстояние
Average error:|Средно отклонение:
Total error:|Общо отклонение:
Duration:|Времетраене:
Total:|Общо:
Play Again|Играй отново
View Game Summary|Обобщение на играта
Next Round|Следващ рунд
Saving your score…|Запазване на резултата…
Score saved to your account.|Резултатът е запазен в профила ти.
Sign in before finishing your next game to save its score.|Влез преди края на следващата игра, за да запазиш резултата.
Could not save your score.|Резултатът не се запази.
Score is waiting to sync. Retry when you’re connected.|Резултатът чака синхронизация. Опитай отново, когато имаш връзка.
No guess placed|Няма поставен маркер
Time expired|Времето изтече
PERFECT SCORE!|ПЕРФЕКТЕН РЕЗУЛТАТ!
Personal best|Личен рекорд
New personal best!|Нов личен рекорд!
No completed games yet|Все още няма завършени игри
Could not load personal best|Личният рекорд не се зареди
s|сек
m|м
km|км
min|мин
WebGL support is required for interactive panoramas.|За интерактивни панорами е необходим WebGL.
This image has no verified position inside Bulgaria.|Снимката няма проверено местоположение в България.
Mapillary does not identify this image as a spherical panorama.|Mapillary не разпознава снимката като сферична панорама.
Mapillary could not load this image. Try again or check the client token.|Mapillary не зареди снимката. Опитай отново или провери клиентския токен.
Mapillary could not complete the request. Check the connection and try again.|Mapillary не изпълни заявката. Провери връзката и опитай отново.
The Mapillary request timed out. Try again.|Заявката към Mapillary изтече. Опитай отново.
Mapillary access was denied. Check the client token.|Достъпът до Mapillary е отказан. Провери клиентския токен.
Mapillary is temporarily unavailable. Try again.|Mapillary временно не е достъпен. Опитай отново.
Sign-in failed. Check your details or try again later.|Влизането е неуспешно. Провери данните си или опитай по-късно.
Map data: Natural Earth · Public domain|Картографски данни: Natural Earth · Обществено достояние
Five rounds|Пет рунда
25,000 points|25 000 точки
Real panoramas|Истински панорами
Location map|Карта за предположения
Game round|Игрален рунд
Explore connected images|Разгледай свързаните снимки
Zoom in|Приближи
Zoom out|Отдалечи`;
const bg: Record<string, string> = Object.fromEntries(pairs.split('\n').map(row => row.split('|')));
export const lang = () => language;
export const t = (text: string): string => {
  if (language === 'en') return text;
  if (bg[text]) return bg[text];
  const checking = /^Checking image (\d+)…$/.exec(text);
  if (checking) return `Проверка на снимка ${checking[1]}…`;
  const loading = /^Loading image (\d+)…$/.exec(text);
  if (loading) return `Зареждане на снимка ${loading[1]}…`;
  const pool = /^(\d+) starting locations available, including the verified starter set\.$/.exec(text);
  if (pool) return `${pool[1]} налични начални места, включително проверения начален набор.`;
  const connections = /^(\d+) Mapillary graph connections\. Destinations are checked when selected\.$/.exec(text);
  if (connections) return `${connections[1]} връзки в Mapillary. Местата се проверяват при избор.`;
  return text;
};
const originals = new WeakMap<Node, string>();
export function translatePage(root: Node = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest('script,style,[data-dynamic],[data-en][data-bg]')) continue;
    const source = originals.get(node) ?? node.textContent!;
    originals.set(node, source);
    const key = source.trim();
    const translated = source.replace(key, t(key));
    if (node.textContent !== translated) node.textContent = translated;
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-label]')) el.setAttribute('aria-label', t(el.dataset.label!));
  for (const el of document.querySelectorAll<HTMLElement>('[data-en][data-bg]')) el.textContent = el.dataset[language]!;
  document.documentElement.lang = language;
  document.getElementById('language')!.textContent = language === 'bg' ? 'EN' : 'BG';
}
export function initializeLanguage() {
  translatePage();
  document.getElementById('language')!.onclick = () => {
    language = language === 'bg' ? 'en' : 'bg';
    try { localStorage.setItem('geoquest-language', language); } catch { /* Optional. */ }
    translatePage();
    window.dispatchEvent(new Event('languagechange'));
  };
}
