# Heroes & Tactics Implementation Plan - Simplified System

## Overview

This document outlines the implementation plan for a **simplified Heroes and Tactics system** designed for maximum strategic depth with minimal complexity. The system features 3 heroes, 9 tactics cards, and a single-round rock-paper-scissors mechanic.

## 🎯 System Design

### **Core Philosophy:**
- **Heroes**: Troop boosters (not RPS against each other)
- **Tactics**: Rock-paper-scissors system (STRIKE > SHIELD > TRICK > STRIKE)
- **3 Tactics per Battle**: Players deploy up to 3 tactics, RPS calculated per round
- **Simple but Strategic**: Easy to understand, hard to master

## 1. Hero System

### 1.1 Hero Classes (3 Fixed Templates)

| Hero ID | Name | Class | Troop Bonus | Cost |
|---------|------|-------|-------------|------|
| **1** | **Iron Guardian** | WARRIOR | +20 power per Infantry | 1500 Gold + 1000 Food + 40 Diamonds |
| **2** | **Shadow Tactician** | STRATEGIST | +20 power per Siege | 1200 Gold + 1200 Food + 35 Diamonds |
| **3** | **Swift Scout** | SCOUT | +20 power per Cavalry | 1000 Gold + 1000 Food + 30 Diamonds |

### 1.2 Hero Mechanics

**Creation:**
- **Fixed Templates**: Players choose from 3 predefined heroes
- **Cost**: Varies by hero (see table above)
- **No Limit**: Players can buy any hero or all heroes (but only once each)
- **Deployment Limit**: Only 1 hero can be deployed per battle
- **No Random Stats**: Fixed bonuses based on template

**Battle Integration:**
- **Optional Deployment**: Players can choose to deploy 1 hero in battle (or none)
- **Troop Bonus**: Hero provides +20 power per specific troop type
- **No RPS**: Heroes don't compete against each other

### 1.3 Hero Contract Structure

```solidity
contract HeroNFT is ERC721Upgradeable {
    struct Hero {
        string name;
        HeroClass class;
        uint8 troopBonus;  // +20 power per troop type
        bool isDeployed;
    }
    
    enum HeroClass { WARRIOR, STRATEGIST, SCOUT }
    
    // 3 Fixed Templates
    mapping(HeroClass => Hero) public heroTemplates;
    
    function mintHero(HeroClass class) external {
        require(!hasHero(msg.sender, class), "Already have this hero");
        require(hasResources(msg.sender, class), "Insufficient resources");
        
        uint256 heroId = _tokenIdCounter++;
        _mint(msg.sender, heroId);
        
        heroes[heroId] = heroTemplates[class];
        deductResources(msg.sender, class);
    }
}
```

## 2. Tactics System

### 2.1 Tactics Matrix (9 Cards)

| Card ID | Name | Type | Effect | Cost |
|---------|------|------|--------|------|
| **1** | **Iron Strike** | STRIKE | +3 buildings damaged | 800 Gold + 8 Diamonds |
| **2** | **Guardian Wall** | SHIELD | Lose 75% fewer troops | 800 Gold + 8 Diamonds |
| **3** | **Battle Rage** | TRICK | +30 REP points | 800 Gold + 8 Diamonds |
| **4** | **Cavalry Rush** | STRIKE | +2 buildings damaged | 800 Gold + 8 Diamonds |
| **5** | **Defensive Circle** | SHIELD | Lose 50% fewer troops | 800 Gold + 8 Diamonds |
| **6** | **Tactical Feint** | TRICK | +20 REP points | 800 Gold + 8 Diamonds |
| **7** | **Swift Strike** | STRIKE | +1 building damaged | 800 Gold + 8 Diamonds |
| **8** | **Shadow Guard** | SHIELD | Lose 25% fewer troops | 800 Gold + 8 Diamonds |
| **9** | **Stealth Trap** | TRICK | +15 REP points | 800 Gold + 8 Diamonds |

### 2.2 RPS Mechanics

**Rock-Paper-Scissors Rules:**
- **STRIKE beats SHIELD**: +30% power multiplier
- **SHIELD beats TRICK**: +30% power multiplier  
- **TRICK beats STRIKE**: +30% power multiplier
- **Same type or losing matchup**: No bonus (100% power)

**3 Tactics per Battle:**
- Players deploy up to 3 tactics before battle
- Each tactic is used in a different "round" during battle resolution
- RPS is calculated for each round independently
- Total power = Sum of all 3 rounds with RPS bonuses

