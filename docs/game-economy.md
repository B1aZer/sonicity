# Sonicity Game Economy Documentation

## Overview
Sonicity is a blockchain-based city-building game with a complex resource economy involving multiple currencies, buildings, and conversion mechanics.

## Resources

### Primary Resources
- **Gold**: Basic currency, produced by Houses (grid buildings)
- **Food**: Produced by Farms (grid buildings), used for troops
- **Reputation (Rep)**: Earned through PvP and donations, used for conversions and NFTs

### Premium Resources
- **Diamonds**: Premium currency for district/grid upgrades, converted from Gold
- **Gems**: Native ERC20 token, unique utility token
- **Dynamic NFTs**: Premium governance tokens, converted from Reputation via Arcanum of Names (Tier 3)
  - **Format**: SVG-based dynamic NFTs
  - **Purpose**: Governance tokens for future DAO system
  - **Utility**: Voting rights, governance participation, community decision-making

## Building Tiers & Structure

### Tier 0 (Starting Tier)
**Grid Buildings:**
- **House**: Produces Gold (10/hour, 24h cap)

**District Buildings:**
- **City Hall**: Core building (always available)
- **Altar**: Core building (always available)
- **Mine**: Core building (always available)
- **Shop**: Unlock cost 100, Build cost 50
- **Workshop**: Unlock cost 400, Build cost 150 (repairs buildings)
- **Outpost**: Unlock cost 300, Build cost 120
- **Defense Tower**: Unlock cost 800, Build cost 200

### Tier 1
**Grid Buildings:**
- **Farm**: Produces Food (5/hour, 24h cap)

**District Buildings:**
- **Barracks**: Unlock cost 1000, Build cost 250 (train troops)
- **Scout Guild**: Unlock cost 1500, Build cost 200 (explore PvP targets)
- **Command Center**: Unlock cost 1750, Build cost 250 (deploy troops for raids)
- **Garrison**: Unlock cost 2000, Build cost 300 (stake troops to defend) - DISABLED

### Tier 2
**Grid Buildings:**
- **Portal/dungeon/map**: Stake map hero to traverse, clsim relics

**District Buildings:**
- **Tavern**: Unlock cost 3000, Build cost 200 (hire heroes) - DISABLED
- **Adventure Camp**: Unlock cost 3500, Build cost 300 (start adventures) - DISABLED
- **Mage Tower**: Unlock cost 4000, Build cost 250 (explore relics) - DISABLED
- **Tactics Center**: Unlock cost 4500, Build cost 300 (learn new tactics) - DISABLED

### Tier 3
**Grid Buildings:**
- **Conversion Building**: Planned - converts Gold to Diamonds (100 gold → 1 diamond over 48h)

**District Buildings:**
- **Gem Workshop**: Unlock cost 5000, Build cost 400 (Food to Gems) - DISABLED
- **Diamond Vault**: Unlock cost 6000, Build cost 350 (Gold to Diamonds) - DISABLED
- **Arcanum of Names**: Unlock cost 7000, Build cost 450 (Convert Rep to Dynamic NFTs) - ENABLED
- **Refinery**: Unlock cost 8000, Build cost 500 (Improve processing speed) - DISABLED

### Tier 4
**Grid Buildings:**
- **Nftstation**: Revenue sharing

**District Buildings:**
- **Council Hall**: Unlock cost 10000, Build cost 600 (advanced governance) - DISABLED
- **Fortress Walls**: Unlock cost 12000, Build cost 700 (defense bonuses) - DISABLED
- **Embassy Home**: Unlock cost 15000, Build cost 800 (alliance management) - DISABLED
- **Treasury Vault**: Unlock cost 20000, Build cost 1000 (holds game revenue) - DISABLED

## Production Mechanics

### Grid Building Production
- **24-Hour Cap**: All grid buildings stop producing after 24 hours
- **Manual Collection**: Players must manually collect resources
- **Production Reset**: Two-tier system to restart production after 24h cap

### Production Reset System

#### Free Reset (NFT Staking/Unstaking)
- **Trigger**: Building reaches 24-hour production cap
- **Action**: Player unstakes and re-stakes the NFT at the Altar
- **Cost**: FREE (gas fees only)
- **Result**: Production timer resets, building starts producing again
- **Note**: This acts as a natural free reset mechanism

#### Premium Reset (Immediate with SONIC Fee)
- **Trigger**: Building reaches 24-hour production cap
- **Wait Time**: Immediate (skip NFT unstaking process)
- **Cost**: Small fee in native SONIC tokens
- **Fee Destination**: Goes to treasury for city development
- **Result**: Production timer resets immediately

### Production Rates
- **House**: 10 gold/hour × building level
- **Farm**: 5 food/hour × building level
- **Rep Station**: 2 rep/hour × building level

### Reset Cost Examples
- **Premium Reset Fee**: Small SONIC token amount (TBD)
- **Free Reset**: Gas fees for unstaking/re-staking NFT
- **Note**: Exact SONIC fee amounts to be determined based on economic balance

## Conversion Mechanics (Tier 2 Pattern)

### Gold to Diamonds Conversion
- **District Building**: Diamond Vault (stake Gold)
- **Grid Building**: Conversion Building (claim Diamonds)
- **Rate**: 100 Gold → 1 Diamond
- **Duration**: 48 hours per conversion
- **Cap**: Each building can handle one conversion at a time

### Reputation to Dynamic NFTs Conversion
- **District Building**: Arcanum of Names (convert Rep to NFTs)
- **Format**: SVG-based dynamic NFTs
- **Purpose**: Governance tokens for future DAO system
- **Utility**: Voting rights, community decision-making
- **Conversion Rate**: TBD (likely based on Rep amount and rarity)

