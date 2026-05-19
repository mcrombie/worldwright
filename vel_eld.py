#!/usr/bin/env python3
"""
THE VEL-ELD
A text adventure set in Northern Azhora.

Run:  python3 vel_eld.py
      python  vel_eld.py   (Windows)

Type HELP for commands.
"""

import textwrap
import sys
import os

# ─────────────────────────────────────────────────────────────────────────────
#  DISPLAY
# ─────────────────────────────────────────────────────────────────────────────

W = 76

def pr(text, gap=True):
    """Print word-wrapped text, preserving paragraph breaks."""
    text = text.strip()
    for i, para in enumerate(text.split('\n\n')):
        block = ' '.join(l.strip() for l in para.splitlines() if l.strip())
        if block:
            print(textwrap.fill(block, W))
        elif i > 0:
            print()
    if gap:
        print()

def hr():
    print('-' * W)

def section(name):
    print()
    hr()
    print(f'  {name}')
    hr()
    print()

def italic_note(text):
    """Print a short italicised-style note in brackets."""
    pr(f'[{text}]')


# ─────────────────────────────────────────────────────────────────────────────
#  GAME STATE
# ─────────────────────────────────────────────────────────────────────────────

state = {
    # player
    'location': 'stroven_market',
    'inventory': ['academy_papers', 'coin_purse'],
    'coins': 10,
    'signs': set(),          # 'gold', 'barrow', 'smoke'
    'game_over': False,
    # flags
    'eldra_trusts': False,
    'scroll_given': False,
    'shepherd_told_smoke': False,
    'entered_stonefist': False,
    'used_pan': False,
    'visited_barrow': False,
    'barrow_dark': False,    # strange thing seen at barrow
    'saw_smoke': False,
    'lond_farmer_met': False,
    'orgmala_interest': False,  # orgmala trader examined ore shard
}

# ─────────────────────────────────────────────────────────────────────────────
#  ITEMS
# ─────────────────────────────────────────────────────────────────────────────

ITEMS = {
    'academy_papers': {
        'name': 'Academy Papers',
        'desc': 'A sealed document roll bearing the Caeras Valley Academy seal.',
        'examine': (
            'The papers confirm your commission: an Academy scholar investigating '
            'reports of unusual activity in the Endevor mining country. The seal '
            'is current and the wording is formal. They should open doors, or at '
            'least slow the closing of them.'
        ),
    },
    'coin_purse': {
        'name': 'Coin Purse',
        'desc': 'A worn leather purse. Currently holds your travelling coin.',
        'examine': None,  # shows coins dynamically
    },
    'compass': {
        'name': 'Brass Compass',
        'desc': 'A reliable southern-made compass in a brass case.',
        'examine': (
            'The needle points consistently north. In the Acorwood, they say, '
            'it is the only reference that holds. You bought it at the Stroven '
            'inn on the advice of the shepherd, who said it plainly: without '
            'one, you will turn.'
        ),
        'price': 3,
        'sold_at': 'stroven_inn',
    },
    'lantern': {
        'name': 'Oil Lantern',
        'desc': 'A small tin lantern, full of oil.',
        'examine': (
            'Serviceable and full. The shaft-mouths of the Eld-Valleys are '
            'described as dark even in daylight. This will help.'
        ),
        'price': 2,
        'sold_at': 'stroven_inn',
    },
    'gold_pan': {
        'name': "Miner's Pan",
        'desc': 'A flat iron panning dish, worn smooth by long use.',
        'examine': (
            'The kind of pan that the Endevor communities used in the early '
            'days of the mine-king period, when stream-panning alone produced '
            'meaningful yield. Those concentrations are gone. What remains is '
            'memory rather than resource -- or so the Academy believes.'
        ),
        'price': 2,
        'sold_at': 'ondrath',
    },
    'scroll_fragment': {
        'name': 'Vornheld Scroll Fragment',
        'desc': 'A strip of vellum covered in archaic Northern Mittoli script.',
        'examine': (
            'The handwriting is the kind that comes from long practice with '
            'a tradition rather than from schooling. The text is a fragment '
            'of the Vel-Eld -- the renewal poem of the Endevor tradition -- in '
            'archaic Northern Mittoli. Eldra wrote it for you herself, saying '
            'only: "Take it to the valley floor. Say nothing. Wait."'
        ),
    },
    'ore_shard': {
        'name': 'Dark Ore Shard',
        'desc': 'A dense, dark fragment of rock with a faint metallic sheen.',
        'examine': (
            'Heavier than its size suggests. The metallic surfaces catch '
            'light at angles that plain stone does not. You found it at the '
            'edge of a collapsed shaft-mouth in the Eld-Valleys, where it had '
            'been washed partially clear by the stream. It matches nothing '
            'in your Academy mineralogy notes exactly.'
        ),
    },
    'heather_sprig': {
        'name': 'Dried Heather Sprig',
        'desc': 'A small sprig of Endevor heather, dried and still faintly purple.',
        'examine': (
            'Picked from the ground near the unmarked mound in the valley '
            'floor. Small thing to carry away from a king\'s grave. You are '
            'not sure why you took it.'
        ),
    },
    'northern_map': {
        'name': 'Northern Routes Map',
        'desc': 'A detailed hand-drawn map of Northern Azhora\'s overland routes.',
        'examine': (
            'The garrison captain gave it to you without ceremony: "The '
            'Academy should have an accurate one." It shows Stonefist at the '
            'centre, with routes radiating to the Bay of Lol, the Sond, the '
            'Acorwood approach, the Gorgi passes, and the northeastern coast. '
            'Endevor is marked in a hand you do not recognise, with a notation '
            'in archaic Northern Mittoli that reads: vel-eld nil-toss -- '
            '"the return that does not yet crest."'
        ),
    },
    'field_notes': {
        'name': 'Field Notes',
        'desc': 'Your Academy field notes. Records what you have observed.',
        'examine': None,  # shown dynamically
    },
}

# Items available in the world (location -> list of item ids)
WORLD_ITEMS = {
    'sheepwalk': ['heather_sprig'],   # placeholder, actually at barrow
    'barrow_site': ['heather_sprig'],
    'eld_valleys': ['ore_shard'],
    'stonefist': ['northern_map'],
}

# Items for sale: id -> location
SHOP_ITEMS = {
    'compass': 'stroven_inn',
    'lantern': 'stroven_inn',
    'gold_pan': 'ondrath',
}

# ─────────────────────────────────────────────────────────────────────────────
#  NPCS
# ─────────────────────────────────────────────────────────────────────────────

def eldra_response(topic):
    t = topic.lower()
    # Trust gate
    not_yet = (
        'Eldra looks at you steadily. "You carry the Academy seal. Tell me '
        'what the Academy sent you to find, and I will tell you what I know." '
        'She waits. (Try: SHOW ACADEMY PAPERS TO ELDRA)'
    )
    if not state['eldra_trusts'] and t not in ('herself', 'you', 'who', 'stroven'):
        return not_yet

    topics = {
        'herself':
            'Eldra Vornheld. She is in Stroven for a land-rights hearing -- a '
            'valley boundary dispute that the record-keepers have referred to '
            'ancestry, which means a Vornheld must be present. She speaks '
            'briefly and expects to be heard.',
        'you':
            'Eldra Vornheld. She is in Stroven for a land-rights hearing -- a '
            'valley boundary dispute that the record-keepers have referred to '
            'ancestry, which means a Vornheld must be present.',
        'who':
            '"I am Vornheld. My name is Eldra. That is enough for Stroven, '
            'and probably enough for the Academy."',
        'stroven':
            '"I am here for a hearing. The valley boundary between the Keld '
            'and Orrven lineage communities has been disputed for four '
            'generations. I know what the tradition says. We will settle it '
            'at the stone-shelter tomorrow."',
        'vel-eld':
            '"The Vel-Eld is the third body of the epic tradition -- the '
            'renewal poem. Its subject is the restoration of the Endevor realm '
            'and the reopening of the mines. I recite it twice a year at '
            'Veld\'s barrow. If you want to understand it, you will need to '
            'hear it where it is recited, not explained where it is not." '
            'She pauses. "The next recitation is at the equinox."',
        'signs':
            '"Three signs precede the Vel-Endre. The streams find what they '
            'left behind. The barrows wake before they are opened. The wood '
            'speaks what it knows. The tradition does not say when. It says '
            'what." She looks at you with the specific attention of someone '
            'who has already assessed your intentions. "Are you here to '
            'document the signs, or to understand them?"'
            + ('\n\n[You have found: ' + (', '.join(state['signs']) or 'none') + ']'
               if state['eldra_trusts'] else ''),
        'gold':
            '"The streams carry traces. They have since the veins were '
            'broken open -- the gold disperses slowly. What the first sign '
            'means is not that traces appear. It means the traces return '
            'to something visible in the pan. The Eld-Valleys stream is '
            'where you would look. The Vornheld who hold the Deepworks '
            'lineage have been watching that stream for eight generations."',
        'barrows':
            '"The second sign: vel-milloss nil-vel-gall. They have been seen '
            'before the crossing. Someone will witness something at a barrow '
            'before any physical disturbance. Veld\'s barrow is in the valley '
            'floor -- lowest of any king. He asked for that placement. No one '
            'has agreed on why." '
            + ('\n\n"If you go to the valley floor at dusk, take this." '
               'She offers a strip of vellum. (Try: TAKE SCROLL FRAGMENT)'
               if state['eldra_trusts'] and not state['scroll_given'] else ''),
        'scroll':
            '"The fragment is from the Vel-Eld. Say nothing when you use it. '
            'Just wait. The tradition does not require your commentary."'
            if state['scroll_given'] else
            '"Ask me about the barrows if you want the fragment."',
        'deepworks':
            '"Three mine-workings sealed by Veld\'s order after the workers '
            'stopped returning. He marked them nil-vel-keth -- no return-speech. '
            'The formulation implies something was there to not-answer. '
            'The location of the Deepworks in the transition zone between '
            'Endevor and the Acorwood is not something I will put in an '
            'Academy report. Ask me about the smoke instead."',
        'smoke':
            '"The third sign. The Acorwood occasionally exhales smoke from '
            'its interior. The Endevor shepherds have watched the western '
            'face long enough to name what it does. The breathing-down smoke '
            '-- the kind that dissipates downward -- is most frequently seen '
            'above the Deepworks area. Go to the Sheepwalk and ask the '
            'shepherd. He will tell you more than I should."',
        'acorwood':
            '"The Acorwood is dark in summer and navigable in spring before '
            'the leaf-out. You do not want to enter it in summer without a '
            'compass and the habit of reading drainage. You probably want '
            'to approach the edge. That is enough to see what there is to see."',
        'vornheld':
            '"The Vornheld are the ancestor-holders -- those who hold the '
            'old ones. We carry the epic tradition in reproducible form '
            'and hold the lineage records as evidence in disputes. We are '
            'not a priesthood. We are a memory."',
        'endevor':
            '"Endevor was rich before it was pastoral. The mine-kings '
            'ruled from here for two hundred and fifty years at the peak. '
            'The ridgelines are their graves. The shaft-heads are their '
            'legacy. We have not forgotten. The outside world has forgotten '
            'for us, which is its own kind of confirmation."',
        'lond':
            '"Stonefist is the strategic centre. Whoever holds it holds the '
            'north\'s breadbasket and its route-connections. The Nonoth '
            'recognize its holder as their lord. The Lond communities '
            'accommodate whoever is in it. There is a difference."',
    }
    return topics.get(t,
        f'Eldra considers. "That is not something I have a prepared answer for. '
        f'Ask me about the vel-eld, the signs, the gold, the barrows, the smoke, '
        f'the deepworks, the acorwood, or the vornheld."'
    )


