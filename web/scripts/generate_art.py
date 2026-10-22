#!/usr/bin/env python3
"""Generates the FoodCoins vector art (glossy, soft-3D cartoon style) into assets/.
Run: python3 scripts/generate_art.py
"""
import os, math

ROOT = os.path.join(os.path.dirname(__file__), '..', 'assets')

def write(rel, body, w=128, h=128, defs=''):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
           f'<defs>{COMMON_DEFS}{defs}</defs>{body}</svg>')
    with open(path, 'w') as f:
        f.write(svg)

COMMON_DEFS = '''
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="drop" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="2.2" flood-color="#5a2a00" flood-opacity=".35"/></filter>
<radialGradient id="gloss" cx="35%" cy="25%" r="60%"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".45" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
'''

def shadow(cx=64, cy=116, rx=38, ry=7):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#6b3300" opacity=".28" filter="url(#soft)"/>'

def hl(cx, cy, rx, ry, rot=0, op=.9):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="url(#shine)" opacity="{op}" transform="rotate({rot} {cx} {cy})"/>'

# ---------------- foods (128x128) ----------------
BROAST_DEFS = '''
<radialGradient id="brMeat" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#FFD36B"/><stop offset=".45" stop-color="#F0A030"/><stop offset=".85" stop-color="#C46A1C"/><stop offset="1" stop-color="#93460F"/></radialGradient>
<linearGradient id="brBone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E7D3B5"/></linearGradient>
<clipPath id="brClip"><path d="M86 42 C102 58 96 90 74 106 C55 119 26 113 17 92 C9 71 21 50 40 42 C57 35 75 33 86 42Z"/></clipPath>
'''
def broast():
    bumps = ''
    pts = [(34,56,9),(52,48,10),(70,48,9),(28,76,10),(46,66,11),(66,64,10),(82,62,8),(38,94,9),(58,84,11),(76,82,9),(54,102,8),(24,90,6)]
    for x,y,r in pts:
        bumps += f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FFC857" opacity=".55"/><circle cx="{x-2}" cy="{y-3}" r="{r*.45:.1f}" fill="#FFE7A3" opacity=".7"/>'
    crumbs = ''.join(f'<circle cx="{x}" cy="{y}" r="1.8" fill="#9A4A10" opacity=".55"/>' for x,y in [(40,60),(60,56),(30,82),(50,76),(72,72),(44,100),(64,94),(80,70),(56,66)])
    return (shadow(60,114,40,7) +
        '<g filter="url(#drop)">'
        '<path d="M78 50 L100 26" stroke="#E2CBA6" stroke-width="13" stroke-linecap="round"/>'
        '<path d="M78 50 L100 26" stroke="url(#brBone)" stroke-width="10" stroke-linecap="round"/>'
        '<circle cx="98" cy="18" r="9" fill="url(#brBone)" stroke="#D9C09A" stroke-width="2"/>'
        '<circle cx="109" cy="29" r="9" fill="url(#brBone)" stroke="#D9C09A" stroke-width="2"/>'
        '<path d="M86 42 C102 58 96 90 74 106 C55 119 26 113 17 92 C9 71 21 50 40 42 C57 35 75 33 86 42Z" fill="url(#brMeat)" stroke="#8A3F0C" stroke-width="3"/>'
        f'<g clip-path="url(#brClip)">{bumps}{crumbs}</g>'
        '</g>' + hl(42,56,18,9,-30))