### 2.3 Tactics Contract Structure

```solidity
contract TacticsNFT is ERC1155Upgradeable {
    struct Tactic {
        uint8 tacticId;
        string name;
        TacticType tacticType;
        HeroClass heroClass;
        uint8 powerMultiplier;  // 130 for winning RPS, 100 for losing
        uint256 cost;
    }
    
    enum TacticType { STRIKE, SHIELD, TRICK }
    
    // 9 Fixed Tactics
    mapping(uint8 => Tactic) public tactics;
    
    function mintTactic(uint8 tacticId) external {
        require(tacticId >= 1 && tacticId <= 9, "Invalid tactic ID");
        require(balanceOf(msg.sender, tacticId) == 0, "Already have this tactic");
        require(hasResources(msg.sender, tacticId), "Insufficient resources");
        
        _mint(msg.sender, tacticId, 1, "");
        deductResources(msg.sender, tacticId);
    }
}
```

## 3. Battle System Integration

### 3.1 Updated Battle Structure

```solidity
struct Battle {
    // ... existing fields ...
    uint256 attackerHeroId;    // 0 if no hero deployed
    uint256 defenderHeroId;    // 0 if no hero deployed
    uint8[3] attackerTactics;  // [tacticId1, tacticId2, tacticId3] - up to 3 tactics
    uint8[3] defenderTactics;  // [tacticId1, tacticId2, tacticId3] - up to 3 tactics
}
```

### 3.2 Battle Flow

**Pre-Battle:**
1. Attacker deploys troops (existing)
2. Attacker optionally deploys 1 hero (or none)
3. Attacker selects 0, 1, 2, or 3 tactics from owned tactics (optional)
4. Defender gets notified (via Outpost if built)
5. Defender optionally deploys 1 hero and 0-3 tactics (requires Garrison)
6. Battle starts

**Battle Resolution:**
1. Calculate base power for both sides
2. Add hero bonuses (if deployed)
3. Calculate 3 rounds: each round applies RPS multiplier based on tactics
4. Sum total power from all 3 rounds
5. Compare final power to determine winner
6. **If attacker wins**: Select ONE random effect from winning tactics and apply it

### 3.3 Power Calculation

```solidity
function calculateBattlePower(
    uint256 infantryCount,
    uint256 cavalryCount,
    uint256 siegeCount,
    uint256 heroId,
    uint8[3] memory tactics
) internal view returns (uint256) {
    
    // Base troop power
    uint256 basePower = (
        infantryCount * troopConfigs[TroopType.INFANTRY].power +
        cavalryCount * troopConfigs[TroopType.CAVALRY].power +
        siegeCount * troopConfigs[TroopType.SIEGE].power
    );
    
    // Hero bonus (if deployed)
    if (heroId > 0) {
        Hero memory hero = heroNFT.getHero(heroId);
        if (hero.class == HeroClass.WARRIOR) {
            basePower += infantryCount * 20;
        } else if (hero.class == HeroClass.STRATEGIST) {
            basePower += siegeCount * 20;
        } else if (hero.class == HeroClass.SCOUT) {
            basePower += cavalryCount * 20;
        }
    }
    
    // Calculate 3 rounds with RPS
    uint256 totalPower = 0;
    for (uint8 round = 0; round < 3; round++) {
        uint256 roundPower = basePower / 3; // Divide base power across 3 rounds
        if (tactics[round] > 0) {
            roundPower = applyRPSMultiplier(roundPower, tactics[round], opponentTactics[round]);
        }
        totalPower += roundPower;
    }
    
    return totalPower;
}
```

### 3.4 RPS Multiplier

```solidity
function getRPSMultiplier(uint8 attackerTactic, uint8 defenderTactic) internal view returns (uint256) {
    Tactic memory attTactic = tacticsNFT.getTactic(attackerTactic);
    Tactic memory defTactic = tacticsNFT.getTactic(defenderTactic);
    
    // STRIKE beats SHIELD
    if (attTactic.tacticType == TacticType.STRIKE && defTactic.tacticType == TacticType.SHIELD) {
        return 130; // +30% power
    }
    
    // SHIELD beats TRICK
    if (attTactic.tacticType == TacticType.SHIELD && defTactic.tacticType == TacticType.TRICK) {
        return 130; // +30% power
    }
    
    // TRICK beats STRIKE
    if (attTactic.tacticType == TacticType.TRICK && defTactic.tacticType == TacticType.STRIKE) {
        return 130; // +30% power
    }
    
    return 100; // No bonus
}
```