def shepherd_response(topic):
    t = topic.lower()
    topics = {
        'smoke':
            '"The Acorwood breathes. We watch it from up here -- have done '
            'since before my grandfather\'s time. Three kinds. The straight '
            'thin rising smoke: means a dry-spell coming. The spreading '
            'smoke that moves with the wind before it goes: weather change. '
            'And the breathing-down." He pauses, looking east at the dark '
            'tree-line. "The kind that dissipates downward instead of up. '
            'We call it the forest taking something in. Happens most over '
            'the eastern valley area -- where the old shafts go deep. '
            'I have watched it my whole life and I cannot tell you what it is."'
            + '\n\n[You have learned about the breathing-down smoke.]',
        'acorwood':
            '"Dark in summer. The light goes flat inside -- no shadows point '
            'anywhere. You turn without noticing. Always take a compass east '
            'of the sheepwalk."',
        'compass':
            '"Essential if you go anywhere near the margin. The direction '
            'nullification -- that is what the Academy woman called it, two '
            'generations ago. The light scatters through the canopy until '
            'it arrives from all sides at once. You cannot navigate by sun. '
            'Only by compass and by the streams, which still drain east."',
        'fell-sheep':
            '"They come down before weather. Not sometimes -- always. If they '
            'are moving off the high pasture in the morning, make your '
            'arrangements. They know something we do not know how to read."',
        'gold':
            '"The streams carry traces. I have panned the eastern stream '
            'since I was a boy. Thin gold, barely colour in the pan. '
            'Nothing to work with. Though last spring--" He stops. '
            '"Last spring there was more. Not much more. But more."',
        'barrows':
            '"The ridgeline ones are the oldest. They are the dead kings -- '
            'you do not disturb them. The valley floor one is Veld\'s. '
            'Unmarked. The Vornheld know where it is. Ask Eldra if '
            'she is in Stroven -- she usually is for the autumn hearing."',
        'endevor':
            '"Good sheep country. Cold enough to keep the wool thick. '
            'The fell-sheep do not mind the rain, which is good because '
            'there is a great deal of it." He means this as a complete '
            'description of the place.',
    }
    if t == 'smoke':
        state['shepherd_told_smoke'] = True
    return topics.get(t,
        '"I know the hills and the sheep and the smoke. Ask me about '
        'those things."'
    )


def innkeeper_response(topic):
    t = topic.lower()
    topics = {
        'stroven':
            '"Good market town. Three valleys converge here. What you need, '
            'someone usually has. The record-keepers are in the north '
            'building -- Stroven family, been here forever. Strong opinions '
            'about disputes from four generations back. Do not ask unless '
            'you want the full account."',
        'vornheld':
            '"Eldra is in for the boundary hearing. She stays here -- '
            'has done every autumn for twelve years. You will find her '
            'in the market square most mornings."',
        'shop':
            '"Compass, three coins. Lantern, two coins. Both good quality. '
            'Northern winter requires both, in my experience of people '
            'who should have bought them and did not."',
        'road':
            '"East road goes to Lond -- two days at a good pace. The plateau '
            'opens up after the ridge. Stonefist is visible from a long way '
            'off. Beyond Lond, the Sond road runs southeast to Ondrath '
            'in Ganun. Three days from Lond, four if the road is wet."',
        'mines':
            '"The shaft-heads are in the Eld-Valleys, east of the upper '
            'sheepwalk. Some of them are not safe -- the ground subsides. '
            'If you are going up there, take a lantern and watch where '
            'you step."',
    }
    return topics.get(t,
        '"The inn is well-stocked and the fire is reliable. Ask me about '
        'Stroven, the Vornheld, the road, the mines, or the shop."'
    )


def sond_trader_response(topic):
    t = topic.lower()
    topics = {
        'ondrath':
            '"Largest market in the north by trade volume. Bay of Lol '
            'merchants, Orched Hills iron sellers, Ganoss wool traders, '
            'and occasionally people from further south who want to say '
            'they came this far. The Sond runs southeast from here -- '
            'eight days to where it joins the Mittoli network."',
        'sond':
            '"The most active trade route in the north. Heavy cargo goes '
            'on the river -- grain from Lond, wool from Endevor, iron '
            'coming back up. Three sections: the upper reach is easy in '
            'spring, the middle has rapids, the lower section is the '
            'Orched Hills\' river more than ours."',
        'shop':
            '"Panning dish, two coins. Good iron, old make. I bought '
            'a lot of them from a family clearing out mine equipment '
            'in the Eld-Valleys two seasons back."',
        'lond':
            '"Stonefist is the centre. Whoever\'s in it this season is '
            'doing moderately well -- the Lond communities are not '
            'obviously unhappy, which is how you measure these things."',
        'endevor':
            '"Good wool, waterproof when spun right. The fell-sheep '
            'breed is specific to those hills. Try to buy the spun '
            'goods rather than raw fleece if you want it processed '
            'correctly -- the preparation matters."',
        'orgmala':
            'He glances toward the corner of the market. "That one? '
            'Trades wool and dried meat. Does not say where from. '
            'I do not ask."',
    }
    return topics.get(t,
        '"I trade on the Sond and supply the Ondrath market. '
        'Ask me about Ondrath, the Sond, Lond, Endevor, the shop, '
        'or the other traders."'
    )


def orgmala_response(topic):
    t = topic.lower()
    # If player has ore shard, orgmala trader reacts
    has_ore = 'ore_shard' in state['inventory']
    base = {
        'wool':
            'He holds up a bundle of dark, dense wool. He does not name a price. '
            'He waits.',
        'trade':
            '"I have wool. Dried meat. What do you want?"',
        'orgmala':
            'He looks at you without expression for a moment. '
            '"You are from the south." It is not a question.',
        'valleys':
            'A pause that goes on long enough to become an answer of its own.',
        'where':
            '"North." Nothing more.',
        'mines':
            'He says nothing. He looks at the ore shard in your pack '
            'if you have it, and then at you.'
            if has_ore else
            '"I do not know your mines."',
    }
    if has_ore and t in ('ore', 'shard', 'rock', 'stone', 'mines', 'endevor'):
        state['orgmala_interest'] = True
        return (
            'He looks at the dark ore shard in your possession. His expression '
            'does not change, but his attention does -- it sharpens in a way '
            'that makes you aware of how far you are from Stroven. He says '
            'nothing. After a moment he looks back at his goods as if '
            'the exchange did not happen.'
        )
    return base.get(t,
        'He regards you with the attention of someone assessing rather than '
        'conversing. "Ask me about wool or trade."'
    )


def gate_guard_response(topic):
    t = topic.lower()
    has_papers = 'academy_papers' in state['inventory']
    if t in ('entry', 'enter', 'in', 'inside', 'stonefist', 'pass'):
        if has_papers:
            state['entered_stonefist'] = True
            return (
                'The guard examines your Academy papers at length, returns them, '
                'and steps aside. "The captain will see you. Stay on the '
                'lower ledges unless you are invited higher." '
                '\n\n[You may now GO NORTH to enter Stonefist.]'
            )
        return (
            '"Who are you and what is your business?" He does not move. '
            'You would need to establish your credentials before he would '
            'consider it. (Try: SHOW ACADEMY PAPERS TO GUARD)'
        )
    return (
        '"State your business." He is looking at your papers, or the '
        'absence of them. (Try: SHOW ACADEMY PAPERS TO GUARD, or '
        'ASK GUARD ABOUT ENTRY)'
    )


def captain_response(topic):
    t = topic.lower()
    topics = {
        'stonefist':
            '"The formation is natural -- igneous intrusion that the erosion '
            'left standing. The people who first improved it knew what they '
            'had. We have not changed the fundamental structure. We maintain '
            'it." He says this with the satisfaction of a man who has '
            'chosen his occupation correctly.',
        'lond':
            '"The grain comes in reliably. The Lond communities are '
            'practical people. They have made their peace with the fact '
            'that Stonefist\'s garrison changes and the grain still needs '
            'to grow. The arrangement works."',
        'nonoth':
            '"The Nonoth have recognized us. They were the first, as they '
            'usually are. Good people. They understand what Stonefist is '
            'for in a way that the coastal powers still sometimes do not."',
        'endevor':
            '"The wool is good. The Vornheld are strange -- in the way '
            'that people who are very serious about something you cannot '
            'quite understand are strange. They keep records in their heads '
            'that go back further than the Stroven archive. Useful at '
            'land hearings."',
        'orgmala':
            '"We watch the passes. They raid the Ganun margins occasionally. '
            'They have not moved on Lond in any organised way in three '
            'generations, which suggests either satisfaction or patience. '
            'I have not decided which."',
        'map':
            'He produces a rolled map and places it on the ledge. '
            '"Take it. The Academy should have an accurate one." '
            '\n\n[The northern routes map is now available. TAKE MAP]',
    }
    return topics.get(t,
        '"Ask me about Stonefist, Lond, Nonoth, Endevor, Orgmala, or the map."'
    )