SHAWARMA_DEFS = '''
<linearGradient id="shWrap" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E9B36A"/><stop offset=".5" stop-color="#FCDCA0"/><stop offset="1" stop-color="#D2934A"/></linearGradient>
<linearGradient id="shPaper" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E6E1D8"/><stop offset=".45" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D8D1C4"/></linearGradient>
<radialGradient id="shMeat" cx="40%" cy="40%" r="70%"><stop offset="0" stop-color="#C9783A"/><stop offset="1" stop-color="#7A3A12"/></radialGradient>
'''
def shawarma():
    return (shadow(64,116,34,7) +
        '<g filter="url(#drop)" transform="translate(64 62) scale(1.18) rotate(-14) translate(-64 -64)">'
        # fillings on top
        '<ellipse cx="64" cy="30" rx="27" ry="11" fill="#5BA83A"/>'
        '<path d="M38 30 q6 -12 12 -2 q5 -12 12 -1 q6 -12 12 -1 q6 -10 11 2" fill="#7CCB4D" stroke="#3E8A2A" stroke-width="2"/>'
        '<circle cx="50" cy="26" r="7" fill="url(#shMeat)"/><circle cx="64" cy="22" r="8" fill="url(#shMeat)"/><circle cx="78" cy="27" r="7" fill="url(#shMeat)"/>'
        '<circle cx="58" cy="30" r="4" fill="#E53935"/><circle cx="72" cy="31" r="3.5" fill="#E53935"/>'
        '<path d="M60 18 q4 -4 8 0" stroke="#FFF6E0" stroke-width="3" fill="none" stroke-linecap="round"/>'
        # tortilla body
        '<path d="M36 32 C36 70 44 104 64 112 C84 104 92 70 92 32 C82 40 46 40 36 32Z" fill="url(#shWrap)" stroke="#A8662A" stroke-width="3"/>'
        '<path d="M46 52 l8 -4 M58 60 l8 -4 M70 52 l8 -4 M50 74 l8 -4 M66 72 l8 -4" stroke="#B36A25" stroke-width="3" stroke-linecap="round" opacity=".7"/>'
        # paper wrap
        '<path d="M40 70 C46 96 52 108 64 112 C76 108 82 96 88 70 C74 78 54 78 40 70Z" fill="url(#shPaper)" stroke="#B9B0A0" stroke-width="2.5"/>'
        '<path d="M43 80 C56 87 72 87 85 80 L83 87 C71 94 57 94 45 87Z" fill="#E53935"/>'
        '</g>' + hl(52,48,9,20,-14,.7))

PIZZA_DEFS = '''
<linearGradient id="pzCheese" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE27A"/><stop offset=".6" stop-color="#FFC233"/><stop offset="1" stop-color="#F39C12"/></linearGradient>
<linearGradient id="pzCrust" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7C26B"/><stop offset="1" stop-color="#C47629"/></linearGradient>
<radialGradient id="pzPep" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#F0624D"/><stop offset="1" stop-color="#A9230F"/></radialGradient>
'''
def pizza():
    peps = ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#pzPep)" stroke="#8C1C0B" stroke-width="1.5"/><circle cx="{x-r*.3:.1f}" cy="{y-r*.35:.1f}" r="{r*.3:.1f}" fill="#fff" opacity=".35"/>' for x,y,r in [(46,46,8),(78,44,8),(62,66,7.5),(58,90,6)])
    return (shadow(64,116,36,7) +
        '<g filter="url(#drop)">'
        '<path d="M16 34 L112 34 L64 116 Z" fill="url(#pzCheese)" stroke="#D68910" stroke-width="3" stroke-linejoin="round"/>'
        '<path d="M30 40 q2 14 6 6 q3 18 8 4 M86 40 q2 16 6 2" stroke="#FFD24D" stroke-width="5" fill="none" stroke-linecap="round"/>'
        f'{peps}'
        '<path d="M70 78 q6 -6 10 2 q-6 6 -10 -2Z" fill="#3E9B3A"/><path d="M40 60 q6 -5 9 2 q-6 5 -9 -2Z" fill="#3E9B3A"/>'
        '<rect x="10" y="20" width="108" height="20" rx="10" fill="url(#pzCrust)" stroke="#9C5A1E" stroke-width="3"/>'
        '<circle cx="30" cy="27" r="1.6" fill="#8A4A16"/><circle cx="56" cy="25" r="1.6" fill="#8A4A16"/><circle cx="82" cy="28" r="1.6" fill="#8A4A16"/><circle cx="102" cy="25" r="1.6" fill="#8A4A16"/>'
        '</g>' + hl(40,26,22,4,0,.8) + hl(50,52,10,16,-30,.5))

