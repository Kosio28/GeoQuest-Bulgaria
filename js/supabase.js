// 1) Въведи Project URL и Publishable Key от Supabase Dashboard.
// ВАЖНО: Никога не поставяй service_role / Secret key в браузърния код.
import { createClient } from "sb_publishable_RNENpB1xGZh1Y_UlC3SPtw_RQZauEB9";

const SUPABASE_URL = "dfhetorrlvrylvhbhtcp";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_RNENpB1xGZh1Y_UlC3SPtw_RQZauEB9";

export const supabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("PASTE_") &&
  !SUPABASE_PUBLISHABLE_KEY.includes("PASTE_");

export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

export async function fetchChallenges() {
  if (!supabaseConfigured) {
    throw new Error("Добави Supabase Project URL и Publishable Key във файла js/supabase.js.");
  }

  // Очаква се връзка challenges -> locations и locations -> regions.
  const { data, error } = await supabase
    .from("challenges")
    .select(`
      id,
      question,
      image_url,
      difficulty,
      locations (
        id,
        name,
        latitude,
        longitude,
        fact,
        regions ( name )
      )
    `);

  if (error) throw new Error(`Supabase: ${error.message}`);

  const valid = (data || []).filter(item =>
    item.locations &&
    Number.isFinite(Number(item.locations.latitude)) &&
    Number.isFinite(Number(item.locations.longitude))
  );

  if (valid.length < 5) {
    throw new Error(`В Supabase има само ${valid.length} валидни въпроса. Добави поне 5 записа в challenges с locations и координати.`);
  }
  return valid;
}