def lond_farmer_response(topic):
    t = topic.lower()
    state['lond_farmer_met'] = True
    topics = {
        'lond':
            '"Two more days east. The plateau opens up after the ridge -- '
            'you will know it when you see it. Dark soil, flat, Stonefist '
            'visible from about half a day out."',
        'stonefist':
            '"The rock that looks like a fist. You cannot miss it. '
            'Whether they let you in depends on who you are and '
            'what you are carrying."',
        'endevor':
            '"Good wool country. Cold and hilly. The mine-mounds on '
            'the ridgelines are the dead kings from before -- '
            'I do not know much about them beyond that."',
        'harvest':
            '"Fair year. The rye came in dry, which is better than '
            'last season. The Stonefist garrison took their portion '
            'in good faith this time, which is all you can ask."',
    }
    return topics.get(t,
        '"I am heading back to Lond from the market. Ask me about '
        'the road, Lond, Stonefist, or the harvest."'
    )


NPCS = {
    'eldra': {
        'name': 'Eldra',
        'title': 'Eldra Vornheld',
        'location': 'stroven_market',
        'desc': (
            'A Vornheld practitioner -- one of the ancestor-holders who carry '
            'the Endevor epic tradition. She is older than she looks on first '
            'encounter, and she looks at you with the assessment of someone '
            'who has spent decades deciding how much to say to outsiders.'
        ),
        'talk': (
            'Eldra Vornheld regards you with calm attention. '
            '"You are from the Academy. I can tell by the papers '
            'and the way you look at the barrow-mounds as if they are '
            'a category rather than a place. What do you want to know?"'
        ),
        'fn': eldra_response,
        'topics': ['vel-eld', 'signs', 'gold', 'barrows', 'smoke', 'deepworks',
                   'acorwood', 'vornheld', 'endevor', 'lond', 'scroll'],
    },
    'shepherd': {
        'name': 'Bram',
        'title': 'Bram the shepherd',
        'location': 'sheepwalk',
        'desc': (
            'A fell-sheep shepherd on the high pasture, keeping half an eye '
            'on the flock and half on the dark tree-line to the east. '
            'He acknowledges you with the nod of someone who has decided '
            'you are not a threat but may be a nuisance.'
        ),
        'talk': (
            '"Morning. You are from the south." He watches a ewe work '
            'its way along the ridge. "The smoke came down this morning. '
            'Early in the season for it."'
        ),
        'fn': shepherd_response,
        'topics': ['smoke', 'acorwood', 'compass', 'fell-sheep', 'gold', 'barrows', 'endevor'],
    },
    'innkeeper': {
        'name': 'Innkeeper',
        'title': 'the innkeeper',
        'location': 'stroven_inn',
        'desc': 'The inn\'s keeper: efficient, informative, and clearly accustomed to travelers with questions.',
        'talk': '"Welcome. Fire is on. I have compass and lantern for sale -- three and two coins. What else do you need?"',
        'fn': innkeeper_response,
        'topics': ['stroven', 'vornheld', 'shop', 'road', 'mines'],
    },
    'sond_trader': {
        'name': 'Garvel',
        'title': 'Garvel the Sond trader',
        'location': 'ondrath',
        'desc': 'A broad-shouldered trader with the specific ease of someone who has spent years on the river.',
        'talk': '"Ondrath market. What do you need? I have panning dishes from an Endevor estate, two coins each."',
        'fn': sond_trader_response,
        'topics': ['ondrath', 'sond', 'shop', 'lond', 'endevor', 'orgmala'],
    },
    'orgmala_trader': {
        'name': 'the highland trader',
        'title': 'a highland trader',
        'location': 'ondrath',
        'desc': (
            'A lean man at the market\'s edge, beside a pile of dark dense '
            'wool and parcels of dried meat. He is watching the market with '
            'the relaxed attention of someone who sees everything and has '
            'decided already whether it matters.'
        ),
        'talk': (
            'He looks at you. Says nothing for a moment. '
            '"I have wool and meat. Good quality. You want to buy or '
            'you want to talk?"'
        ),
        'fn': orgmala_response,
        'topics': ['wool', 'trade', 'orgmala', 'valleys', 'where', 'mines'],
    },
    'gate_guard': {
        'name': 'Guard',
        'title': 'the Stonefist gate guard',
        'location': 'stonefist_approach',
        'desc': 'A guard in serviceable northern kit, positioned at the base of the terraced approach.',
        'talk': '"State your business at Stonefist."',
        'fn': gate_guard_response,
        'topics': ['entry', 'stonefist', 'pass'],
    },
    'captain': {
        'name': 'Captain',
        'title': 'the garrison captain',
        'location': 'stonefist',
        'desc': 'The garrison captain. Laconic, thorough, comfortable in the fortress he maintains.',
        'talk': '"Academy scholar. The guard said. What brings you to Stonefist?"',
        'fn': captain_response,
        'topics': ['stonefist', 'lond', 'nonoth', 'endevor', 'orgmala', 'map'],
    },
    'lond_farmer': {
        'name': 'Farmer',
        'title': 'a Lond farmer',
        'location': 'valley_road',
        'desc': 'A Lond farmer heading home from the Stroven market, carrying a bolt of Endevor wool.',
        'talk': '"Cold enough for the season. You are heading east? Two more days to Lond."',
        'fn': lond_farmer_response,
        'topics': ['lond', 'stonefist', 'endevor', 'harvest'],
    },
}

# ─────────────────────────────────────────────────────────────────────────────
#  LOCATIONS
# ─────────────────────────────────────────────────────────────────────────────

def desc_stroven_market():
    return (
        'The market square of Stroven sits at the convergence of three valley '
        'routes, and it looks like it. Traders\' stalls line two sides; the '
        'Stroven record-keeper\'s archive occupies a stone building on the '
        'third. The fourth is open to the north road and the inn. '
        'Fell-sheep wool hangs in bundles. A few travelers move between '
        'the stalls with the efficiency of people who know what they came for.'
        + ('\n\nEldra Vornheld is here, watching the market from near the archive building.'
           if not state.get('scroll_given') else
           '\n\nEldra Vornheld stands near the archive, having finished the morning\'s '
           'hearing. She looks satisfied in the way of someone who has proved a point '
           'they already knew they would prove.')
    )

def desc_stroven_inn():
    items_here = [ITEMS[i]['name'] for i in ['compass', 'lantern']
                  if i not in state['inventory'] and i in SHOP_ITEMS]
    shop_note = ''
    if items_here:
        prices = {'Brass Compass': '3 coins', 'Oil Lantern': '2 coins'}
        price_hints = '; '.join(f'BUY {n.split()[-1].upper()} -- {prices[n]}' for n in items_here if n in prices)
        shop_note = f'\n\nFor sale: {", ".join(items_here)}. ({price_hints})'
    return (
        'The Stroven inn is built for function rather than comfort, which means '
        'it achieves both. A covered market structure with a fire at one end, '
        'sleeping rooms above, and the particular smell of northern wool and '
        'damp wood that you associate with every inn north of the Orched Hills. '
        'The innkeeper is behind the counter, which in Stroven means she knows '
        'everything worth knowing about the current season\'s business.'
        + shop_note
    )

def desc_upper_valley():
    return (
        'The upper valley road runs west from Stroven\'s market, following the '
        'stream bed between lower farmland and the rising heath above. The '
        'valley sides are visible on both edges -- not steep enough to be '
        'dramatic, steep enough to make the sky feel close. The road here '
        'is well-maintained; carts use it for the sheepwalk access in summer.'
        '\n\nTo the north, the path climbs to the high sheepwalk. To the west, '
        'the valley floor descends toward a lower valley.'
    )

def desc_sheepwalk():
    smoke_note = ''
    if state.get('saw_smoke') or True:  # smoke is always potentially visible
        smoke_note = (
            '\n\nThe Acorwood is visible from here as a dark line -- darker '
            'than the surrounding hill forest -- along the eastern horizon. '
            'A thin thread of smoke rises from somewhere in the forest\'s '
            'interior, and as you watch it, it does not rise. It descends. '
            'It dissipates downward into the canopy rather than upward into '
            'the air. The shepherd here calls it the breathing-down.'
        )
        state['saw_smoke'] = True
    return (
        'The high sheepwalk opens above the valley -- wide, wind-exposed, '
        'and covered in the close-cropped grass that fell-sheep prefer. '
        'A flock of compact, deeply shaggy animals moves along the ridge '
        'above you with the unhurried certainty of creatures that own '
        'this ground. Bram the shepherd is somewhere on the upper pasture, '
        'watching both the flock and the eastern tree-line.'
        + smoke_note
    )