BURGER_DEFS = '''
<linearGradient id="bgBun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC56B"/><stop offset=".7" stop-color="#E58B2C"/><stop offset="1" stop-color="#C46A1C"/></linearGradient>
<linearGradient id="bgPatty" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8B4A22"/><stop offset="1" stop-color="#4E2410"/></linearGradient>
<linearGradient id="bgBot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2A54A"/><stop offset="1" stop-color="#B9611B"/></linearGradient>
'''
def burger():
    seeds = ''.join(f'<ellipse cx="{x}" cy="{y}" rx="3" ry="1.7" fill="#FFF4D6" transform="rotate({r} {x} {y})"/>' for x,y,r in [(44,36,-20),(60,30,10),(76,34,30),(52,46,0),(70,44,-15),(86,46,20),(36,48,-30)])
    return (shadow(64,116,44,7) +
        '<g filter="url(#drop)">'
        '<rect x="16" y="88" width="96" height="20" rx="10" fill="url(#bgBot)" stroke="#9C5214" stroke-width="3"/>'
        '<path d="M14 76 h100 v6 q-50 8 -100 0Z" fill="#E53935" stroke="#A92420" stroke-width="2"/>'
        '<rect x="12" y="66" width="104" height="22" rx="11" fill="url(#bgPatty)" stroke="#3A1A0A" stroke-width="3"/>'
        '<path d="M22 72 h10 M44 78 h12 M70 72 h14 M92 78 h10" stroke="#A86135" stroke-width="2.5" stroke-linecap="round"/>'
        '<path d="M12 62 L116 62 L110 70 L96 70 L90 82 L82 70 L48 70 L40 80 L34 70 L16 70Z" fill="#FFCC2F" stroke="#E0A000" stroke-width="2"/>'
        '<path d="M10 60 q8 -8 16 0 q8 -8 16 0 q8 -8 16 0 q8 -8 16 0 q8 -8 16 0 q8 -8 16 0 q6 -6 12 0 v6 H10Z" fill="#6CC04A" stroke="#3E8A2A" stroke-width="2.5"/>'
        '<path d="M14 58 C14 22 114 22 114 58 Z" fill="url(#bgBun)" stroke="#9C5214" stroke-width="3"/>'
        f'{seeds}'
        '</g>' + hl(48,36,22,8,-12))

CLUB_DEFS = '''
<clipPath id="clClip"><path d="M8 108 L120 108 L64 18 Z"/></clipPath>
<linearGradient id="clToast" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF1CC"/><stop offset="1" stop-color="#F6D48E"/></linearGradient>
'''
def club():
    bands = [(16,20,'url(#clToast)'),(36,7,'#6CC04A'),(43,8,'#F48FB1'),(51,7,'#FFCC2F'),(58,12,'url(#clToast)'),(70,7,'#E53935'),(77,6,'#6CC04A'),(83,8,'#F7A8A0'),(91,20,'url(#clToast)')]
    b = ''.join(f'<rect x="0" y="{y}" width="128" height="{h}" fill="{c}"/>' for y,h,c in bands)
    return (shadow(64,116,44,7) +
        '<g filter="url(#drop)">'
        f'<g clip-path="url(#clClip)">{b}'
        '<path d="M4 39 q6 4 12 0 q6 4 12 0 q6 4 12 0 q6 4 12 0 q6 4 12 0 q6 4 12 0 q6 4 12 0 q6 4 12 0" stroke="#3E8A2A" stroke-width="2.5" fill="none"/>'
        '<path d="M4 80 q6 4 12 0 q6 4 12 0 q6 4 12 0 q6 4 12 0 q6 4 12 0 q6 4 12 0 q6 4 12 0 q6 4 12 0" stroke="#3E8A2A" stroke-width="2.5" fill="none"/>'
        '</g>'
        '<path d="M8 108 L120 108 L64 18 Z" fill="none" stroke="#C98A3C" stroke-width="7" stroke-linejoin="round"/>'
        '<path d="M8 108 L120 108 L64 18 Z" fill="none" stroke="#8F5A1E" stroke-width="2" stroke-linejoin="round"/>'
        '<line x1="64" y1="6" x2="64" y2="60" stroke="#D7B98A" stroke-width="3" stroke-linecap="round"/>'
        '<circle cx="64" cy="9" r="7" fill="#4CAF50" stroke="#2E7D32" stroke-width="2"/><circle cx="62" cy="7" r="2.2" fill="#fff" opacity=".7"/>'
        '</g>' + hl(54,62,6,18,30,.6))

