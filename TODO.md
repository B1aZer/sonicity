
## todo

- fix small aspects billboard etc
- outpost page
- terrain mat + grass
- trees
- link in city for all buidlings for mobile
- fog
- small fabs
Cel Shading - Most impactful for the toon look
Outline Effect - Classic Ghibli signature
Warm Color Grading - Magical, golden-hour feel
Atmospheric Haze - Enhances your mountain backdrop


## plan

1. camera set fixed
2. lanscape how 
3. grass from unreal demo sm map?

## todo

- add heros building spawn sound
- add raycaster building lights overview

Atmospheric Effects
Fog: Add depth and atmosphere
Particle System: Dust particles, smoke from chimneys
Post-processing: Bloom for lights, color grading
Weather System: Rain, snow effects


## models
+continue from tower lvl 2


 oracle -> yield statuin
 banner -> in shop
 cauldron - rep st
 factory - diamond
 woodc - farm
 house - home

 left:

 barrak - barraks
 throne - stake hub
 tower - tower

## disctrict 

guaiadance ?? smithy
workshop ? blacksmith
SCOUT_GUILD ? sm watch tower
GARRISON ? sm barracks
OUTPOST ? sm outpost
COMMAND_CENTER ? sm fortress
TAVERN ? sm church
TACTICS_CENTER ?  sm archery ?
ARCANUME ? mine ?

## fab

https://www.fab.com/listings/4b44a80b-b57a-4e79-9d56-73db9defa8c0

## todo

+ new production 24 stadnard, diamonds, gold 250 ?
+ change charge label
+ change maybe price for rep stations to diamonds ?
+ update help page later
- postprocessing / bokeh / depth of fieldq
- shop
- add this.requiredDistrictBuilding = 'Arcanum of Names';
- damage system

## question goals

- A: sell to whales
- B: extract from users
- C: perfection to create value and create sustainable revenue through that value. And value comes from emotions not greed. Music + visuals + strategy = Beutiful nft - governance + revenue + alliances

## city

- unique buildings to cities
- lottery
- erc20 token with LP donations in that token
- possible marketplace
- unique nft
- specialization
- Conquerency between other cities for pool ownage
- pvp citeis ?
- city life: chats, quests, researches

## lacking features

1. reinvest ? 
2. LP with resources ?
3. capped nfts ?
4. icrease requests (sps) on nft marketplace ?
5. end goal ? passive income - new job - 1m in revenue

1000 * 100 = 100000 

how to achieve ? ride on whales - but the game is COMPLETELY Anti whales

## examples:

1. petroleum : sold to whales and fucked economy, big extraction
2. sonic rpg: not sold but no revenue/interest
3. pokemon nft: not sold, and low interest, small buccks

## balance

- 90% to revenue6tfrtt676
- buildling slots
// Houses: 5 SONIC to build + 1.0 SONIC per 24h
// Farms: 10 SONIC to build + 2.0 SONIC per 24h  
// Diamond Stations: 15 SONIC to build + 3.0 SONIC per 72h
// REP Forges: 20 SONIC to build + 4.0 SONIC per 168h
// Yield Stations: 25 SONIC to build + 5.0 SONIC per 24h
- also lets change diamonds, forges duration
- increase 24 yields duration to runaway sensible
- recharge levels (grid)
- gold price for buidlings

## 3d rendering

- build all buildings and check they all work
- all models from unreal to glb
- camera
- terraian, patrly blender, partly unreal map
- lightning
- other props

## todo

- metrics / sentry
- you know the driss like, rt for wl
- update _baseTokenURI on nft contracts
- merge nft buidling
- responsive changes

- build all buidlings and adjust 3d scene view

- go through game ONLY using ffard

+ add detailed description to disctrict in js
- add this check for buildling to all pages:
if (!isArcanumBuilt) {
                this.setState({
                    arcanumStatus: 'Not Built',
                    buildingLevel: 'Build Required',
                    canCreateNFT: false
                });
                return;
            }
            
            // Get building level if built
            const buildingLevel = isArcanumBuilt ? 1 : 0; // Arcanum is maxLevel 1
- nft images and so on, should we populate all tokens, limits on mint ?    