### 3.5 RPS Multiplier Example

**Battle Example:**
```
Attacker: 100 base power + WARRIOR hero + [Iron Strike, Guardian Wall, Battle Rage]
Defender: 80 base power + SCOUT hero + [Swift Strike, Shadow Guard, Stealth Trap]

Round 1: Iron Strike (STRIKE) vs Swift Strike (STRIKE)
- Both STRIKE = No RPS bonus
- Attacker: 33.3 power × 100% = 33.3 power
- Defender: 26.7 power × 100% = 26.7 power

Round 2: Guardian Wall (SHIELD) vs Shadow Guard (SHIELD)  
- Both SHIELD = No RPS bonus
- Attacker: 33.3 power × 100% = 33.3 power
- Defender: 26.7 power × 100% = 26.7 power

Round 3: Battle Rage (TRICK) vs Stealth Trap (TRICK)
- Both TRICK = No RPS bonus
- Attacker: 33.3 power × 100% = 33.3 power
- Defender: 26.7 power × 100% = 26.7 power

Total Power:
- Attacker: 33.3 + 33.3 + 33.3 = 100 power
- Defender: 26.7 + 26.7 + 26.7 = 80 power
- Result: Attacker wins (100 > 80)

**RPS Advantage Example:**
```
Attacker: [Iron Strike, Guardian Wall, Battle Rage]
Defender: [Swift Strike, Stealth Trap, Shadow Guard]

Round 1: Iron Strike (STRIKE) vs Swift Strike (STRIKE) = No bonus
Round 2: Guardian Wall (SHIELD) vs Stealth Trap (TRICK) = SHIELD beats TRICK = +30%
Round 3: Battle Rage (TRICK) vs Shadow Guard (SHIELD) = TRICK beats SHIELD = +30%

Total Power:
- Attacker: 33.3 + (33.3 × 130%) + (33.3 × 130%) = 33.3 + 43.3 + 43.3 = 120 power
- Defender: 26.7 + 26.7 + 26.7 = 80 power
- Result: Attacker wins with RPS advantage (120 > 80)
```

## 4. Battle Effects System

### 4.1 Effect Categories

**Effects work for both attacker and defender wins:**

#### **When Attacker Wins:**
- **STRIKE**: Damage defender's buildings (+3, +2, or +1)
- **SHIELD**: Attacker loses fewer troops (75%, 50%, or 25% reduction)
- **TRICK**: Attacker gets REP points (+30, +20, or +15)

#### **When Defender Wins:**
- **STRIKE**: Counter-attack (damage attacker's buildings +3, +2, or +1)
- **SHIELD**: Defender loses fewer troops (75%, 50%, or 25% reduction)
- **TRICK**: Defender gets REP points (+30, +20, or +15)

#### **STRIKE Effects (Damage Focus):**
- **Iron Strike**: +3 buildings damaged (strongest)
- **Cavalry Rush**: +2 buildings damaged (medium)
- **Swift Strike**: +1 building damaged (lightest)

#### **SHIELD Effects (Troop Protection):**
- **Guardian Wall**: Lose 75% fewer troops (strongest protection)
- **Defensive Circle**: Lose 50% fewer troops (medium protection)
- **Shadow Guard**: Lose 25% fewer troops (light protection)

#### **TRICK Effects (REP Bonus):**
- **Battle Rage**: +30 REP points (strongest bonus)
- **Tactical Feint**: +20 REP points (medium bonus)
- **Stealth Trap**: +15 REP points (light bonus)

### 4.2 Effect Selection

```solidity
function selectRandomEffect(uint8[3] memory winningTactics, bool isAttackerWinner) internal view returns (BattleEffect memory) {
    // Count winning tactics by type
    uint8 strikeCount = 0;
    uint8 shieldCount = 0;
    uint8 trickCount = 0;
    
    for (uint8 i = 0; i < 3; i++) {
        if (winningTactics[i] > 0) {
            Tactic memory tactic = tacticsNFT.getTactic(winningTactics[i]);
            if (tactic.tacticType == TacticType.STRIKE) strikeCount++;
            else if (tactic.tacticType == TacticType.SHIELD) shieldCount++;
            else if (tactic.tacticType == TacticType.TRICK) trickCount++;
        }
    }
    
    // Randomly select effect type based on winning tactics
    uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % 100;
    
    if (strikeCount > 0 && random < 33) {
        return selectStrikeEffect(isAttackerWinner);
    } else if (shieldCount > 0 && random < 66) {
        return selectShieldEffect(isAttackerWinner);
    } else if (trickCount > 0) {
        return selectTrickEffect(isAttackerWinner);
    }
    
    // Default to strike effect if no winning tactics
    return selectStrikeEffect(isAttackerWinner);
}
```

### 4.3 Effect Implementation

```solidity
struct BattleEffect {
    EffectType effectType;
    uint256 magnitude;  // Amount of damage/bonus
    address target;     // Target building or resource
    uint256 duration;   // Duration for temporary effects
}