FRIES_DEFS = '''
<linearGradient id="frFry" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F9C846"/><stop offset=".5" stop-color="#FFE48A"/><stop offset="1" stop-color="#E9A21B"/></linearGradient>
<linearGradient id="frBox" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C62828"/><stop offset=".45" stop-color="#F44336"/><stop offset="1" stop-color="#B71C1C"/></linearGradient>
'''
def fries():
    fr = ''
    for x,y,a in [(40,26,-14),(52,16,-6),(64,12,2),(76,16,8),(88,24,15),(46,34,-4),(60,26,-10),(72,28,6),(84,34,-2)]:
        fr += f'<rect x="{x-5}" y="{y}" width="10" height="56" rx="3" fill="url(#frFry)" stroke="#C98612" stroke-width="2" transform="rotate({a} {x} {y+50})"/>'
    return (shadow(64,116,34,7) +
        '<g filter="url(#drop)">' + fr +
        '<path d="M28 60 Q64 72 100 60 L90 112 Q64 118 38 112 Z" fill="url(#frBox)" stroke="#8E1414" stroke-width="3" stroke-linejoin="round"/>'
        '<circle cx="64" cy="88" r="12" fill="#FFCA28" stroke="#E0A000" stroke-width="2.5"/>'
        '<path d="M64 79 l3 6 6 1 -4.5 4 1 6 -5.5 -3 -5.5 3 1 -6 -4.5 -4 6 -1z" fill="#E65100"/>'
        '</g>' + hl(44,80,5,16,-8,.55))

FOODS = {
    'broast': (broast, BROAST_DEFS),
    'shawarma': (shawarma, SHAWARMA_DEFS),
    'pizza': (pizza, PIZZA_DEFS),
    'burger': (burger, BURGER_DEFS),
    'club': (club, CLUB_DEFS),
    'fries': (fries, FRIES_DEFS),
}

for key, (fn, d) in FOODS.items():
    write(f'food/{key}.svg', fn(), defs=d)

# ---------------- meals (256x256) ----------------
def place(fn, x, y, s, rot=0):
    return f'<g transform="translate({x} {y}) rotate({rot}) scale({s}) translate(-64 -64)">{fn()}</g>'

ALL_FOOD_DEFS = ''.join(d for _, d in FOODS.values())

MEAL_DEFS = ALL_FOOD_DEFS + '''
<linearGradient id="bkRed" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#B71C1C"/><stop offset=".5" stop-color="#F44336"/><stop offset="1" stop-color="#B71C1C"/></linearGradient>
<clipPath id="bkClip"><path d="M58 112 L198 112 L180 236 L76 236 Z"/></clipPath>
<radialGradient id="plate" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".8" stop-color="#F1ECE4"/><stop offset="1" stop-color="#D5CCBE"/></radialGradient>
<linearGradient id="cup" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C62828"/><stop offset=".5" stop-color="#EF5350"/><stop offset="1" stop-color="#B71C1C"/></linearGradient>
<radialGradient id="pzWhole" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#FFE27A"/><stop offset=".8" stop-color="#FFC233"/><stop offset="1" stop-color="#F39C12"/></radialGradient>
'''

def bucket():
    stripes = ''.join(f'<rect x="{x}" y="100" width="18" height="140" fill="#FFFFFF"/>' for x in range(66, 200, 36))
    return (f'<ellipse cx="128" cy="240" rx="80" ry="10" fill="#6b3300" opacity=".25" filter="url(#soft)"/>'
        + place(broast, 84, 92, 0.9, -30) + place(broast, 170, 90, 0.9, 40) + place(broast, 128, 76, 1.0, 5)
        + '<g filter="url(#drop)">'
        '<path d="M58 112 L198 112 L180 236 L76 236 Z" fill="url(#bkRed)"/>'
        f'<g clip-path="url(#bkClip)">{stripes}<rect x="40" y="100" width="180" height="140" fill="url(#gloss)" opacity=".35"/></g>'
        '<path d="M58 112 L198 112 L180 236 L76 236 Z" fill="none" stroke="#7F1010" stroke-width="4"/>'
        '<ellipse cx="128" cy="112" rx="72" ry="12" fill="#D32F2F" stroke="#7F1010" stroke-width="4"/>'
        '<circle cx="128" cy="172" r="30" fill="#FFCA28" stroke="#C68A00" stroke-width="4"/>'
        '<text x="128" y="184" font-family="Arial Black,Arial" font-weight="900" font-size="34" text-anchor="middle" fill="#B71C1C">FC</text>'
        '</g>')