def desc_acorwood_edge():
    has_compass = 'compass' in state['inventory']
    compass_note = ''
    if has_compass:
        compass_note = (
            '\n\nYour compass is in your hand. The needle points north '
            'consistently. You are at the margin, not inside, so the '
            'light is normal here -- you can still locate yourself by '
            'sun and sky. But the threshold is visible: a few yards '
            'ahead, where the old-growth canopy begins to interlock, '
            'the light changes quality. Flat. Equal from all sides. '
            'You do not need to enter to understand what the geographer '
            'described.'
        )
    smoke_near = ''
    if state.get('shepherd_told_smoke'):
        smoke_near = (
            '\n\nThe breathing-down smoke, if there is any today, would '
            'be visible here from inside the canopy margin -- not rising '
            'but settling, as if the forest were inhaling. '
            'To document the third sign, you would need to observe it '
            'and record it. (USE COMPASS to document this sign.)'
        )
    return (
        'The edge of the Acorwood. The transition is not gradual. The '
        'hill-forest behind you is open, recognizably northern, lit by '
        'the usual flat light. In front of you, perhaps twenty yards in, '
        'the canopy interlocks and something changes. The trees are wider '
        'than any others you have seen at this latitude. Their crowns '
        'overlap and then overlap again with the shade-tolerant trees '
        'beneath. The light that reaches the floor inside would come from '
        'no direction. You would not know which way you were facing.'
        + compass_note + smoke_near
    )

def desc_veld_valley():
    return (
        'The lower valley floor west of the upper valley road. The stream '
        'here has broadened and slowed, and the valley floor is flat and '
        'dark-soiled -- old farmland, still worked in places, fallow in '
        'others. The light sits low over the valley walls. '
        '\n\nThis is where Veld asked to be buried. Lowest of any mine-king. '
        'The Vornheld know which mound. The record-keepers in Stroven know. '
        'A handful of valley families, by long tradition, know.'
    )

def desc_barrow_site():
    base = (
        'The valley floor here is unmarked in any way that a passing traveler '
        'would notice. There is a slight rise in the ground -- the kind of '
        'irregularity that could be a natural feature, could be something else. '
        'The fell-sheep do not graze this particular patch, though the grass '
        'here is no different from the grass around it. '
        '\n\nThis is Veld\'s barrow. The last king. The one who asked to be '
        'buried facing upward rather than outward -- waiting for what would '
        'come to him, or so one school of Vornheld interpretation holds.'
    )
    if 'heather_sprig' in WORLD_ITEMS.get('barrow_site', []):
        base += '\n\nA sprig of dried heather lies on the ground nearby.'
    if state.get('barrow_dark'):
        base += (
            '\n\nSomething happened here. The ground is the same. The light '
            'is the same. But there is an interval in your memory of the last '
            'few minutes that is simply missing -- you were standing here, and '
            'then you were standing here, and the time between was filled with '
            'something you cannot describe except that it was not absence. '
            'The second sign.'
        )
    return base

def desc_eld_valleys():
    has_lantern = 'lantern' in state['inventory']
    has_pan = 'gold_pan' in state['inventory']
    shaft_note = (
        '\n\nThe shaft-mouths are here -- squared stonework around collapsed '
        'openings, subsidence depressions in the turf where old roof-stone '
        'has settled. Fourteen of the seventeen named mine-workings are '
        'locatable here. The other three are deeper in, toward the Acorwood '
        'transition zone, and the Endevor communities do not go there.'
        + ('\n\nWith your lantern, you can examine the shaft-mouth edges '
           'more closely. (EXAMINE SHAFT)'
           if has_lantern else
           '\n\nThe shaft interiors are dark -- you would need a lantern '
           'to examine them closely.')
    )
    stream_note = (
        '\n\nA narrow stream runs along the valley floor, draining east '
        'toward the Acorwood\'s margin. '
        + ('This is the stream the Vornheld tradition has been watching '
           'for eight generations. (USE GOLD PAN to check for gold traces.)'
           if has_pan and not state['used_pan'] else
           'The water is clear and cold.' if not has_pan else
           'You have already panned this stream.')
    )
    ore_note = (
        '\n\nAt the edge of one collapsed shaft, a dark ore fragment has been '
        'washed partially clear by the stream. (TAKE ORE SHARD)'
        if 'ore_shard' in WORLD_ITEMS.get('eld_valleys', []) else ''
    )
    return (
        'The Eld-Valleys: the three valley systems nearest the Acorwood, '
        'marked with the evidence of two centuries of mining work. '
        'The ridgeline above is dotted with barrow mounds -- kings from '
        'the peak period, buried high in the old tradition. Below them, '
        'on the valley faces, the mine-workings.'
        + shaft_note + stream_note + ore_note
    )

def desc_valley_road():
    farmer_note = (
        '\n\nA Lond farmer is heading east on the road, carrying wool from '
        'the Stroven market.'
        if not state.get('lond_farmer_met') else ''
    )
    return (
        'The road east from Stroven runs across the transitional ground '
        'between Endevor\'s hill country and the Lond plateau -- a long '
        'ridge crossing, the terrain opening up as the valleys give way '
        'to the broader upland. The road is well-kept; trade uses it '
        'year-round between Stroven and the plateau.'
        + farmer_note
    )

def desc_lond_plain():
    return (
        'The Lond plateau opens here -- the central highland plain of '
        'Northern Azhora, wider than it looks from the ridge approach. '
        'Dark soil. Flat. The sky sits low and even over the whole plain, '
        'as if the landscape had flattened the weather along with itself. '
        '\n\nTo the north, visible from a considerable distance, is Stonefist. '
        'The rock formation rises above the plain with the unmistakable '
        'profile of a clenched fist -- the geological accident that named it '
        'and held it for everyone who has held it.'
    )

def desc_stonefist_approach():
    unlocked = state.get('entered_stonefist')
    return (
        'The approach to Stonefist. Up close, the dramatic quality gives way '
        'to the specific: the rock is not one smooth mass but a cluster of '
        'irregular columns fractured by ancient cooling stress, some separated '
        'from the main mass by fissures wide enough to walk through. The '
        'terraced stone stairs on the eastern face are the human work -- '
        'everything else is what the geology produced and the centuries did '
        'not change.'
        + ('\n\nThe gate guard is at the base of the approach.'
           if not unlocked else
           '\n\nThe gate guard nods you through. You may enter.')
    )

def desc_stonefist():
    map_note = (
        '\n\nA northern routes map is on the ledge near the captain\'s '
        'position. (TAKE MAP)'
        if 'northern_map' in WORLD_ITEMS.get('stonefist', []) else ''
    )
    return (
        'Inside Stonefist. The natural chambers between the rock columns '
        'have been floored with timber, the gaps in the outer face filled '
        'with dry-laid stone. The garrison captain is on the upper interior '
        'ledge, from which the view of the Lond plateau is unobstructed '
        'in all directions. An army crossing toward Stonefist would be '
        'visible from here for most of a day before it arrived.'
        + map_note
    )

def desc_sond_road():
    return (
        'The road east from the Lond plateau toward the Sond river country '
        'of Ganun. The terrain descends gradually from the highland, the '
        'soil darkening as the drainage increases and the valley bottomlands '
        'become broader. The Sond\'s tributary streams begin to appear -- '
        'clear, fast water running southeast.'
    )

def desc_ondrath():
    pan_note = (
        '\n\nGarvel the Sond trader has panning dishes for sale -- two coins. '
        '(BUY GOLD PAN)'
        if 'gold_pan' not in state['inventory'] else ''
    )
    return (
        'Ondrath market: the Sond trading hub, positioned at the convergence '
        'of three tributary routes where the river first becomes consistently '
        'navigable. Larger than Stroven, louder, more various. Bay of Lol '
        'coastal merchants, Ganoss wool handlers, Orched Hills iron '
        'representatives, and occasionally people from much further south '
        'who wear it slightly. The Sond itself is visible from the market\'s '
        'eastern edge -- broad, cold, moving southeast with purpose.'
        + pan_note
    )