enum EffectType { 
    STRIKE_DAMAGE,      // Damage buildings (+3, +2, +1)
    SHIELD_PROTECTION,  // Protect troops (75%, 50%, 25% reduction)
    TRICK_REP_BONUS     // REP points (+30, +20, +15)
}

function selectStrikeEffect(bool isAttackerWinner) internal view returns (BattleEffect memory) {
    // Randomly select which STRIKE tactic won
    uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % 3;
    
    if (random == 0) {
        return BattleEffect(EffectType.STRIKE_DAMAGE, 3, isAttackerWinner ? defender : attacker, 0);
    } else if (random == 1) {
        return BattleEffect(EffectType.STRIKE_DAMAGE, 2, isAttackerWinner ? defender : attacker, 0);
    } else {
        return BattleEffect(EffectType.STRIKE_DAMAGE, 1, isAttackerWinner ? defender : attacker, 0);
    }
}

function selectShieldEffect(bool isAttackerWinner) internal view returns (BattleEffect memory) {
    // Randomly select which SHIELD tactic won
    uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % 3;
    
    if (random == 0) {
        return BattleEffect(EffectType.SHIELD_PROTECTION, 75, isAttackerWinner ? attacker : defender, 0);
    } else if (random == 1) {
        return BattleEffect(EffectType.SHIELD_PROTECTION, 50, isAttackerWinner ? attacker : defender, 0);
    } else {
        return BattleEffect(EffectType.SHIELD_PROTECTION, 25, isAttackerWinner ? attacker : defender, 0);
    }
}

function selectTrickEffect(bool isAttackerWinner) internal view returns (BattleEffect memory) {
    // Randomly select which TRICK tactic won
    uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % 3;
    
    if (random == 0) {
        return BattleEffect(EffectType.TRICK_REP_BONUS, 30, isAttackerWinner ? attacker : defender, 0);
    } else if (random == 1) {
        return BattleEffect(EffectType.TRICK_REP_BONUS, 20, isAttackerWinner ? attacker : defender, 0);
    } else {
        return BattleEffect(EffectType.TRICK_REP_BONUS, 15, isAttackerWinner ? attacker : defender, 0);
    }
}

function applyBattleEffect(BattleEffect memory effect, address attacker, address defender) internal {
    if (effect.effectType == EffectType.STRIKE_DAMAGE) {
        damageGridBuildings(effect.target, effect.magnitude);
    } else if (effect.effectType == EffectType.SHIELD_PROTECTION) {
        applyTroopProtection(effect.target, effect.magnitude);
    } else if (effect.effectType == EffectType.TRICK_REP_BONUS) {
        awardRepPoints(effect.target, effect.magnitude);
    }
}
```

### 4.4 Battle Effects Example

**Example Battle with Effects:**
```
Attacker: WARRIOR + [Iron Strike, Guardian Wall, Battle Rage]
Defender: SCOUT + [Swift Strike, Stealth Trap, Shadow Guard]

Battle Result: Attacker wins with RPS advantage

Winning Tactics Analysis:
- Iron Strike (STRIKE): Won vs Swift Strike
- Guardian Wall (SHIELD): Won vs Stealth Trap  
- Battle Rage (TRICK): Won vs Shadow Guard

Effect Selection:
- STRIKE count: 1
- SHIELD count: 1  
- TRICK count: 1

Random Selection (33% chance each):
- 33% chance: STRIKE effect (+3, +2, or +1 buildings damaged)
- 33% chance: SHIELD effect (75%, 50%, or 25% fewer troops lost)
- 33% chance: TRICK effect (+30, +20, or +15 REP points)