def pizzaBox():
    peps = ''.join(f'<circle cx="{128+r*math.cos(a):.1f}" cy="{132+r*0.8*math.sin(a):.1f}" r="11" fill="url(#pzPep)" stroke="#8C1C0B" stroke-width="2"/>' for r,a in [(0,0)]+[(48,i*1.05) for i in range(6)]+[(78,i*0.9+0.4) for i in range(7)])
    return ('<ellipse cx="128" cy="232" rx="104" ry="12" fill="#6b3300" opacity=".25" filter="url(#soft)"/>'
        '<g filter="url(#drop)">'
        '<path d="M20 120 L236 120 L226 222 L30 222 Z" fill="#E8C89A" stroke="#A9814C" stroke-width="4"/>'
        '<ellipse cx="128" cy="140" rx="110" ry="84" fill="url(#pzCrust)" stroke="#9C5A1E" stroke-width="4"/>'
        '<ellipse cx="128" cy="138" rx="96" ry="72" fill="url(#pzWhole)" stroke="#D68910" stroke-width="3"/>'
        f'{peps}'
        '<path d="M128 66 V210 M32 138 H224 M60 88 L196 188 M60 188 L196 88" stroke="#E0A000" stroke-width="3" opacity=".7"/>'
        '</g><ellipse cx="96" cy="100" rx="40" ry="14" fill="url(#shine)" opacity=".6"/>')

def burgerMeal():
    return ('<ellipse cx="128" cy="232" rx="104" ry="12" fill="#6b3300" opacity=".25" filter="url(#soft)"/>'
        '<g filter="url(#drop)">'
        '<path d="M176 70 L230 70 L222 220 L184 220 Z" fill="url(#cup)" stroke="#7F1010" stroke-width="4"/>'
        '<rect x="170" y="58" width="66" height="16" rx="6" fill="#FFFFFF" stroke="#BDBDBD" stroke-width="3"/>'
        '<path d="M210 58 L222 14" stroke="#FFCA28" stroke-width="8" stroke-linecap="round"/>'
        '<circle cx="203" cy="146" r="16" fill="#FFCA28" stroke="#C68A00" stroke-width="3"/></g>'
        + place(fries, 54, 150, 1.0, -8) + place(burger, 120, 164, 1.3, 0))

def shawarmaPlate():
    return ('<ellipse cx="128" cy="236" rx="110" ry="12" fill="#6b3300" opacity=".25" filter="url(#soft)"/>'
        '<g filter="url(#drop)"><ellipse cx="128" cy="180" rx="118" ry="52" fill="url(#plate)" stroke="#BFB5A5" stroke-width="4"/>'
        '<ellipse cx="128" cy="176" rx="92" ry="36" fill="none" stroke="#E0D7C9" stroke-width="3"/>'
        '<ellipse cx="214" cy="168" rx="22" ry="12" fill="#FFFDF4" stroke="#D7CCB8" stroke-width="3"/></g>'
        + place(shawarma, 70, 140, 1.0, -60) + place(shawarma, 128, 132, 1.05, -80) + place(shawarma, 186, 142, 1.0, -100)
        + '<circle cx="60" cy="196" r="9" fill="#7CB342" stroke="#33691E" stroke-width="2"/><circle cx="80" cy="204" r="8" fill="#9CCC65" stroke="#33691E" stroke-width="2"/>')

MEALS = {'bucket': bucket, 'pizzaBox': pizzaBox, 'burgerMeal': burgerMeal, 'shawarmaPlate': shawarmaPlate}
for key, fn in MEALS.items():
    write(f'meals/{key}.svg', fn(), 256, 256, MEAL_DEFS)

