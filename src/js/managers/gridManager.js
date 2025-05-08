import Logger from '../utils/logger.js';

export class GridManager {
    constructor() {
        this.grid = [];
        this.cellSize = 0;
        this.totalSize = 0;
    }

    async initialize(gameStateContract) {
        try {
            const maxSlots = await gameStateContract.getMaxBuildingSlots();
            // Convert BigInt to Number for calculations
            const maxSlotsNumber = Number(maxSlots);
            // Calculate grid dimensions to be as square as possible
            const gridSize = Math.ceil(Math.sqrt(maxSlotsNumber));
            this.totalSize = gridSize;
            this.cellSize = 10; // Standard cell size
            this.grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
            
            Logger.info('Grid initialized:', {
                gridSize,
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
        return this.totalSize * this.cellSize;
    }

    isCellOccupied(x, z) {
        if (x < 0 || x >= this.totalSize || z < 0 || z >= this.totalSize) {
            return true; // Out of bounds is considered occupied
        }
        return this.grid[x][z] !== null;
    }

    occupyCell(x, z, building) {
        if (x < 0 || x >= this.totalSize || z < 0 || z >= this.totalSize) {
            Logger.error('Attempted to occupy cell outside grid bounds:', { x, z });
            return false;
        }
        this.grid[x][z] = building;
        return true;
    }

    freeCell(x, z) {
        if (x < 0 || x >= this.totalSize || z < 0 || z >= this.totalSize) {
            Logger.error('Attempted to free cell outside grid bounds:', { x, z });
            return false;
        }
        this.grid[x][z] = null;
        return true;
    }

    getWorldPosition(gridX, gridZ) {
        const halfSize = (this.totalSize * this.cellSize) / 2;
        return {
            x: (gridX * this.cellSize) - halfSize + (this.cellSize / 2),
            z: (gridZ * this.cellSize) - halfSize + (this.cellSize / 2)
        };
    }

    getGridPosition(worldX, worldZ) {
        const halfSize = (this.totalSize * this.cellSize) / 2;
        return {
            x: Math.floor((worldX + halfSize) / this.cellSize),
            z: Math.floor((worldZ + halfSize) / this.cellSize)
        };
    }

    isValidPosition(x, z) {
        return x >= 0 && x < this.totalSize && z >= 0 && z < this.totalSize;
    }
} 