+ players should noe care about nft for now
+ grid updates  - simply diamonds, current system too complex
+ barrack/district updates - diamonds
- cache buidlings
+ burn and unstake after upgrade
+ move mint to district buidling, add tier by rarirty
+ right bullding should completely for help and resource/rev status, optining by tiers. Guidance building
+ we completely disable unstake for now, meaning destory completely destroys with nft. For tier 4 yield stations we remove house actions for now. And allow stake directly, unstake removes nft.
+ what happens whaen attacke goes to garrison and vie versa
+ cmd center rm resource, make similar

## todo

- remove house nft left
+ connected address white
- troop survival, add description garris, center
- restricut url by pages

## models

- https://www.fab.com/listings/a4b43ae5-e442-4d51-93f2-fea8d77e9f37
- https://www.fab.com/listings/c5c87fef-db62-48d8-9e15-08a4412a9bb0
- https://www.fab.com/listings/c780298c-8201-4d23-945d-8f7837c3fe9b
- (https://www.fab.com/listings/4482015f-306e-471c-a8d0-55c1c433bc52)

## todo

UI/UX polish - Make the prototype look good
Gameplay balance - Ensure the core loop is fun

## todo

- update docs
- think what to do with loop to bring more fun

## gameplay feedback

- mno grid management , buildings at start , reps at end,
- grid is too big
- gord os worthless at the end, no purpose

- gameplay is dull, you only build and recharge, but no mini games
- no action, no management

- game look like extraction
- you only recharge without purpose

1. Make grid more compact ? maybe introduce some dependencies (aka micro strategy)
2. How make some action? building/player related?
3. visible money accumulation (aka sushiswap)


## todo

- upgrade lvl error 
- I dont think Charge REP Forges (input wiht amount of buldings) charges correctly

## todo

- we need to repkaece tier 3
 - - rep r\leaderboard
 - -  merne yield  nfts
 - - arcanum of names actually add something to image

 - hide qol, we probably need finish prod time to make this correctly (sonic amount)

## todo

1 do we need arcanum ? We mostly dont need ANY of tier 3 buidlings, exxcept maybe decrease time but no
- do we need teir 4 buildings ?
2. How revenue hub will look like. It should be similar to other 2
3. Main goad - SHOW POSSIBLE REV
- teir 1. stake - receive anyhting ? no, but we have calculator 
- teir 2. stake more - receive anything ?
- max number of buildings per player that can  be minterd
- impllment charge per SONIC(amount ot donat), plus allow sime time boost based on amount of sonic charged
- new revenue building altar on the right, you can also stake there
- replace now not needed district buildings like converters, with leaderboards and so on , check history
- how upgrades to grid works?
- Cycle is complete when I claim SONIC

## todo

- merge main
- esc exit building
- protect disctrict buidling url if no building
- leaderboard   

## todo

- MINIMAL PRROF OF CYCLE
1. [x] houses 
2. [x] farms + farms buildings
3. [x] get rep
4. check other player UI
5. [x] recieve diamonds
6. [ ] build rep -> stake rep -> get nft
7. PROFIT  (FOR LATER) (nft is probably some kind of a house ?? -> so by staking it at altar we can potentionally receive profits??)
9. ALTAR is where you stake NFT, not MINT

where profit comes from ? GOLOSSARY PAGE ? We have n in treasury lets vote. Either make buildings damaging with a change to get s, or stake reps to get revue (simple contract - upload n funds - distribute to stakers)

## todo

later maybe it makes sense to remove altar and build dirreclty in hub. build instead of stake

## grid hub

0. global status - building slots / max slots

1. progress bar  - 100 / 1000 / 10000 (s)

tabs



1. status - resources for current tier

2. buldings for tier, houses count, at cap, damg?

3. buildings:

Level:
1 / 5
Production Rate:
10/hour
Last Collection:
49m ago
Claimable:
240

 stake - unstake / collect / upgrade / recharge 



## todo

- it would be asweome that hero acquire exp, skills, etc and can be traded. But proably making it tooo complex. Lets tick to proto
- remove global styles imports


## facts

1. minting nft is FREE
2. nft can be upgraded, affects rarity. Evolving nfts
3. we take small fee for recarge, to distribute later
4. shop only cosmetic items

## todo

- input / racharge
- middle tunnel - nft , upgrade -> affects rarity (wow) sh!!!!!!!!t
- output


## todo

- shop -> recharge station (tests)
- adventure -> place adventure starts 24 h -> random relics drops -> recahrge
- tier 3 conversion ?

## todo

- cleanup ui / refactor
- move city view
- make tier 1,2,3
- release on test net
- find investment based on fun and visual attraction, but make most of the features locked

## buldings

1:
- shop
- workshop
- outpost
- defense tower

2:
- barracks
- ganizon (not w)
- scout tower
- command center

3:
- tavern (not w)
- adventure camp (not w)
- mage tower / relics building? (NOT W)
- tactics center (not w)

4:
- unlocks gems (not w)
- unlocks diamonds (not w)
- unlocks hft
- forgery upgrades refinery time (not w)

5: city governance
6: mega buidlings
7: seasons


## 3d

- bldnder -> game
- fix ui
- economy blaance fun <-> earn

## plan

- blender?
- or geometry with textures?
- or what? gui?

## mountains

-  Create a simple 3D mesh (in Blender or with code) shaped like the mountain range, with a hand-painted or gradient texture.
-  Combine a 3D mesh for the closest mountains with a background image for the farthest peaks.

Base Layer: Painted transparent mountain texture on planes (Option 1)

Middle Layer: Simple flat shaded low-poly mountain geometry (Option 2)

## todo

- tier 2 tawern (not w), dunggeons - adv camp (not w), quests? magic scrolls, tactics c (working)
- garnizon tier 1
- 3 set of maps

- new diamon resource

## music

https://www.fab.com/listings/29645efb-1b5a-467a-82eb-3321df823e58


- check units dissovled, we need harnizon, or upgrade twoer?
- house production does nto stop afte 24h
- wallet change - access page - refactor?
+ price for starting battle/deploy?
+ caravan -> command center
- other player, what to do?
- lazy model loading
- Implement a scouting report system that gives partial information about potential opponents

- Watchtower
- Slot Vault

- stkae houses 
- do you pay dor city buildings?
- other options for shop?


+ decouple mint status page from staking page and reuse
+ shit with main wrapper, becuse of columns on stake page
- decouple connect wallet and other button styles. Organize in single place like buttons
- put wallet from pages on top
-gamestate is too BIG


- check staking page design, what happend to status message?

- PLayer can join any city wo nFTS



export GAME_STATE_ADDRESS="0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82"
export SONICITY_NFT_ADDRESS="0xa513E6E4b8f2a923D98304ec87F64353C4D5C853"

1. What to do with city treasureis? Maybe destribute a little, or use it for funding? Or decide with governance. Something in late game, I think great buidlings, should distribute income from it. Another great building allows spends of the gold with 51% govern
2. why do external players buy gold? And more impotatnly how they receiev it through marketplace? I think most common way to get it directly to play and she can choose to spend on homes, homes upgrades, contrbute ,lottery and so on


0. everyhting goes through citadel, all upgrades new treew is avlialbe in citadel
1. Why buy gold, be it seaprately or staked?
2. All money goes to treasury eather directly through citadel or player choose what to subsudice, but money either way goes to treasury.


1. Why buy gold ext
2. How to progress city buildings? And what to do with treasury?



So ho de we do with nft creators bribes? Maybe just temporal buffs?
And what to do with seasons? Maybe just simple Bank goal?

Temp buildings buffs? This probably should be bribed nobody would pay to get tempral buffs

Permanent buldings, bribery and bank

bribery 100k, bank 500k

Also at what point should buildings d? We want to give gold only to active players? It should not be possible to sit on gold

Possbile Town Hall upgrades:
 
1) Allow home upgrades
2) Increase max supply of homes

THere should be clear distinction between city wide buidings

City wide:

1) treasury, allows to get gold from outside with limits and possible burns. Better go to treasury and burn
2) Town hall allows expansion
3) Barraks allows wars (you can buy units and send them to arena)
4) Diplomacy allow negotiontions with other cities with rep points (governance)
5) Bank allow trading
and local buildings:
1) home +1 gold
2) water supply allow more home to be built
3) windmail allow more golmes to be built
4) factory allow more holdmes to be built


Possible buff temp buidlings:

1) increase of gold production for all homes
2) Lp Rep points increase
3) NFT drops? possible need to think this through, might be town hall upgrade
4) + defence from unexpected events