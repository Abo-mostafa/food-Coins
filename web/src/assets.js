// Asset manifest. Vite resolves these to hashed URLs at build time.
import broast from '../assets/food/broast.svg?url';
import shawarma from '../assets/food/shawarma.svg?url';
import pizza from '../assets/food/pizza.svg?url';
import burger from '../assets/food/burger.svg?url';
import club from '../assets/food/club.svg?url';
import fries from '../assets/food/fries.svg?url';
import bucket from '../assets/meals/bucket.svg?url';
import pizzaBox from '../assets/meals/pizzaBox.svg?url';
import burgerMeal from '../assets/meals/burgerMeal.svg?url';
import shawarmaPlate from '../assets/meals/shawarmaPlate.svg?url';
import snowLayer from '../assets/effects/snow_layer.svg?url';
import snowflake from '../assets/effects/snowflake.svg?url';
import iceShard from '../assets/effects/ice_shard.svg?url';
import sparkle from '../assets/effects/sparkle.svg?url';
import glow from '../assets/effects/glow.svg?url';
import coin from '../assets/effects/coin.svg?url';
import star from '../assets/effects/star.svg?url';
import starEmpty from '../assets/effects/star_empty.svg?url';
import ring from '../assets/effects/ring.svg?url';
import specialRocket from '../assets/effects/special_rocket.svg?url';
import specialBomb from '../assets/effects/special_bomb.svg?url';
import iconBack from '../assets/ui/icon_back.svg?url';
import iconSoundOn from '../assets/ui/icon_sound_on.svg?url';
import iconSoundOff from '../assets/ui/icon_sound_off.svg?url';
import bgGame from '../assets/backgrounds/game.svg?url';
import logoCoin from '../assets/ui/logo_coin.svg?url';
import lock from '../assets/ui/lock.svg?url';
import check from '../assets/ui/check.svg?url';

export const FOOD_IMAGES = { broast, shawarma, pizza, burger, club, fries };
export const MEAL_IMAGES = { bucket, pizzaBox, burgerMeal, shawarmaPlate };
export const UI_IMAGES = { logoCoin, lock, check, coin, star, starEmpty, iconSoundOn, iconSoundOff };

// [key, url, size(px)] — SVGs are rasterized by Phaser at this size.
export const PHASER_SVGS = [
  ...Object.entries(FOOD_IMAGES).map(([k, u]) => [`food_${k}`, u, 192]),
  ...Object.entries(MEAL_IMAGES).map(([k, u]) => [`meal_${k}`, u, 384]),
  ['snow_layer', snowLayer, 384],
  ['snowflake', snowflake, 64],
  ['ice_shard', iceShard, 64],
  ['sparkle', sparkle, 96],
  ['glow', glow, 128],
  ['coin', coin, 96],
  ['star', star, 160],
  ['star_empty', starEmpty, 160],
  ['ring', ring, 256],
  ['special_rocket', specialRocket, 192],
  ['special_bomb', specialBomb, 192],
  ['icon_back', iconBack, 96],
  ['ui_check', check, 64],
  ['ui_lock', lock, 64],
  ['logo_coin', logoCoin, 128],
  ['icon_sound_on', iconSoundOn, 96],
  ['icon_sound_off', iconSoundOff, 96],
];
export const BG_GAME = bgGame;