LOCATIONS = {
    'stroven_market': {
        'name': 'Stroven Market',
        'desc': desc_stroven_market,
        'exits': {'north': 'stroven_inn', 'n': 'stroven_inn',
                  'east': 'valley_road', 'e': 'valley_road',
                  'west': 'upper_valley', 'w': 'upper_valley'},
        'npcs': ['eldra'],
        'features': {
            'archive': (
                'The record-keeper\'s stone building. The Stroven family '
                'archive goes back further than most outside institutions '
                'know to look. They have opinions. You would need to earn '
                'them.'
            ),
            'stalls': (
                'Fell-sheep wool in bundles, some already spun and '
                'waterproofed. Dried foods. Hardware. The Endevor market '
                'in autumn is comfortable and unhurried.'
            ),
            'mounds':
                'Several barrow mounds are visible on the ridgeline to the '
                'north -- grass-covered, large, older than the wool trade.',
        },
    },
    'stroven_inn': {
        'name': 'Stroven Inn',
        'desc': desc_stroven_inn,
        'exits': {'south': 'stroven_market', 's': 'stroven_market',
                  'out': 'stroven_market'},
        'npcs': ['innkeeper'],
        'features': {
            'fire': 'A good fire. The north in autumn requires one.',
            'noticeboard': (
                'Travelers\' notices: road conditions, stock prices, '
                'a note about Orgmala movement near the Ganun margins '
                'from two seasons back that no one has taken down.'
            ),
        },
    },
    'upper_valley': {
        'name': 'Upper Valley Road',
        'desc': desc_upper_valley,
        'exits': {'east': 'stroven_market', 'e': 'stroven_market',
                  'north': 'sheepwalk', 'n': 'sheepwalk',
                  'west': 'veld_valley', 'w': 'veld_valley'},
        'npcs': [],
        'features': {
            'stream': 'Clear hill water, running east toward the lower valley.',
            'farmland': 'Dark-soiled strip fields between the slopes and the stream.',
        },
    },
    'sheepwalk': {
        'name': 'High Sheepwalk',
        'desc': desc_sheepwalk,
        'exits': {'south': 'upper_valley', 's': 'upper_valley',
                  'northeast': 'eld_valleys', 'ne': 'eld_valleys',
                  'east': 'acorwood_edge', 'e': 'acorwood_edge'},
        'npcs': ['shepherd'],
        'features': {
            'fell-sheep': (
                'The compact, deeply shaggy animals of the Endevor hills. '
                'This morning they are on the upper pasture, not descending. '
                'The shepherd reads this as a reasonable day.'
            ),
            'acorwood': (
                'The dark tree-line to the east. It is visibly different '
                'from the surrounding hill forest -- denser, darker, with '
                'the particular quality that travelers describe and cannot '
                'exhaust with the word "dark."'
            ),
            'smoke': (
                'A thin thread of something -- smoke, or the forest\'s '
                'equivalent -- rising from inside the Acorwood\'s canopy. '
                'Rising is not quite right. It is settling. Downward. '
                'The breathing-down.'
            ),
        },
    },
    'acorwood_edge': {
        'name': 'Acorwood Edge',
        'desc': desc_acorwood_edge,
        'exits': {'west': 'sheepwalk', 'w': 'sheepwalk',
                  'enter': None, 'in': None, 'north': None,
                  'east': None},
        'npcs': [],
        'features': {
            'acorwood': (
                'The forest begins here. You can see the threshold where '
                'the canopy interlocks and the light changes quality. '
                'The geographer\'s account said it: "directionally nullified '
                'light." The shadows, where they exist, point nowhere.'
            ),
            'smoke': (
                'The breathing-down is visible from here. A darker '
                'quality in the canopy above the area corresponding to '
                'the Deepworks location -- something settling into the '
                'forest rather than rising from it.'
            ),
            'light': (
                'The light at the edge is normal. Step three yards in '
                'and it would not be. The threshold is that precise.'
            ),
        },
    },
    'veld_valley': {
        'name': 'Veld\'s Valley',
        'desc': desc_veld_valley,
        'exits': {'east': 'upper_valley', 'e': 'upper_valley',
                  'north': 'barrow_site', 'n': 'barrow_site'},
        'npcs': [],
        'features': {
            'farmland': 'Old strip fields. Still worked, quietly.',
            'stream': 'The valley-floor stream, slow and cold.',
        },
    },
    'barrow_site': {
        'name': 'Veld\'s Barrow',
        'desc': desc_barrow_site,
        'exits': {'south': 'veld_valley', 's': 'veld_valley'},
        'npcs': [],
        'features': {
            'mound': (
                'The slight rise in the ground. If you know what you are '
                'looking at, you know. If you do not, you might walk over '
                'it without pausing. This is probably intentional.'
            ),
            'grass': 'The fell-sheep do not graze this patch. There is no visible reason why not.',
        },
    },
    'eld_valleys': {
        'name': 'Eld-Valleys',
        'desc': desc_eld_valleys,
        'exits': {'southwest': 'sheepwalk', 'sw': 'sheepwalk',
                  'south': 'sheepwalk', 's': 'sheepwalk'},
        'npcs': [],
        'features': {
            'shaft': (
                'The squared stonework of a sealed shaft-mouth. The '
                'fill has settled over generations, leaving a subsidence '
                'depression in the turf. Whatever was worked here is '
                'done. The stone is patient about this.'
            ),
            'stream': (
                'The eastern hill stream, running toward the Acorwood margin. '
                'It carries gold in concentrations too low to bother with. '
                'Or so the received understanding holds.'
            ),
            'barrows': (
                'The ridgeline above the Eld-Valleys is dense with barrow mounds -- '
                'the mine-kings from the peak period, buried high, their '
                'profiles visible for miles. These are the oldest and largest.'
            ),
        },
    },
    'valley_road': {
        'name': 'Valley Road',
        'desc': desc_valley_road,
        'exits': {'west': 'stroven_market', 'w': 'stroven_market',
                  'east': 'lond_plain', 'e': 'lond_plain'},
        'npcs': ['lond_farmer'],
        'features': {
            'road': 'The packed-earth road east, well-maintained by the valley trade.',
            'ridge': 'The watershed ridge is visible ahead -- beyond it, the Lond plateau opens.',
        },
    },
    'lond_plain': {
        'name': 'Lond Plateau',
        'desc': desc_lond_plain,
        'exits': {'west': 'valley_road', 'w': 'valley_road',
                  'north': 'stonefist_approach', 'n': 'stonefist_approach',
                  'east': 'sond_road', 'e': 'sond_road'},
        'npcs': [],
        'features': {
            'stonefist': (
                'Visible to the north -- the columnar rock formation that '
                'rises from the plateau like a clenched fist. The columns '
                'are different heights, producing the silhouette that names '
                'it from every direction. From here it is a landmark. '
                'Up close it is a fortress.'
            ),
            'soil': 'Dark, deep plateau soil. The kind that accumulates over centuries.',
        },
    },
    'stonefist_approach': {
        'name': 'Stonefist Approach',
        'desc': desc_stonefist_approach,
        'exits': {'south': 'lond_plain', 's': 'lond_plain',
                  'north': 'stonefist', 'n': 'stonefist',
                  'up': 'stonefist'},
        'npcs': ['gate_guard'],
        'features': {
            'rock': (
                'Up close, the formation is not smooth but fractured -- '
                'columns of varying height, some separated from the main '
                'mass by fissures. Natural. Unimproved. Everything the '
                'human hands have done is visible as addition: the stone '
                'fill in the gaps, the terraced stairs, the two walled '
                'choke-points on the eastern approach.'
            ),
            'stairs': 'Cut stone stairs, terraced into the single negotiable approach. Old work.',
        },
    },
    'stonefist': {
        'name': 'Stonefist -- Interior',
        'desc': desc_stonefist,
        'exits': {'south': 'stonefist_approach', 's': 'stonefist_approach',
                  'down': 'stonefist_approach', 'out': 'stonefist_approach'},
        'npcs': ['captain'],
        'features': {
            'view': (
                'From the upper interior ledge, the entire Lond plateau '
                'is visible. An army crossing Lond would be a visible '
                'fact for most of a day before it arrived. '
                'The garrison captain stands here as if this is an entirely '
                'normal place to spend one\'s working life, which for him it is.'
            ),
            'cisterns': 'Three cisterns cut into the rock floor. The garrison can outlast most sieges.',
            'chambers': 'The natural chambers between the columns, floored with old timber. Functional.',
        },
    },
    'sond_road': {
        'name': 'Sond Road',
        'desc': desc_sond_road,
        'exits': {'west': 'lond_plain', 'w': 'lond_plain',
                  'east': 'ondrath', 'e': 'ondrath'},
        'npcs': [],
        'features': {
            'streams': 'Sond tributaries running southeast. The land is descending toward the river country.',
        },
    },
    'ondrath': {
        'name': 'Ondrath Market',
        'desc': desc_ondrath,
        'exits': {'west': 'sond_road', 'w': 'sond_road'},
        'npcs': ['sond_trader', 'orgmala_trader'],
        'features': {
            'sond': (
                'The Sond river at the eastern edge of the market. Broad, '
                'cold, running southeast toward the Orched Hills and '
                'eventually the Mittoli river network. Loaded boats move '
                'on it. This is the most active trade artery in the north.'
            ),
            'market': 'Ondrath in full operation: loud, various, and efficiently organized.',
        },
    },
}

# ─────────────────────────────────────────────────────────────────────────────
#  ACTIONS
# ─────────────────────────────────────────────────────────────────────────────

def do_look(args=None):
    """Describe current location."""
    loc = LOCATIONS[state['location']]
    section(loc['name'])
    desc = loc['desc']
    pr(desc() if callable(desc) else desc)
    # Exits -- show long-form only, deduplicate abbreviation aliases
    _abbrev = {'ne': 'northeast', 'nw': 'northwest', 'se': 'southeast', 'sw': 'southwest'}
    _exit_keys = set(loc['exits'])
    exits = [
        k for k in loc['exits']
        if loc['exits'][k]
        and len(k) > 1
        and k not in ('enter', 'in')
        and not (_abbrev.get(k) in _exit_keys)  # skip short form if long form present
    ]
    if exits:
        pr(f"Exits: {', '.join(exits).title()}.", gap=False)
        print()
    # NPCs present
    npcs_here = [NPCS[n]['title'].title() for n in loc.get('npcs', []) if n in NPCS]
    if npcs_here:
        pr(f"People here: {', '.join(npcs_here)}.", gap=False)
        print()
    # Items on ground
    ground = [ITEMS[i]['name'] for i in WORLD_ITEMS.get(state['location'], [])
              if i in ITEMS and i not in state['inventory']]
    if ground:
        pr(f"You see: {', '.join(ground)}.", gap=False)
        print()


def do_inventory(args=None):
    section('Inventory')
    if not state['inventory']:
        pr('You are carrying nothing.')
        return
    for item_id in state['inventory']:
        if item_id == 'coin_purse':
            pr(f'  Coin Purse ({state["coins"]} coins)')
        elif item_id in ITEMS:
            pr(f'  {ITEMS[item_id]["name"]} -- {ITEMS[item_id]["desc"]}')
    # Signs found
    if state['signs']:
        signs_text = {
            'gold': 'Gold in the eastern stream (First Sign)',
            'barrow': 'The barrow waking (Second Sign)',
            'smoke': 'The breathing-down observed and documented (Third Sign)',
        }
        print()
        pr('Field notes record:')
        for s in state['signs']:
            pr(f'  [x] {signs_text.get(s, s)}')
    print()


def do_examine(args):
    if not args:
        pr('Examine what?')
        return
    target = ' '.join(args).lower()

    # Check inventory
    for item_id in state['inventory']:
        if item_id in ITEMS:
            item = ITEMS[item_id]
            if target in (item_id.replace('_', ' '),
                          item['name'].lower(),
                          item_id):
                if item_id == 'coin_purse':
                    pr(f'Your coin purse. Currently holds {state["coins"]} coins.')
                elif item_id == 'field_notes':
                    do_field_notes()
                elif item.get('examine'):
                    pr(item['examine'])
                else:
                    pr(item['desc'])
                return

    # Check ground items
    loc_items = WORLD_ITEMS.get(state['location'], [])
    for item_id in loc_items:
        if item_id in ITEMS:
            item = ITEMS[item_id]
            if target in (item_id.replace('_', ' '), item['name'].lower(), item_id):
                pr(item.get('examine') or item['desc'])
                return

    # Check location features
    loc = LOCATIONS[state['location']]
    for feat_key, feat_desc in loc.get('features', {}).items():
        if target in feat_key or feat_key in target:
            pr(feat_desc)
            return

    # Check NPCs
    for npc_id in loc.get('npcs', []):
        if npc_id in NPCS:
            npc = NPCS[npc_id]
            if target in (npc_id, npc['name'].lower(), npc['title'].lower()):
                pr(npc['desc'])
                return

    pr(f'You see nothing remarkable about {target}.')