### Resource Flow Pattern
1. **Stake**: Player stakes resources in district building
2. **Wait**: Time passes (12h for resets, 48h for diamonds)
3. **Claim**: Player claims result in grid building

## Resource Flow

### Gold Flow
1. **Production**: Houses produce Gold
2. **Collection**: Manual collection every 24h max
3. **Usage**: 
   - Building construction/upgrades
   - Treasury donations (for tier progression)
   - Staking in Diamond Vault (for diamond conversion)

### Food Flow
1. **Production**: Farms produce Food
2. **Collection**: Manual collection every 24h max
3. **Usage**:
   - Troop maintenance
   - Conversion to Gems (when enabled)

### Reputation Flow
1. **Earning**: PvP battles, gold donations
2. **Production**: Rep Stations (Tier 3)
3. **Usage**:
   - Conversion to Dynamic NFTs (Arcanum of Names)
   - Future governance participation

### Diamond Flow
1. **Conversion**: Gold → Diamonds (Tier 2 conversion system)
2. **Usage**: Premium upgrades for district and grid buildings

### Gem Flow
1. **Conversion**: Food → Gems (Gem Workshop, when enabled)
2. **Usage**: Special game mechanics (to be defined)

### Dynamic NFT Flow
1. **Conversion**: Reputation → Dynamic NFTs (Arcanum of Names)
2. **Usage**: Governance voting, community decisions, DAO participation
3. **Format**: SVG-based, on-chain metadata, dynamic properties

## Treasury System

### Treasury Storage
- **Location**: `playerState[player].treasury` in GameState contract
- **Source**: Gold donated via `donateGold()` function + SONIC fees from premium resets
- **Purpose**: Tier progression and city development funding

### Treasury Usage
- **Tier Progression**: Automatic when treasury reaches tier requirements
- **City Development**: Funding from SONIC reset fees
- **Battle System**: Can be burned during PvP battles

### Treasury Flow
```
Player Gold → donateGold() → Treasury → Tier Progression
Premium Reset SONIC Fees → Treasury → City Development
```

## Governance System (Future)

### Dynamic NFTs as Governance Tokens
- **Source**: Reputation points converted via Arcanum of Names
- **Format**: SVG-based dynamic NFTs with on-chain metadata
- **Purpose**: Community governance and decision-making
- **Features**: 
  - Voting rights on game proposals
  - Community treasury management
  - Feature development decisions
  - Economic balance adjustments

### Governance Mechanics
- **Voting Power**: Based on NFT rarity and quantity
- **Proposal System**: Community can submit and vote on proposals
- **Execution**: Automated execution of approved proposals
- **Transparency**: All votes and decisions on-chain

## Economic Balance

### Sinks
- **Building Construction**: Gold cost for new buildings
- **Building Upgrades**: Gold cost for level upgrades
- **Treasury Donations**: Gold sunk for tier progression
- **SONIC Reset Fees**: Native tokens used for immediate resets
- **Conversion Staking**: Resources locked in district buildings
- **Reputation Conversion**: Rep sunk for Dynamic NFTs

### Sources
- **Grid Building Production**: Continuous resource generation
- **PvP Rewards**: Reputation and potential resource rewards
- **NFT Staking**: Building slot bonuses from Altar
- **Conversion Claims**: Diamonds and production resets
- **Governance Participation**: Potential rewards for active governance
- **SONIC Reset Fees**: Revenue from premium resets

## Future Considerations

### Tier 2 Grid Buildings
- **Conversion Building**: Gold → Diamonds conversion
- Need to design staking/claiming mechanics
- Balance conversion rates and timeframes

### Disabled Buildings
- Most Tier 2+ district buildings are currently disabled
- Need to balance and enable gradually
- Consider economic impact of each building

### Dynamic NFTs
- **Arcanum of Names**: Rep → Dynamic NFT conversion
- **SVG Design**: On-chain SVG generation with dynamic properties
- **Governance Integration**: NFT-based voting system
- **Marketplace Integration**: Trading and liquidity for governance tokens
- **Rarity System**: Different NFT tiers based on Rep amount and achievements

### Governance Implementation
- **DAO Framework**: Integration with existing DAO tools
- **Voting Mechanisms**: Snapshot-style voting with NFT verification
- **Proposal System**: Community proposal submission and execution
- **Treasury Management**: Community-controlled treasury for development

## Implementation Notes

### Production Reset System
- **Free Reset**: NFT unstaking/re-staking at Altar, gas fees only
- **Premium Reset**: Immediate, uses SONIC tokens, fee goes to treasury
- **Storage**: SONIC fees collected and sent to treasury
- **Function**: `resetBuildingProduction()` in GridBuildings contract

### Dynamic NFT System
- **Conversion**: Reputation → SVG-based Dynamic NFTs
- **Storage**: On-chain SVG metadata with dynamic properties
- **Governance**: NFT-based voting and decision-making
- **Integration**: Arcanum of Names district building

### Tier 2 Conversion Pattern
- **District Building**: Handles staking and time tracking
- **Grid Building**: Handles claiming and resource distribution
- **Consistent Interface**: stake() → wait → claim()
- **Time-based**: All conversions have time requirements

### UI Requirements
- Display all resource types in UI
- Show reset cooldown timers and availability
- Indicate when buildings are at 24h cap
- Provide easy access to free and premium resets
- Show treasury gold balance and reset costs
- Display conversion rates and cooldowns
- **NFT Gallery**: Display owned Dynamic NFTs
- **Governance Interface**: Voting and proposal system
- **Reputation Tracking**: Show Rep earning and conversion options 