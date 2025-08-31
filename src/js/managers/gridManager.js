import Logger from '../utils/logger.js';

export class GridManager {
    constructor() {
        this.grid = [];
        this.cellSize = 0;
        this.totalSize = 0;
        this.tier = 0;
        this.gridDimensions = {
            0: { width: 2, height: 2 },  // 4 slots (2x2)
            1: { width: 3, height: 2 },  // 6 slots (3x2)
            2: { width: 3, height: 3 },  // 9 slots (3x3)
            3: { width: 4, height: 3 },  // 12 slots (4x3)
            4: { width: 4, height: 4 }   // 16 slots (4x4)
        };
    }

    async initialize(gameStateContract) {
        try {
            const maxSlots = await gameStateContract.getBuildingSlots();
            // Convert BigInt to Number for calculations
            const maxSlotsNumber = Number(maxSlots);
            
            // Determine tier based on number of slots
            if (maxSlotsNumber <= 4) this.tier = 0;
            else if (maxSlotsNumber <= 6) this.tier = 1;
            else if (maxSlotsNumber <= 9) this.tier = 2;
            else if (maxSlotsNumber <= 12) this.tier = 3;
            else this.tier = 4;

            const dimensions = this.gridDimensions[this.tier];
            this.totalSize = Math.max(dimensions.width, dimensions.height);
            this.cellSize = 2; // Smaller cell size to fit terrain better (was 10)
            
            // Initialize grid with null values
            this.grid = Array(dimensions.width).fill(null).map(() => Array(dimensions.height).fill(null));
            
            Logger.info('Grid initialized:', {
                tier: this.tier,
                dimensions,
                cellSize: this.cellSize,
                totalSize: this.totalSize
            });
        } catch (error) {
            Logger.error('Error initializing grid:', error);
            throw error;
        }
    }

    getGridSize() {
        return this.totalSize;
    }

    getCellSize() {
        return this.cellSize;
    }

    getTotalSize() {
        const dimensions = this.gridDimensions[this.tier];
        return {
            width: dimensions.width * this.cellSize,
            height: dimensions.height * this.cellSize
        };
    }

    isCellOccupied(x, z) {
        const dimensions = this.gridDimensions[this.tier];
        if (x < 0 || x >= dimensions.width || z < 0 || z >= dimensions.height) {
            return true; // Out of bounds is considered occupied
        }
        return this.grid[x][z] !== null;
    }

    occupyCell(x, z, building) {
        const dimensions = this.gridDimensions[this.tier];
        if (x < 0 || x >= dimensions.width || z < 0 || z >= dimensions.height) {
            Logger.error('Attempted to occupy cell outside grid bounds:', { x, z });
            return false;
        }
        this.grid[x][z] = building;
        return true;
    }

    freeCell(x, z) {
        const dimensions = this.gridDimensions[this.tier];
        if (x < 0 || x >= dimensions.width || z < 0 || z >= dimensions.height) {
            Logger.error('Attempted to free cell outside grid bounds:', { x, z });
            return false;
        }
        this.grid[x][z] = null;
        return true;
    }

    getWorldPosition(gridX, gridZ) {
        const dimensions = this.gridDimensions[this.tier];
        const halfWidth = (dimensions.width * this.cellSize) / 2;
        const halfHeight = (dimensions.height * this.cellSize) / 2;
        return {
            x: (gridX * this.cellSize) - halfWidth + (this.cellSize / 2),
            z: (gridZ * this.cellSize) - halfHeight + (this.cellSize / 2)
        };
    }

    getGridPosition(worldX, worldZ) {
        const dimensions = this.gridDimensions[this.tier];
        const halfWidth = (dimensions.width * this.cellSize) / 2;
        const halfHeight = (dimensions.height * this.cellSize) / 2;
        return {
            x: Math.floor((worldX + halfWidth) / this.cellSize),
            z: Math.floor((worldZ + halfHeight) / this.cellSize)
        };
    }

    isValidPosition(x, z) {
        const dimensions = this.gridDimensions[this.tier];
        return x >= 0 && x < dimensions.width && z >= 0 && z < dimensions.height;
    }
} 