# ---------------- snow / ice ----------------
SNOW_DEFS = '''
<linearGradient id="ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#E3F4FF"/><stop offset="1" stop-color="#B7DDF6"/></linearGradient>
'''
flake = lambda x,y,s: (f'<g transform="translate({x} {y}) scale({s})" stroke="#9FD3F2" stroke-width="3" stroke-linecap="round">'
                       + ''.join(f'<line x1="0" y1="0" x2="{10*math.cos(a):.1f}" y2="{10*math.sin(a):.1f}"/>' for a in [i*math.pi/3 for i in range(6)]) + '</g>')
write('effects/snow_layer.svg',
      '<rect x="6" y="6" width="244" height="244" rx="36" fill="url(#ice)" stroke="#9CCDEB" stroke-width="5"/>'
      '<path d="M20 60 Q70 30 128 52 T236 44 L236 20 Q236 10 226 10 L30 10 Q20 10 20 20Z" fill="#fff" opacity=".9"/>'
      '<ellipse cx="80" cy="70" rx="50" ry="14" fill="url(#shine)" opacity=".9" transform="rotate(-12 80 70)"/>'
      + flake(60,150,1.6) + flake(180,110,1.2) + flake(150,200,1.8) + flake(90,215,1) + flake(206,190,1.1),
      256, 256, SNOW_DEFS)
write('effects/snowflake.svg', '<g transform="translate(32 32)" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round">'
      + ''.join(f'<line x1="0" y1="0" x2="{24*math.cos(a):.1f}" y2="{24*math.sin(a):.1f}"/><line x1="{14*math.cos(a):.1f}" y1="{14*math.sin(a):.1f}" x2="{14*math.cos(a)+7*math.cos(a+0.8):.1f}" y2="{14*math.sin(a)+7*math.sin(a+0.8):.1f}"/>' for a in [i*math.pi/3 for i in range(6)])
      + '</g>', 64, 64)
write('effects/ice_shard.svg', '<path d="M8 30 L22 4 L40 14 L34 38 Z" fill="url(#ice)" stroke="#8CC4E6" stroke-width="2"/>', 48, 48, SNOW_DEFS)

# ---------------- effects ----------------
write('effects/sparkle.svg', '<path d="M32 2 C35 22 42 29 62 32 C42 35 35 42 32 62 C29 42 22 35 2 32 C22 29 29 22 32 2Z" fill="#FFF7C2"/><circle cx="32" cy="32" r="6" fill="#fff"/>', 64, 64)
write('effects/glow.svg', '<radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".4" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><circle cx="32" cy="32" r="32" fill="url(#g)"/>', 64, 64)
COIN_DEFS = '<radialGradient id="coin" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#FFF3B0"/><stop offset=".5" stop-color="#FFC928"/><stop offset="1" stop-color="#D48A00"/></radialGradient>'
coin_body = ('<circle cx="32" cy="34" r="28" fill="#A86A00"/><circle cx="32" cy="31" r="28" fill="url(#coin)" stroke="#B87800" stroke-width="2.5"/>'
             '<circle cx="32" cy="31" r="20" fill="none" stroke="#E0A100" stroke-width="2.5"/>'
             '<path d="M25 19 v10 q0 4 3 5 v15 M22 19 v8 M28 19 v8" stroke="#A86A00" stroke-width="3" stroke-linecap="round" fill="none"/>'
             '<path d="M40 19 q6 6 0 15 v15" stroke="#A86A00" stroke-width="3" stroke-linecap="round" fill="none"/>'
             '<ellipse cx="22" cy="20" rx="9" ry="5" fill="#fff" opacity=".6" transform="rotate(-30 22 20)"/>')
write('effects/coin.svg', coin_body, 64, 64, COIN_DEFS)
STAR_DEFS = '<linearGradient id="st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF176"/><stop offset=".55" stop-color="#FFC107"/><stop offset="1" stop-color="#FF8F00"/></linearGradient>'
star_path = 'M64 6 L80 44 L121 47 L89 73 L99 114 L64 92 L29 114 L39 73 L7 47 L48 44 Z'
write('effects/star.svg', f'<path d="{star_path}" fill="url(#st)" stroke="#E65100" stroke-width="5" stroke-linejoin="round"/><path d="M64 18 L75 46 L44 48 Z" fill="#fff" opacity=".5"/>', 128, 128, STAR_DEFS)
write('effects/star_empty.svg', f'<path d="{star_path}" fill="#D7C3A6" stroke="#A88C66" stroke-width="5" stroke-linejoin="round" opacity=".9"/>', 128, 128)
write('effects/ring.svg', '<circle cx="64" cy="64" r="56" fill="none" stroke="#fff" stroke-width="10"/>', 128, 128)