def do_take(args):
    if not args:
        pr('Take what?')
        return
    target = ' '.join(args).lower()
    loc_items = WORLD_ITEMS.get(state['location'], [])
    for item_id in loc_items[:]:
        item = ITEMS.get(item_id)
        if item and target in (item_id.replace('_', ' '), item['name'].lower(), item_id):
            WORLD_ITEMS[state['location']].remove(item_id)
            state['inventory'].append(item_id)
            pr(f'You take the {item["name"]}.')
            return
    # Check if it's a shop item (can't just take it)
    for item_id, loc_id in SHOP_ITEMS.items():
        if loc_id == state['location']:
            item = ITEMS.get(item_id)
            if item and target in (item_id.replace('_', ' '), item['name'].lower(), item_id):
                pr(f'The {item["name"]} is for sale here. (BUY {item["name"].upper()})')
                return
    pr(f'There is no {target} here to take.')


def do_drop(args):
    if not args:
        pr('Drop what?')
        return
    target = ' '.join(args).lower()
    for item_id in state['inventory'][:]:
        if item_id not in ITEMS:
            continue
        item = ITEMS[item_id]
        if target in (item_id.replace('_', ' '), item['name'].lower(), item_id):
            state['inventory'].remove(item_id)
            if state['location'] not in WORLD_ITEMS:
                WORLD_ITEMS[state['location']] = []
            WORLD_ITEMS[state['location']].append(item_id)
            pr(f'You drop the {item["name"]}.')
            return
    pr(f'You are not carrying a {target}.')


def do_go(args):
    if not args:
        pr('Go where?')
        return
    direction = args[0].lower()
    loc = LOCATIONS[state['location']]
    dest_id = loc['exits'].get(direction)

    if dest_id is None and direction in loc['exits']:
        # Exit exists but leads nowhere (e.g. into the Acorwood)
        if state['location'] == 'acorwood_edge':
            pr(
                'You take a step into the Acorwood. The light is immediately '
                'different -- flat, even, arriving from no direction. You take '
                'another step. The tree-line behind you is still visible. '
                'You check your compass: north. You look for the sun: '
                'somewhere above the canopy, without shadow to tell you where. '
                '\n\nYou step back out. The geographer was right. You do not '
                'want to go further without understanding this better.'
            )
        else:
            pr('You cannot go that way.')
        return

    if not dest_id:
        pr(f'You cannot go {direction} from here.')
        return

    # Stonefist gate check
    if dest_id == 'stonefist' and not state.get('entered_stonefist'):
        pr('The gate guard is blocking entry. (ASK GUARD ABOUT ENTRY, or SHOW ACADEMY PAPERS TO GUARD)')
        return

    state['location'] = dest_id
    do_look()

    # Trigger events on arrival
    _check_arrival_events()


def _check_arrival_events():
    loc = state['location']
    if loc == 'barrow_site':
        state['visited_barrow'] = True


def do_talk(args):
    if not args:
        pr('Talk to whom?')
        return
    target = ' '.join(args).lower().replace('to ', '').strip()
    loc = LOCATIONS[state['location']]
    for npc_id in loc.get('npcs', []):
        if npc_id not in NPCS:
            continue
        npc = NPCS[npc_id]
        if (target in npc_id or target in npc['name'].lower()
                or target in npc['title'].lower()
                or npc['name'].lower() in target):
            pr(npc['talk'])
            topics = npc.get('topics', [])
            if topics:
                pr(f'[Topics: {", ".join(topics)}]')
            return
    pr(f'There is no one called "{target}" here to talk to.')


def do_ask(args):
    """ASK <npc> ABOUT <topic>"""
    if not args:
        pr('Ask whom about what? (ASK <person> ABOUT <topic>)')
        return
    text = ' '.join(args).lower()
    if 'about' in text:
        parts = text.split('about', 1)
        npc_part = parts[0].strip()
        topic = parts[1].strip()
    else:
        pr('Try: ASK <person> ABOUT <topic>')
        return

    loc = LOCATIONS[state['location']]
    for npc_id in loc.get('npcs', []):
        if npc_id not in NPCS:
            continue
        npc = NPCS[npc_id]
        if (npc_part in npc_id or npc_part in npc['name'].lower()
                or npc['name'].lower() in npc_part):
            response = npc['fn'](topic)
            pr(f'{npc["name"]}: "{response}"' if not response.startswith(npc['name']) else response)
            return
    pr('There is no one here by that name.')


def do_show(args):
    """SHOW <item> TO <npc>"""
    text = ' '.join(args).lower()
    if 'to' not in text:
        pr('Show what to whom? (SHOW <item> TO <person>)')
        return
    parts = text.split(' to ', 1)
    item_part = parts[0].strip()
    npc_part = parts[1].strip()

    # Find item in inventory
    item_id = None
    for iid in state['inventory']:
        if iid not in ITEMS:
            continue
        if item_part in iid or item_part in ITEMS[iid]['name'].lower():
            item_id = iid
            break
    if not item_id:
        pr(f'You are not carrying a {item_part}.')
        return

    # Find NPC
    loc = LOCATIONS[state['location']]
    for npc_id in loc.get('npcs', []):
        if npc_id not in NPCS:
            continue
        npc = NPCS[npc_id]
        if npc_part in npc['name'].lower() or npc['name'].lower() in npc_part:
            _handle_show(item_id, npc_id)
            return
    pr(f'There is no one called {npc_part} here.')


def _handle_show(item_id, npc_id):
    item = ITEMS[item_id]
    npc = NPCS[npc_id]

    if npc_id == 'eldra' and item_id == 'academy_papers':
        state['eldra_trusts'] = True
        pr(
            'Eldra reads your commission carefully. She folds it and returns it.'
            '\n\n"A scholar investigating unusual activity in the mining valleys. '
            'The Academy is more attentive than I expected." She pauses. '
            '"Ask me what you came to ask."'
            '\n\n[Eldra now trusts you. Ask her about the vel-eld, the signs, '
            'the gold, the barrows, the smoke, or the deepworks.]'
        )
        return

    if npc_id == 'gate_guard' and item_id == 'academy_papers':
        state['entered_stonefist'] = True
        pr(
            'The guard examines your Academy papers. He takes his time. '
            'He returns them and steps aside.'
            '\n\n"The captain will see you. Stay on the lower ledges '
            'unless invited higher." He gestures toward the stairs.'
            '\n\n[You may now enter Stonefist. GO NORTH or GO UP.]'
        )
        return

    pr(f'You show the {item["name"]} to {npc["name"]}. '
       f'{npc["name"]} looks at it and nods.')


def do_buy(args):
    if not args:
        pr('Buy what?')
        return
    target = ' '.join(args).lower()
    loc_id = state['location']

    for item_id, sold_at in SHOP_ITEMS.items():
        if sold_at != loc_id:
            continue
        item = ITEMS[item_id]
        if (target in item_id.replace('_', ' ')
                or target in item['name'].lower()
                or item_id in target):
            if item_id in state['inventory']:
                pr(f'You already have the {item["name"]}.')
                return
            price = item['price']
            if state['coins'] < price:
                pr(f'You cannot afford the {item["name"]} ({price} coins). You have {state["coins"]}.')
                return
            state['coins'] -= price
            state['inventory'].append(item_id)
            pr(f'You buy the {item["name"]} for {price} coins. ({state["coins"]} coins remaining.)')
            return

    pr(f'Nothing called "{target}" is for sale here.')