Example: Random selects STRIKE effect
Result: Attacker gets "Iron Strike" - +3 additional buildings damaged
```

## 4. Implementation Phases

### Phase 1: Hero System Foundation (2-3 days)
1. **Create HeroNFT contract** with 3 fixed templates
2. **Implement hero minting** (1 per player, template selection)
3. **Add hero deployment to battles**
4. **Integrate hero bonuses into power calculation**
5. **Add resource cost validation**

### Phase 2: Tactics System Foundation (2-3 days)
1. **Create TacticsNFT contract** with 9 predefined tactics
2. **Implement tactics minting** (max 5 per player)
3. **Add tactics deployment to battles**
4. **Implement RPS multiplier logic**
5. **Add resource cost validation**

### Phase 3: Battle System Integration (2-3 days)
1. **Update Battle struct** to include hero and tactic fields
2. **Modify startBattle function** to accept hero and tactic
3. **Update power calculation** to include hero bonuses
4. **Implement RPS multiplier** in battle resolution
5. **Update battle effects** to consider tactics

### Phase 4: Testing & Polish (2-3 days)
1. **Unit tests** for hero and tactic systems
2. **Integration tests** for battle system
3. **Edge case testing** (no hero/tactic, invalid deployments)
4. **Gas optimization**
5. **Frontend integration preparation**

## 5. Contract Integration Points

### 5.1 BattleSystem.sol Updates

**New Functions:**
```solidity
function startBattleWithHeroAndTactics(
    uint256 infantryCount,
    uint256 cavalryCount,
    uint256 siegeCount,
    uint256 heroId,        // 0 for no hero
    uint8[3] memory tactics // [tacticId1, tacticId2, tacticId3] - up to 3 tactics
) external;

function calculatePowerWithHero(
    uint256 infantryCount,
    uint256 cavalryCount,
    uint256 siegeCount,
    uint256 heroId
) internal view returns (uint256);

function applyRPSMultiplier(
    uint256 power,
    uint8 attackerTactic,
    uint8 defenderTactic
) internal view returns (uint256);