# specials overlays
write('effects/special_rocket.svg',
      '<linearGradient id="rk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FF5722" stop-opacity="0"/><stop offset=".25" stop-color="#FFEB3B"/><stop offset=".75" stop-color="#FFEB3B"/><stop offset="1" stop-color="#FF5722" stop-opacity="0"/></linearGradient>'
      '<rect x="0" y="54" width="128" height="20" rx="10" fill="url(#rk)" opacity=".85"/>'
      '<path d="M4 64 L22 48 L22 80 Z M124 64 L106 48 L106 80 Z" fill="#FFFFFF" stroke="#FF6D00" stroke-width="4" stroke-linejoin="round"/>', 128, 128)
write('effects/special_bomb.svg',
      '<circle cx="96" cy="98" r="20" fill="#37474F" stroke="#102027" stroke-width="3"/><circle cx="90" cy="92" r="6" fill="#fff" opacity=".5"/>'
      '<path d="M106 80 q8 -10 14 -6" stroke="#8D6E63" stroke-width="4" fill="none" stroke-linecap="round"/>'
      '<path d="M120 66 l3 6 6 3 -6 3 -3 6 -3 -6 -6 -3 6 -3z" fill="#FFEB3B" stroke="#FF6D00" stroke-width="2"/>', 128, 128)

# ---------------- ui ----------------
write('ui/logo_coin.svg', coin_body, 64, 64, COIN_DEFS)
write('ui/lock.svg', '<rect x="14" y="28" width="36" height="28" rx="7" fill="#8D6E63" stroke="#4E342E" stroke-width="3"/><path d="M22 28 v-7 a10 10 0 0 1 20 0 v7" fill="none" stroke="#4E342E" stroke-width="5"/><circle cx="32" cy="41" r="4" fill="#3E2723"/><rect x="30.5" y="42" width="3" height="8" fill="#3E2723"/>', 64, 64)
write('ui/check.svg', '<circle cx="32" cy="32" r="28" fill="#43A047" stroke="#1B5E20" stroke-width="3"/><path d="M18 33 l9 9 l19 -20" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>', 64, 64)
ICON = 'fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"'
write('ui/icon_back.svg', f'<path d="M24 14 L42 32 L24 50" {ICON}/>', 64, 64)
write('ui/icon_sound_on.svg', '<path d="M12 24 h10 l14 -12 v40 l-14 -12 h-10z" fill="#fff"/>' + f'<path d="M44 22 q8 10 0 20 M50 14 q16 18 0 36" {ICON.replace("6","5")}/>', 64, 64)
write('ui/icon_sound_off.svg', '<path d="M12 24 h10 l14 -12 v40 l-14 -12 h-10z" fill="#fff"/>' + f'<path d="M44 24 l14 16 M58 24 l-14 16" {ICON.replace("6","5")}/>', 64, 64)
write('ui/icon_music.svg', '<path d="M24 46 V16 L50 10 V40" fill="none" stroke="#fff" stroke-width="5"/><circle cx="19" cy="46" r="7" fill="#fff"/><circle cx="45" cy="40" r="7" fill="#fff"/>', 64, 64)

# ---------------- backgrounds ----------------
dots = ''.join(f'<circle cx="{(i*137)%720}" cy="{(i*251)%1280}" r="{18 + (i*7)%40}" fill="#FFB74D" opacity="{0.08 + (i%4)*0.03:.2f}"/>' for i in range(40))
write('backgrounds/game.svg',
      '<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4E0"/><stop offset=".55" stop-color="#FFE0B2"/><stop offset="1" stop-color="#FFB870"/></linearGradient>'
      '<radialGradient id="sun" cx="50%" cy="0%" r="70%"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".9"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>'
      f'<rect width="720" height="1280" fill="url(#bg)"/><rect width="720" height="900" fill="url(#sun)"/>{dots}', 720, 1280)
print('art generated')
