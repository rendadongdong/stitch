export type CharacterMoteDataPointer = `data/${CharacterMotePointer}`;
export type CharacterMotePointer = ``
  | `back_horn`
  | `background_info/brief`
  | `background_info/notes/${string}/element`
  | `background_info/notes/${string}/order`
  | `background_info/notes/${string}`
  | `background_info/notes`
  | `background_info/personality`
  | `background_info/pronouns`
  | `background_info`
  | `editor_excluded`
  | `editor_group`
  | `face`
  | `fallback_actors/${string}/element`
  | `fallback_actors/${string}/order`
  | `fallback_actors/${string}`
  | `fallback_actors`
  | `front_horn`
  | `head_scale`
  | `horn_scale`
  | `idle_text/${string}/element/name`
  | `idle_text/${string}/element/phrase_groups/${string}/element/name`
  | `idle_text/${string}/element/phrase_groups/${string}/element/phrases/${string}/element/emoji`
  | `idle_text/${string}/element/phrase_groups/${string}/element/phrases/${string}/element/text/skip`
  | `idle_text/${string}/element/phrase_groups/${string}/element/phrases/${string}/element/text/text`
  | `idle_text/${string}/element/phrase_groups/${string}/element/phrases/${string}/element/text`
  | `idle_text/${string}/element/phrase_groups/${string}/element/phrases/${string}/element`
  | `idle_text/${string}/element/phrase_groups/${string}/element/phrases/${string}/order`
  | `idle_text/${string}/element/phrase_groups/${string}/element/phrases/${string}`
  | `idle_text/${string}/element/phrase_groups/${string}/element/phrases`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/area`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/artisan`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/boss`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/comfort_status`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/comfort`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/comparisons/${string}/element/comparison`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/comparisons/${string}/element/value0`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/comparisons/${string}/element/value1`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/comparisons/${string}/element`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/comparisons/${string}/order`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/comparisons/${string}`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/comparisons`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/exclusive`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/following`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/group_requirements/${string}/recursion(cl2_quest_requirement)`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/group_requirements`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/infusion_status`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/infusion`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/insight_status`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/insight`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/invert`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/item_id`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/item`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/items_owned/${string}/element/key`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/items_owned/${string}/element/value`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/items_owned/${string}/element`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/items_owned/${string}/order`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/items_owned/${string}`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/items_owned`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/pet`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/quest_status`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/quest`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/require_all`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/stage/comparison`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/stage/stage`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/stage`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/style`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/teleporter_active`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/teleporter_area`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element/time`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/element`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}/order`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements/${string}`
  | `idle_text/${string}/element/phrase_groups/${string}/element/requirements`
  | `idle_text/${string}/element/phrase_groups/${string}/element`
  | `idle_text/${string}/element/phrase_groups/${string}/order`
  | `idle_text/${string}/element/phrase_groups/${string}`
  | `idle_text/${string}/element/phrase_groups`
  | `idle_text/${string}/element/requirements/${string}/element/area`
  | `idle_text/${string}/element/requirements/${string}/element/artisan`
  | `idle_text/${string}/element/requirements/${string}/element/boss`
  | `idle_text/${string}/element/requirements/${string}/element/comfort_status`
  | `idle_text/${string}/element/requirements/${string}/element/comfort`
  | `idle_text/${string}/element/requirements/${string}/element/comparisons/${string}/element/comparison`
  | `idle_text/${string}/element/requirements/${string}/element/comparisons/${string}/element/value0`
  | `idle_text/${string}/element/requirements/${string}/element/comparisons/${string}/element/value1`
  | `idle_text/${string}/element/requirements/${string}/element/comparisons/${string}/element`
  | `idle_text/${string}/element/requirements/${string}/element/comparisons/${string}/order`
  | `idle_text/${string}/element/requirements/${string}/element/comparisons/${string}`
  | `idle_text/${string}/element/requirements/${string}/element/comparisons`
  | `idle_text/${string}/element/requirements/${string}/element/distance`
  | `idle_text/${string}/element/requirements/${string}/element/exclusive`
  | `idle_text/${string}/element/requirements/${string}/element/following`
  | `idle_text/${string}/element/requirements/${string}/element/group_requirements/${string}/recursion(cl2_quest_moment_requirement)`
  | `idle_text/${string}/element/requirements/${string}/element/group_requirements`
  | `idle_text/${string}/element/requirements/${string}/element/infusion_status`
  | `idle_text/${string}/element/requirements/${string}/element/infusion`
  | `idle_text/${string}/element/requirements/${string}/element/insight_status`
  | `idle_text/${string}/element/requirements/${string}/element/insight`
  | `idle_text/${string}/element/requirements/${string}/element/invert`
  | `idle_text/${string}/element/requirements/${string}/element/item_id`
  | `idle_text/${string}/element/requirements/${string}/element/item_ids/${string}/element`
  | `idle_text/${string}/element/requirements/${string}/element/item_ids/${string}/order`
  | `idle_text/${string}/element/requirements/${string}/element/item_ids/${string}`
  | `idle_text/${string}/element/requirements/${string}/element/item_ids`
  | `idle_text/${string}/element/requirements/${string}/element/item`
  | `idle_text/${string}/element/requirements/${string}/element/items_owned/${string}/element/key`
  | `idle_text/${string}/element/requirements/${string}/element/items_owned/${string}/element/value`
  | `idle_text/${string}/element/requirements/${string}/element/items_owned/${string}/element`
  | `idle_text/${string}/element/requirements/${string}/element/items_owned/${string}/order`
  | `idle_text/${string}/element/requirements/${string}/element/items_owned/${string}`
  | `idle_text/${string}/element/requirements/${string}/element/items_owned`
  | `idle_text/${string}/element/requirements/${string}/element/pet`
  | `idle_text/${string}/element/requirements/${string}/element/quest_status`
  | `idle_text/${string}/element/requirements/${string}/element/quest`
  | `idle_text/${string}/element/requirements/${string}/element/require_all`
  | `idle_text/${string}/element/requirements/${string}/element/same_room`
  | `idle_text/${string}/element/requirements/${string}/element/stage/comparison`
  | `idle_text/${string}/element/requirements/${string}/element/stage/stage`
  | `idle_text/${string}/element/requirements/${string}/element/stage`
  | `idle_text/${string}/element/requirements/${string}/element/style`
  | `idle_text/${string}/element/requirements/${string}/element/teleporter_active`
  | `idle_text/${string}/element/requirements/${string}/element/teleporter_area`
  | `idle_text/${string}/element/requirements/${string}/element/time`
  | `idle_text/${string}/element/requirements/${string}/element`
  | `idle_text/${string}/element/requirements/${string}/order`
  | `idle_text/${string}/element/requirements/${string}`
  | `idle_text/${string}/element/requirements`
  | `idle_text/${string}/element`
  | `idle_text/${string}/order`
  | `idle_text/${string}`
  | `idle_text`
  | `name/description`
  | `name/skip`
  | `name/text`
  | `name_color/b`
  | `name_color/g`
  | `name_color/r`
  | `name_color`
  | `name`
  | `scale`
  | `species`
  | `speech_sounds/${string}/element`
  | `speech_sounds/${string}/order`
  | `speech_sounds/${string}`
  | `speech_sounds`
  | `vocal_pitch`
  | `wip/notes/${string}/element/author`
  | `wip/notes/${string}/element/text`
  | `wip/notes/${string}/element/timestamp`
  | `wip/notes/${string}/element`
  | `wip/notes/${string}/order`
  | `wip/notes/${string}`
  | `wip/notes`
  | `wip/staging`
  | `wip`;