function calculateTotalPowerWithTactics(
    uint256 basePower,
    uint8[3] memory attackerTactics,
    uint8[3] memory defenderTactics
) internal view returns (uint256);
```

**Updated Functions:**
```solidity
function resolveBattle(address battleId) external {
    // ... existing logic ...
    
    // Calculate power with hero bonuses
    uint256 attackerPower = calculatePowerWithHero(
        battle.deployedInfantry,
        battle.deployedCavalry,
        battle.deployedSiege,
        battle.attackerHeroId
    );
    
    // Calculate total power with 3-round tactics
    uint256 finalAttackerPower = calculateTotalPowerWithTactics(
        attackerPower,
        battle.attackerTactics,
        battle.defenderTactics
    );
    
    // Determine winner and apply effects
    bool attackerWon = finalAttackerPower > defenderPower;
    if (attackerWon) {
        // Select ONE random effect from attacker's winning tactics
        BattleEffect memory effect = selectRandomEffect(battle.attackerTactics, true);
        applyBattleEffect(effect, battle.attacker, battle.defender);
    } else {
        // Defender wins - select ONE random effect from defender's winning tactics
        BattleEffect memory effect = selectRandomEffect(battle.defenderTactics, false);
        applyBattleEffect(effect, battle.defender, battle.attacker);
    }
}
```

### 5.2 GameState.sol Integration

**New Resource Costs:**
- Hero minting: Gold + Food + Diamonds (varies by hero)
- Tactics purchase: Gold + Diamonds (fixed cost)
- Battle deployment: Optional hero and tactic deployment

## 6. Testing Strategy

### 6.1 Unit Tests
- Hero minting and ownership validation
- Tactics minting and purchase limits
- Hero power calculation with different troop compositions
- RPS multiplier calculation for all combinations
- Resource cost validation

### 6.2 Integration Tests
- Hero deployment in battles
- Tactic selection and RPS application
- Combined hero + tactic power calculation
- Battle resolution with hero and tactic effects
- Resource deduction validation

### 6.3 Edge Cases
- Players without heroes/tactics
- Invalid tactic selections
- Hero deployment limits
- Battle timeout scenarios
- Resource insufficiency

## 7. Frontend Considerations

### 7.1 Hero Management
- Hero template selection interface
- Hero stats display (troop bonus)
- Deployment selection
- Cost display and validation

### 7.2 Tactics Management
- Tactics shop interface (3x3 grid)
- Tactics collection display
- Battle deployment selection
- RPS explanation and visual feedback

### 7.3 Battle Interface
- Enhanced battle results display
- Hero and tactic effects shown
- RPS outcome explanation
- Power calculation breakdown

## 8. Economic Balance

### 8.1 Resource Costs
- **Hero Creation**: 1000-1500 Gold + Food + Diamonds
- **Tactics Purchase**: 800 Gold + 8 Diamonds (all tactics)
- **Battle Deployment**: Optional costs

### 8.2 Strategic Value
- **Heroes**: Provide consistent troop bonuses
- **Tactics**: Provide situational RPS advantages
- **Combination**: Synergistic effects for invested players

### 8.3 Accessibility
- **Core Battles**: Work perfectly without heroes/tactics
- **Optional Enhancement**: Provides advantages but not required
- **Progressive Investment**: Players can invest gradually

## 9. Technical Specifications

### 9.1 Contract Dependencies
- **HeroNFT**: Depends on ERC721Upgradeable, GameState
- **TacticsNFT**: Depends on ERC1155Upgradeable, GameState
- **BattleSystem**: Enhanced with hero/tactics integration

### 9.2 Gas Optimization
- **Hero Storage**: Efficient struct packing
- **Tactics Storage**: ERC1155 for multiple tactics
- **Battle Resolution**: Optimized single-round calculation

### 9.3 Security Considerations
- **Ownership Validation**: Ensure players own heroes/tactics
- **Resource Validation**: Verify sufficient resources for purchases
- **Battle State Integrity**: Prevent manipulation of battle results

## 10. Future Enhancements

### 10.1 Multi-Round Battles
- **3-round system**: Each round with different tactic
- **Best of 3**: Winner determined by round victories
- **Special effects**: Based on winning tactics

### 10.2 Hero Evolution
- **Experience system**: XP gain from battles
- **Leveling**: Stat improvements over time
- **Special abilities**: Unlock unique powers

### 10.3 Advanced Tactics
- **Rarity tiers**: Common, Rare, Epic, Legendary
- **Tactic combinations**: Synergistic effects
- **Limited edition tactics**: Seasonal releases

## 11. Implementation Timeline

### Week 1: Foundation
- **Days 1-2**: HeroNFT contract development
- **Days 3-4**: TacticsNFT contract development
- **Day 5**: Basic integration testing

### Week 2: Integration
- **Days 1-2**: BattleSystem integration
- **Days 3-4**: Comprehensive testing
- **Day 5**: Bug fixes and optimization

### Week 3: Polish
- **Days 1-2**: Frontend integration
- **Days 3-4**: User testing and feedback
- **Day 5**: Final deployment preparation

**Total Implementation Time: 15 days**

## 12. Finalized System Summary

### **Heroes (3 Fixed Templates):**
- **WARRIOR**: Boosts Infantry power (+20 per troop)
- **STRATEGIST**: Boosts Siege power (+20 per troop)
- **SCOUT**: Boosts Cavalry power (+20 per troop)

### **Tactics (9 Unique Cards):**
- **STRIKE**: Damage buildings (+3, +2, +1 variations)
- **SHIELD**: Protect troops (75%, 50%, 25% reduction variations)
- **TRICK**: REP bonuses (+30, +20, +15 variations)

### **Battle System:**
- **3 rounds** with RPS mechanics
- **Heroes boost troops** (independent of tactics)
- **Tactics provide effects** (independent of heroes)
- **Effects work for both sides** (attacker/defender wins)
- **Optional deployment** (0-1 hero, 0-3 tactics per battle)
- **No collection limits** (can own all heroes and tactics)

### **Key Features:**
- ✅ **Simple but strategic** - easy to understand, hard to master
- ✅ **Balanced effects** - works for both attacker and defender
- ✅ **Independent systems** - heroes and tactics don't correlate
- ✅ **Revenue focused** - grid building damage affects profits
- ✅ **Garrison integration** - defenders can deploy troops/tactics/heroes

---

This implementation plan provides a solid foundation for adding strategic depth to the battle system while maintaining simplicity and accessibility. The system offers tactical depth without overwhelming complexity, making it perfect for a prototype that can be enhanced over time. 