def do_use(args):
    if not args:
        pr('Use what?')
        return
    text = ' '.join(args).lower()

    # USE COMPASS (at acorwood edge)
    if 'compass' in text:
        if 'compass' not in state['inventory']:
            pr('You do not have a compass.')
            return
        if state['location'] == 'acorwood_edge':
            if 'smoke' in state['signs']:
                pr('You have already documented the breathing-down smoke. The compass still points north.')
                return
            if not state.get('shepherd_told_smoke'):
                pr(
                    'You hold the compass up at the Acorwood margin. North holds. '
                    'The light beyond the threshold is flat and sourceless. '
                    '\n\nYou are not sure what you are looking for. The shepherd '
                    'on the sheepwalk mentioned smoke -- perhaps speak to him first.'
                )
                return
            # Trigger sign 3
            state['signs'].add('smoke')
            pr(
                'You stand at the Acorwood margin with your compass. North holds: '
                'constant, reliable, the needle\'s only gift in a place that '
                'offers no others.\n\n'
                'The breathing-down smoke is visible from here -- a darker '
                'quality in the upper canopy above the area corresponding to '
                'the Deepworks location. Not rising. Settling. Dissipating '
                'into the forest rather than away from it, as if the forest '
                'were receiving something rather than releasing it.\n\n'
                'You record the observation. Direction: northeast bearing from '
                'this position. Concentration: above the ground corresponding '
                'to the third Eld-Valley system. Behaviour: downward '
                'dissipation, distinct from both rising smoke and lateral wind-'
                'dispersed smoke. Duration: at least the length of your '
                'observation.\n\n'
                'The third sign: when the wood speaks what it knows.\n\n'
                '[Third Sign found. You have now recorded '
                f'{len(state["signs"])} of 3 signs.]'
            )
            _check_ending()
        else:
            pr('You check your compass. North holds. You are in open country -- the compass is useful here but not revelatory.')
        return

    # USE GOLD PAN (at eld valleys)
    if ('gold' in text or 'pan' in text or 'miner' in text):
        if 'gold_pan' not in state['inventory']:
            pr('You do not have a gold pan.')
            return
        if state['location'] == 'eld_valleys':
            if state.get('used_pan'):
                pr('You have already panned this stream. The traces are documented.')
                return
            state['used_pan'] = True
            state['signs'].add('gold')
            pr(
                'You take the pan to the stream and work the gravel in the '
                'slow downstream bend where sediment collects.\n\n'
                'The first two pans are empty. The third -- you almost '
                'discard it. A colour. Not much. But not nothing.\n\n'
                'You pan carefully. The flecks are there: fine, irregular, '
                'unmistakably gold. Not the trace-concentrations the received '
                'understanding predicts. More than that. Not much more. But '
                'more than the Vornheld tradition has observed in this stream '
                'for eight generations.\n\n'
                'The cold water finds what it left behind.\n\n'
                'The first sign.\n\n'
                '[First Sign found. You have now recorded '
                f'{len(state["signs"])} of 3 signs.]'
            )
            _check_ending()
        else:
            pr('You dip the pan in the water. Nothing here worth recording.')
        return

    # USE SCROLL FRAGMENT (at barrow site)
    if 'scroll' in text or 'fragment' in text or 'vornheld' in text:
        if 'scroll_fragment' not in state['inventory']:
            pr('You do not have the scroll fragment.')
            return
        if state['location'] != 'barrow_site':
            pr('Eldra said to take it to the valley floor. This is not that place.')
            return
        if 'barrow' in state['signs']:
            pr('The scroll fragment is silent now. What happened here is already recorded.')
            return
        # Trigger sign 2
        state['barrow_dark'] = True
        state['signs'].add('barrow')
        pr(
            'You hold the scroll fragment at the slight rise in the ground '
            'that is Veld\'s unmarked barrow.\n\n'
            'You say nothing. Eldra said to say nothing. You wait.\n\n'
            'The light does not change. The temperature does not change. '
            'The fell-sheep on the upper pasture continue their business. '
            'There is no sound that was not there before.\n\n'
            'And then there is an interval you cannot account for. You are '
            'standing here, and then you are standing here, and the time '
            'between was filled with something that was not absence. You '
            'know this the way you know that you slept: the evidence is '
            'the gap itself.\n\n'
            'The scroll fragment is warm. It was not warm before.\n\n'
            'You write in your field notes. Not what happened -- you cannot '
            'describe what happened -- but the fact of it, and the location, '
            'and the scroll fragment\'s temperature, which is a fact you '
            'can document even if it is the least of what occurred.\n\n'
            'The barrows wake before they are opened.\n\n'
            'The second sign.\n\n'
            '[Second Sign found. You have now recorded '
            f'{len(state["signs"])} of 3 signs.]'
        )
        _check_ending()
        return

    pr(f'You are not sure how to use that here.')


def do_read(args):
    if not args:
        pr('Read what?')
        return
    target = ' '.join(args).lower()
    for item_id in state['inventory']:
        if item_id not in ITEMS:
            continue
        item = ITEMS[item_id]
        if target in (item_id.replace('_', ' '), item['name'].lower(), item_id):
            if item_id == 'scroll_fragment':
                pr(
                    'The archaic Northern Mittoli is partially legible to you '
                    'with effort. The fragment is part of the third sign\'s '
                    'passage:\n\n'
                    '"...vel-keth-eld, nil-vel-gall nil-vel-keth, '
                    'vel-milloss vel-toss vel-Endre..."\n\n'
                    'Which translates approximately as: the forest\'s memory '
                    'of fire; no-crossing, no-return-speech; '
                    'seen before the crossing, the peak returns, Vel-Endre stands.\n\n'
                    'The translation is approximate. The tradition, Eldra said, '
                    'does not require your annotation.'
                )
            elif item_id == 'northern_map':
                pr(
                    'A detailed hand-drawn map of Northern Azhora. '
                    'Stonefist at the centre, routes radiating in every direction. '
                    'Endevor is marked with a notation in archaic Northern Mittoli: '
                    'vel-eld nil-toss -- "the return that does not yet crest." '
                    'The captain\'s handwriting adds, below this, in standard Mittoli: '
                    '"Source: Vornheld tradition. Date uncertain. Accuracy: unknown."'
                )
            elif item_id == 'academy_papers':
                pr(
                    'Your commission from the Caeras Valley Academy. '
                    '"Investigate reports of unusual phenomena in the Endevor mining '
                    'valleys. Document and report. Do not interpret beyond evidence." '
                    'The last instruction is underlined.'
                )
            else:
                pr(f'The {item["name"]} is not something that can be read.')
            return
    pr(f'You are not carrying a {target}.')


def _give_scroll(eldra_npc):
    """Called when Eldra offers the scroll fragment."""
    if 'scroll_fragment' not in state['inventory']:
        if 'scroll_fragment' not in WORLD_ITEMS.get('stroven_market', []):
            WORLD_ITEMS.setdefault('stroven_market', []).append('scroll_fragment')
        state['scroll_given'] = True
        pr(
            'Eldra writes on a strip of vellum -- quickly, from memory -- '
            'and holds it out.\n\n'
            '"Take this to the valley floor. Say nothing. Wait. '
            'The tradition does not require your commentary, and what '
            'it shows you will not fit in an Academy report anyway. '
            'You will know where the barrow is when you are standing on it."\n\n'
            '[The scroll fragment is on the ground. TAKE SCROLL FRAGMENT.]'
        )


def do_give_scroll(args=None):
    """Player tries to take the scroll from Eldra directly."""
    if not state.get('eldra_trusts'):
        pr('Eldra has not offered you anything yet. Show her your Academy papers first.')
        return
    if state.get('scroll_given'):
        pr('Eldra has already given you the scroll fragment.')
        return
    if state['location'] != 'stroven_market':
        pr('Eldra is in Stroven market.')
        return
    _give_scroll(NPCS['eldra'])


# ─────────────────────────────────────────────────────────────────────────────
#  ENDING CHECKS
# ─────────────────────────────────────────────────────────────────────────────

def _check_ending():
    if len(state['signs']) == 3 and not state.get('ending_offered'):
        state['ending_offered'] = True
        print()
        hr()
        pr(
            'You have documented all three signs of the Vel-Eld.\n\n'
            'The cold water found what it left behind. '
            'The barrow woke before it was opened. '
            'The wood spoke what it knew.\n\n'
            'The Academy sent you to investigate and report. '
            'Eldra will recite the Vel-Eld at Veld\'s barrow at the equinox. '
            'What you do with what you have found is a decision that '
            'belongs to you now, not to the commission.'
        )
        hr()
        pr(
            'You may:\n\n'
            '  WRITE REPORT -- Document the signs and send a full honest '
            'report to the Academy.\n\n'
            '  TELL ELDRA -- Bring the findings to the Vornheld. '
            'Let the knowledge remain in the north.\n\n'
            '  WAIT AT BARROW -- Return to Veld\'s barrow and stay '
            'for the equinox recitation. Be a witness.\n\n'
            '(You may also continue exploring. The choice keeps.)'
        )


def do_write_report(args=None):
    if len(state['signs']) < 3:
        remaining = 3 - len(state['signs'])
        pr(f'Your field notes are incomplete. {remaining} sign(s) still to document.')
        return
    ending_academic()


def do_tell_eldra(args=None):
    if len(state['signs']) < 3:
        pr('You have not yet documented all three signs.')
        return
    if state['location'] != 'stroven_market':
        pr('Eldra is in Stroven market.')
        return
    ending_vornheld()


def do_wait(args=None):
    if state['location'] == 'barrow_site' and len(state['signs']) == 3:
        ending_witness()
        return
    if state['location'] == 'barrow_site' and len(state['signs']) > 0:
        pr(
            'You wait at the barrow. The valley is quiet. The fell-sheep '
            'on the upper pasture make their unhurried adjustments. '
            'Whatever happened here before, you are not sure it will happen '
            'again on demand. Continue gathering the signs.'
        )
        return
    pr('Time passes. The north continues.')


def ending_academic():
    state['game_over'] = True
    section('ENDING: THE ACADEMY REPORT')
    pr(
        'You write the report at the inn in Stroven before you leave. '
        'It takes the better part of a day.\n\n'
        'You describe the gold in the pan: concentration above baseline, '
        'location documented, method recorded, margin of error acknowledged. '
        'You describe the barrow interval: the gap in continuity, the '
        'scroll fragment\'s temperature change, your inability to account '
        'for the mechanism. You describe the breathing-down smoke: bearing, '
        'concentration, duration, the correlation with the Deepworks location '
        'that the Vornheld tradition documents and you have now independently '
        'confirmed.\n\n'
        'You write what the Vel-Eld\'s three signs are and note that all '
        'three have been observed within one investigation season. '
        'You note that the Vornheld tradition does not specify a timeline '
        'for the restoration that follows the signs. You note that the '
        '"restoration" itself is not a term with clear empirical content.\n\n'
        'You fold the report and seal it with your Academy mark.\n\n'
        'On the outside, in your own hand, you add: '
        '"I believe this report is accurate. I am less certain it is '
        'sufficient. The tradition that produced these phenomena has '
        'been maintained without outside record for longer than we have '
        'been watching. What we do with this depends on whether we think '
        'watching is the same as understanding."\n\n'
        'The road south through the Orched Hills takes twelve days. '
        'Endevor recedes behind you into the grey northern distance, '
        'its ridgelines scattered with the dead kings and their '
        'unanswered questions.'
    )
    hr()
    pr('Thank you for playing The Vel-Eld.')
    pr('Signs found: ' + ', '.join(state['signs']))


def ending_vornheld():
    state['game_over'] = True
    section('ENDING: THE KNOWLEDGE STAYS NORTH')
    pr(
        'You find Eldra in the market square the morning before you planned '
        'to leave.\n\n'
        '"All three," she says. It is not a question. She has been watching '
        'your face since you sat down.\n\n'
        '"All three," you say.\n\n'
        'She is quiet for a moment. Not surprised -- Eldra does not perform '
        'surprise -- but something has settled in her that was not settled '
        'before. "The gold. The barrow. The wood."\n\n'
        '"Yes."\n\n'
        'She nods. "Then you understand why I cannot let you take that '
        'report south." She says it without threat. It is an observation '
        'about what the situation requires. "Not because the Academy would '
        'disbelieve it. Because they would believe it and send the wrong '
        'kind of attention north, and what is latent in the ground does '
        'not need that attention. It needs time."\n\n'
        'You sit with this for a while. The Stroven market moves around you.\n\n'
        'You give her your field notes. All of them. The gold-pan observation, '
        'the barrow interval, the breathing-down smoke. You keep nothing.\n\n'
        'She folds the notes once and puts them in her pack. "The Vornheld '
        'will hold them. That is what we do."\n\n'
        'You go back to the inn and write a different report -- accurate '
        'in everything it says, silent on what matters. The Academy will '
        'file it. Someone in three generations may notice what it does '
        'not say.\n\n'
        'The road south takes twelve days. You are thinking about the '
        'barrow interval the whole way. You do not write it down again.'
    )
    hr()
    pr('Thank you for playing The Vel-Eld.')
    pr('Signs found: ' + ', '.join(state['signs']))


def ending_witness():
    state['game_over'] = True
    section('ENDING: THE WITNESS')
    pr(
        'You return to Veld\'s valley at the equinox and stay.\n\n'
        'Vornheld practitioners arrive through the morning -- some you have '
        'seen in Stroven, some you have not seen before, from further '
        'valleys. Eldra is the last to arrive. She looks at you standing '
        'at the barrow margin and says nothing about it. You are here. '
        'That is a fact, and Endevor treats facts as facts.\n\n'
        'The recitation begins at midday.\n\n'
        'The Vel-Eld in full is nothing like the fragment. The fragment '
        'was a strip of parchment with archaic Northern Mittoli that you '
        'could hold in your hand and partially translate. The full '
        'recitation, by Eldra and two other Vornheld alternating voices '
        'in the specific call-and-answer structure that the tradition '
        'preserves, is something you cannot take notes on because your '
        'hands do not move for it. You stand at the edge of the gathered '
        'community and you listen.\n\n'
        'The three signs are named. The gold. The barrows. The wood. '
        'They are named as things already observed -- not as future '
        'conditions but as past completions. The vel in vel-eld meaning '
        '"was already": the return that was always there, becoming visible.\n\n'
        'Vel-Endre is named. The condition, not the person. '
        'The thing returning, not the thing that arrives.\n\n'
        'When the recitation ends the community is quiet for a long time.\n\n'
        'You do not write a report. You think about writing one for several '
        'months after you return south, and every time you begin you '
        'find you have already written what can be written and what cannot '
        'be written does not want to be. The Academy eventually closes '
        'your commission as inconclusive.\n\n'
        'In Stroven, at the next equinox, Eldra recites the Vel-Eld again. '
        'She does not mention you. The tradition does not require it. '
        'You were there. That is enough.'
    )
    hr()
    pr('Thank you for playing The Vel-Eld.')
    pr('Signs found: ' + ', '.join(state['signs']))


def do_field_notes(args=None):
    section('Field Notes')
    signs_text = {
        'gold': (
            'FIRST SIGN -- Gold in the eastern hill stream, Eld-Valleys, '
            'above-baseline concentration confirmed by panning. '
            'Consistent with the Vel-Eld\'s first sign: "cold water '
            'finds what cold water left."'
        ),
        'barrow': (
            'SECOND SIGN -- Temporal discontinuity at Veld\'s barrow, '
            'valley floor, Endevor. Duration: unquantifiable. '
            'Scroll fragment temperature elevated post-event. '
            'No external cause identified. Consistent with vel-milloss '
            'nil-vel-gall: "seen before the crossing."'
        ),
        'smoke': (
            'THIRD SIGN -- Breathing-down smoke observed at Acorwood margin, '
            'bearing northeast, above Deepworks area. Downward dissipation '
            'confirmed. Consistent with Vornheld tradition of "the wood '
            'speaking what it knows."'
        ),
    }
    if not state['signs']:
        pr('No signs documented yet.')
    else:
        for s in ['gold', 'barrow', 'smoke']:
            if s in state['signs']:
                pr('[x] ' + signs_text[s])
                print()
    if len(state['signs']) == 3:
        pr(
            'All three signs documented. The commission is complete.\n\n'
            'OPTIONS: WRITE REPORT / TELL ELDRA (in Stroven) / '
            'WAIT AT BARROW (for the equinox)'
        )


def do_help(args=None):
    section('Commands')
    pr(
        'MOVEMENT\n'
        '  GO <direction>  or just  NORTH / SOUTH / EAST / WEST / NE / SW\n\n'
        'LOOKING\n'
        '  LOOK or L -- describe this location\n'
        '  EXAMINE <thing> or X <thing> -- examine an object, person, or feature\n\n'
        'ITEMS\n'
        '  TAKE <item>  /  DROP <item>  /  INVENTORY or I\n'
        '  BUY <item> -- purchase from a shop\n'
        '  USE <item> -- use an item (compass, gold pan, scroll fragment)\n'
        '  READ <item> -- read a document or map\n\n'
        'PEOPLE\n'
        '  TALK <person> -- greet someone\n'
        '  ASK <person> ABOUT <topic> -- ask a specific question\n'
        '  SHOW <item> TO <person> -- show something to someone\n\n'
        'QUEST\n'
        '  NOTES -- review your field notes and signs found\n'
        '  WRITE REPORT -- (when all signs found) send the Academy report\n'
        '  TELL ELDRA -- (in Stroven, signs found) give knowledge to Vornheld\n'
        '  WAIT -- (at Veld\'s barrow, signs found) stay for the recitation\n\n'
        'OTHER\n'
        '  SCORE -- show signs found\n'
        '  HELP or ? -- this list\n'
        '  QUIT -- end the game\n'
    )


def do_score(args=None):
    pr(f'Signs found: {len(state["signs"])} of 3 -- {", ".join(state["signs"]) or "none yet"}.')
    if len(state['signs']) == 3:
        pr('All signs documented. See NOTES for your options.')


# ─────────────────────────────────────────────────────────────────────────────
#  PARSER
# ─────────────────────────────────────────────────────────────────────────────

DIRECTIONS = {'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw', 'up', 'down',
              'north', 'south', 'east', 'west', 'northeast', 'northwest',
              'southeast', 'southwest', 'in', 'out', 'enter'}

VERBS = {
    'look': do_look, 'l': do_look,
    'examine': do_examine, 'x': do_examine, 'inspect': do_examine,
    'take': do_take, 'get': do_take, 'pick': do_take,
    'drop': do_drop, 'leave': do_drop,
    'go': do_go, 'move': do_go, 'travel': do_go, 'walk': do_go,
    'inventory': do_inventory, 'i': do_inventory, 'inv': do_inventory,
    'talk': do_talk, 'speak': do_talk, 'greet': do_talk,
    'ask': do_ask,
    'show': do_show,
    'buy': do_buy, 'purchase': do_buy,
    'use': do_use,
    'read': do_read,
    'notes': do_field_notes, 'note': do_field_notes,
    'write': lambda a: do_write_report() if 'report' in ' '.join(a) else pr('Write what?'),
    'tell': lambda a: do_tell_eldra() if 'eldra' in ' '.join(a) else pr('Tell whom?'),
    'wait': do_wait, 'stay': do_wait,
    'score': do_score, 'status': do_score,
    'help': do_help, '?': do_help,
    'quit': lambda a: sys.exit(0),
    'exit': lambda a: sys.exit(0),
    'q': lambda a: sys.exit(0),
}

# Special: Eldra scroll giving
ELDRA_SCROLL_TRIGGERS = {'take scroll', 'get scroll', 'scroll fragment',
                         'take fragment', 'get fragment'}


def parse(line):
    words = line.strip().lower().split()
    if not words:
        return

    # Direction shortcut
    if words[0] in DIRECTIONS:
        do_go(words)
        return

    verb = words[0]
    args = words[1:]

    # Eldra scroll special case
    if ' '.join(words[:2]) in ELDRA_SCROLL_TRIGGERS:
        if state['location'] == 'stroven_market' and state.get('eldra_trusts') and not state.get('scroll_given'):
            do_give_scroll()
            return

    # "look at X" -> examine
    if verb == 'look' and args and args[0] == 'at':
        do_examine(args[1:])
        return

    # "pick up X" -> take
    if verb == 'pick' and args and args[0] == 'up':
        do_take(args[1:])
        return

    if verb in VERBS:
        VERBS[verb](args)
    else:
        pr(f'(I don\'t understand "{verb}". Type HELP for commands.)')


# ─────────────────────────────────────────────────────────────────────────────
#  INTRODUCTION
# ─────────────────────────────────────────────────────────────────────────────

INTRO = """\
+==============================================================================+
|                                                                              |
|                              THE VEL-ELD                                     |
|                     A Text Adventure in Northern Azhora                      |
|                                                                              |
+==============================================================================+

The road north through the Orched Hills took you twelve days. Three more
brought you over the transitional country into Endevor -- the hilly pastoral
land northwest of the Acorwood, where the air carries the cold weight of
the bay and the ridgelines are scattered with old burial mounds.

Your commission from the Caeras Valley Academy is specific: investigate
reports of unusual activity in the Endevor mining valleys. The Academy
considers these reports of academic interest. Your own reading of the
files suggests they may be something more.

You are in Stroven, the main market town of Endevor. You carry your Academy
papers and a coin purse with ten coins. It is mid-morning on a cold autumn day.

Type HELP for commands. Type LOOK to begin.
"""


# ─────────────────────────────────────────────────────────────────────────────
#  MAIN LOOP
# ─────────────────────────────────────────────────────────────────────────────

def main():
    # Clear screen (best-effort)
    os.system('cls' if os.name == 'nt' else 'clear')
    print(INTRO)

    while not state['game_over']:
        try:
            line = input('> ').strip()
        except (EOFError, KeyboardInterrupt):
            print()
            pr('Farewell.')
            break
        if line:
            parse(line)

    if state['game_over']:
        pass  # ending already printed


if __name__ == '__main__':
    main()
