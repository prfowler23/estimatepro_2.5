import { z } from 'zod';
import { aiConfigSchema } from './ai-validation-schemas';

// AI Configuration interface
export interface AIConfig {
  openaiApiKey: string;
  defaultModel: string;
  visionModel: string;
  maxTokens: number;
  temperature: number;
  retryAttempts: number;
  rateLimitPerMinute: number;
  enableCaching: boolean;
  enableLogging: boolean;
}

// Service pricing configuration
export interface ServicePricingConfig {
  [serviceCode: string]: {
    baseRate: number; // per sq ft
    setupTime: number; // hours
    laborRate: number; // per hour
    equipmentDaily: number; // daily equipment cost
    materialMultiplier: number; // multiplier for material costs
    complexityFactors: {
      height: number; // multiplier per floor
      access: number; // difficult access multiplier
      weather: number; // weather condition multiplier
    };
  };
}

// Building type multipliers configuration
export interface BuildingMultipliers {
  [buildingType: string]: number;
}

// Rate limiting configuration
export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  cooldownPeriod: number; // seconds
}

// Cache configuration
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // time to live in seconds
  maxSize: number; // maximum cache entries
  keyPrefix: string;
  compression: boolean;
}

// Default configurations
const DEFAULT_AI_CONFIG: AIConfig = {
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  defaultModel: process.env.AI_DEFAULT_MODEL || 'gpt-4',
  visionModel: process.env.AI_VISION_MODEL || 'gpt-4o',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000'),
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.1'),
  retryAttempts: parseInt(process.env.AI_RETRY_ATTEMPTS || '3'),
  rateLimitPerMinute: parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || '20'),
  enableCaching: process.env.AI_ENABLE_CACHING !== 'false',
  enableLogging: process.env.AI_ENABLE_LOGGING !== 'false'
};

const DEFAULT_SERVICE_PRICING: ServicePricingConfig = {
  'WC': { // Window Cleaning
    baseRate: parseFloat(process.env.WC_BASE_RATE || '0.75'),
    setupTime: parseFloat(process.env.WC_SETUP_TIME || '2'),
    laborRate: parseFloat(process.env.WC_LABOR_RATE || '65'),
    equipmentDaily: parseFloat(process.env.WC_EQUIPMENT_DAILY || '150'),
    materialMultiplier: parseFloat(process.env.WC_MATERIAL_MULTIPLIER || '1.2'),
    complexityFactors: {
      height: parseFloat(process.env.WC_HEIGHT_FACTOR || '1.15'),
      access: parseFloat(process.env.WC_ACCESS_FACTOR || '1.25'),
      weather: parseFloat(process.env.WC_WEATHER_FACTOR || '1.1')
    }
  },
  'PW': { // Pressure Washing
    baseRate: parseFloat(process.env.PW_BASE_RATE || '0.15'),
    setupTime: parseFloat(process.env.PW_SETUP_TIME || '1.5'),
    laborRate: parseFloat(process.env.PW_LABOR_RATE || '65'),
    equipmentDaily: parseFloat(process.env.PW_EQUIPMENT_DAILY || '200'),
    materialMultiplier: parseFloat(process.env.PW_MATERIAL_MULTIPLIER || '1.1'),
    complexityFactors: {
      height: parseFloat(process.env.PW_HEIGHT_FACTOR || '1.1'),
      access: parseFloat(process.env.PW_ACCESS_FACTOR || '1.2'),
      weather: parseFloat(process.env.PW_WEATHER_FACTOR || '1.15')
    }
  },
  'SW': { // Soft Washing
    baseRate: parseFloat(process.env.SW_BASE_RATE || '0.25'),
    setupTime: parseFloat(process.env.SW_SETUP_TIME || '2'),
    laborRate: parseFloat(process.env.SW_LABOR_RATE || '65'),
    equipmentDaily: parseFloat(process.env.SW_EQUIPMENT_DAILY || '175'),
    materialMultiplier: parseFloat(process.env.SW_MATERIAL_MULTIPLIER || '1.3'),
    complexityFactors: {
      height: parseFloat(process.env.SW_HEIGHT_FACTOR || '1.2'),
      access: parseFloat(process.env.SW_ACCESS_FACTOR || '1.3'),
      weather: parseFloat(process.env.SW_WEATHER_FACTOR || '1.2')
    }
  },
  'GR': { // Glass Restoration
    baseRate: parseFloat(process.env.GR_BASE_RATE || '2.50'),
    setupTime: parseFloat(process.env.GR_SETUP_TIME || '3'),
    laborRate: parseFloat(process.env.GR_LABOR_RATE || '75'),
    equipmentDaily: parseFloat(process.env.GR_EQUIPMENT_DAILY || '300'),
    materialMultiplier: parseFloat(process.env.GR_MATERIAL_MULTIPLIER || '1.5'),
    complexityFactors: {
      height: parseFloat(process.env.GR_HEIGHT_FACTOR || '1.3'),
      access: parseFloat(process.env.GR_ACCESS_FACTOR || '1.4'),
      weather: parseFloat(process.env.GR_WEATHER_FACTOR || '1.25')
    }
  },
  'FR': { // Frame Restoration
    baseRate: parseFloat(process.env.FR_BASE_RATE || '1.85'),
    setupTime: parseFloat(process.env.FR_SETUP_TIME || '2.5'),
    laborRate: parseFloat(process.env.FR_LABOR_RATE || '70'),
    equipmentDaily: parseFloat(process.env.FR_EQUIPMENT_DAILY || '225'),
    materialMultiplier: parseFloat(process.env.FR_MATERIAL_MULTIPLIER || '1.4'),
    complexityFactors: {
      height: parseFloat(process.env.FR_HEIGHT_FACTOR || '1.25'),
      access: parseFloat(process.env.FR_ACCESS_FACTOR || '1.35'),
      weather: parseFloat(process.env.FR_WEATHER_FACTOR || '1.2')
    }
  },
  'HD': { // High Dusting
    baseRate: parseFloat(process.env.HD_BASE_RATE || '0.35'),
    setupTime: parseFloat(process.env.HD_SETUP_TIME || '2'),
    laborRate: parseFloat(process.env.HD_LABOR_RATE || '65'),
    equipmentDaily: parseFloat(process.env.HD_EQUIPMENT_DAILY || '175'),
    materialMultiplier: parseFloat(process.env.HD_MATERIAL_MULTIPLIER || '1.1'),
    complexityFactors: {
      height: parseFloat(process.env.HD_HEIGHT_FACTOR || '1.4'),
      access: parseFloat(process.env.HD_ACCESS_FACTOR || '1.5'),
      weather: parseFloat(process.env.HD_WEATHER_FACTOR || '1.1')
    }
  },
  'FC': { // Final Clean
    baseRate: parseFloat(process.env.FC_BASE_RATE || '0.45'),
    setupTime: parseFloat(process.env.FC_SETUP_TIME || '1'),
    laborRate: parseFloat(process.env.FC_LABOR_RATE || '55'),
    equipmentDaily: parseFloat(process.env.FC_EQUIPMENT_DAILY || '100'),
    materialMultiplier: parseFloat(process.env.FC_MATERIAL_MULTIPLIER || '1.0'),
    complexityFactors: {
      height: parseFloat(process.env.FC_HEIGHT_FACTOR || '1.1'),
      access: parseFloat(process.env.FC_ACCESS_FACTOR || '1.15'),
      weather: parseFloat(process.env.FC_WEATHER_FACTOR || '1.05')
    }
  },
  'GRC': { // Granite Reconditioning
    baseRate: parseFloat(process.env.GRC_BASE_RATE || '3.25'),
    setupTime: parseFloat(process.env.GRC_SETUP_TIME || '3'),
    laborRate: parseFloat(process.env.GRC_LABOR_RATE || '80'),
    equipmentDaily: parseFloat(process.env.GRC_EQUIPMENT_DAILY || '350'),
    materialMultiplier: parseFloat(process.env.GRC_MATERIAL_MULTIPLIER || '1.6'),
    complexityFactors: {
      height: parseFloat(process.env.GRC_HEIGHT_FACTOR || '1.2'),
      access: parseFloat(process.env.GRC_ACCESS_FACTOR || '1.3'),
      weather: parseFloat(process.env.GRC_WEATHER_FACTOR || '1.15')
    }
  },
  'PWS': { // Pressure Wash & Seal
    baseRate: parseFloat(process.env.PWS_BASE_RATE || '0.85'),
    setupTime: parseFloat(process.env.PWS_SETUP_TIME || '2'),
    laborRate: parseFloat(process.env.PWS_LABOR_RATE || '70'),
    equipmentDaily: parseFloat(process.env.PWS_EQUIPMENT_DAILY || '275'),
    materialMultiplier: parseFloat(process.env.PWS_MATERIAL_MULTIPLIER || '1.4'),
    complexityFactors: {
      height: parseFloat(process.env.PWS_HEIGHT_FACTOR || '1.2'),
      access: parseFloat(process.env.PWS_ACCESS_FACTOR || '1.25'),
      weather: parseFloat(process.env.PWS_WEATHER_FACTOR || '1.3')
    }
  },
  'PD': { // Parking Deck
    baseRate: parseFloat(process.env.PD_BASE_RATE || '0.12'),
    setupTime: parseFloat(process.env.PD_SETUP_TIME || '1'),
    laborRate: parseFloat(process.env.PD_LABOR_RATE || '60'),
    equipmentDaily: parseFloat(process.env.PD_EQUIPMENT_DAILY || '400'),
    materialMultiplier: parseFloat(process.env.PD_MATERIAL_MULTIPLIER || '1.2'),
    complexityFactors: {
      height: parseFloat(process.env.PD_HEIGHT_FACTOR || '1.0'),
      access: parseFloat(process.env.PD_ACCESS_FACTOR || '1.1'),
      weather: parseFloat(process.env.PD_WEATHER_FACTOR || '1.2')
    }
  }
};

const DEFAULT_BUILDING_MULTIPLIERS: BuildingMultipliers = {
  'office': parseFloat(process.env.MULTIPLIER_OFFICE || '1.0'),
  'retail': parseFloat(process.env.MULTIPLIER_RETAIL || '1.1'),
  'industrial': parseFloat(process.env.MULTIPLIER_INDUSTRIAL || '0.9'),
  'hospital': parseFloat(process.env.MULTIPLIER_HOSPITAL || '1.4'),
  'school': parseFloat(process.env.MULTIPLIER_SCHOOL || '1.2'),
  'residential': parseFloat(process.env.MULTIPLIER_RESIDENTIAL || '0.8'),
  'warehouse': parseFloat(process.env.MULTIPLIER_WAREHOUSE || '0.85'),
  'hotel': parseFloat(process.env.MULTIPLIER_HOTEL || '1.3'),
  'restaurant': parseFloat(process.env.MULTIPLIER_RESTAURANT || '1.25'),
  'mixed-use': parseFloat(process.env.MULTIPLIER_MIXED_USE || '1.15')
};

const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  requestsPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '20'),
  requestsPerHour: parseInt(process.env.RATE_LIMIT_PER_HOUR || '500'),
  requestsPerDay: parseInt(process.env.RATE_LIMIT_PER_DAY || '5000'),
  burstLimit: parseInt(process.env.RATE_LIMIT_BURST || '5'),
  cooldownPeriod: parseInt(process.env.RATE_LIMIT_COOLDOWN || '60')
};

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: process.env.CACHE_ENABLED !== 'false',
  ttl: parseInt(process.env.CACHE_TTL || '3600'), // 1 hour
  maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
  keyPrefix: process.env.CACHE_KEY_PREFIX || 'estimatepro:ai:',
  compression: process.env.CACHE_COMPRESSION === 'true'
};

// Configuration manager class
export class AIConfigManager {
  private static instance: AIConfigManager;
  private config: AIConfig;
  private servicePricing: ServicePricingConfig;
  private buildingMultipliers: BuildingMultipliers;
  private rateLimitConfig: RateLimitConfig;
  private cacheConfig: CacheConfig;

  private constructor() {
    this.loadConfiguration();
  }

  public static getInstance(): AIConfigManager {
    if (!AIConfigManager.instance) {
      AIConfigManager.instance = new AIConfigManager();
    }
    return AIConfigManager.instance;
  }

  private loadConfiguration(): void {
    try {
      // Validate and load AI config
      this.config = aiConfigSchema.parse(DEFAULT_AI_CONFIG);
      this.servicePricing = DEFAULT_SERVICE_PRICING;
      this.buildingMultipliers = DEFAULT_BUILDING_MULTIPLIERS;
      this.rateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG;
      this.cacheConfig = DEFAULT_CACHE_CONFIG;

      // Validate required environment variables
      if (!this.config.openaiApiKey) {
        throw new Error('OPENAI_API_KEY environment variable is required');
      }

      console.info('AI configuration loaded successfully');
    } catch (error) {
      console.error('Failed to load AI configuration:', error);
      throw new Error('Invalid AI configuration');
    }
  }

  // Getters for configuration
  public getAIConfig(): AIConfig {
    return { ...this.config };
  }

  public getServicePricing(serviceCode?: string): ServicePricingConfig | ServicePricingConfig[string] {
    if (serviceCode) {
      return this.servicePricing[serviceCode] || null;
    }
    return { ...this.servicePricing };
  }

  public getBuildingMultipliers(): BuildingMultipliers {
    return { ...this.buildingMultipliers };
  }

  public getBuildingMultiplier(buildingType: string): number {
    return this.buildingMultipliers[buildingType.toLowerCase()] || 1.0;
  }

  public getRateLimitConfig(): RateLimitConfig {
    return { ...this.rateLimitConfig };
  }

  public getCacheConfig(): CacheConfig {
    return { ...this.cacheConfig };
  }

  // Setters for runtime configuration updates
  public updateServicePricing(serviceCode: string, pricing: Partial<ServicePricingConfig[string]>): void {
    if (this.servicePricing[serviceCode]) {
      this.servicePricing[serviceCode] = {
        ...this.servicePricing[serviceCode],
        ...pricing
      };
      console.info(`Updated pricing for service ${serviceCode}`);
    }
  }

  public updateBuildingMultiplier(buildingType: string, multiplier: number): void {
    if (multiplier > 0 && multiplier <= 5) {
      this.buildingMultipliers[buildingType.toLowerCase()] = multiplier;
      console.info(`Updated building multiplier for ${buildingType}: ${multiplier}`);
    }
  }

  public updateRateLimitConfig(config: Partial<RateLimitConfig>): void {
    this.rateLimitConfig = {
      ...this.rateLimitConfig,
      ...config
    };
    console.info('Updated rate limit configuration');
  }

  // Validation methods
  public validateServiceCode(serviceCode: string): boolean {
    return serviceCode in this.servicePricing;
  }

  public validateBuildingType(buildingType: string): boolean {
    return buildingType.toLowerCase() in this.buildingMultipliers;
  }

  // Configuration export/import for admin interface
  public exportConfiguration(): {
    servicePricing: ServicePricingConfig;
    buildingMultipliers: BuildingMultipliers;
    rateLimitConfig: RateLimitConfig;
    cacheConfig: CacheConfig;
  } {
    return {
      servicePricing: this.getServicePricing() as ServicePricingConfig,
      buildingMultipliers: this.getBuildingMultipliers(),
      rateLimitConfig: this.getRateLimitConfig(),
      cacheConfig: this.getCacheConfig()
    };
  }

  public importConfiguration(config: {
    servicePricing?: Partial<ServicePricingConfig>;
    buildingMultipliers?: Partial<BuildingMultipliers>;
    rateLimitConfig?: Partial<RateLimitConfig>;
    cacheConfig?: Partial<CacheConfig>;
  }): void {
    if (config.servicePricing) {
      Object.entries(config.servicePricing).forEach(([serviceCode, pricing]) => {
        this.updateServicePricing(serviceCode, pricing);
      });
    }

    if (config.buildingMultipliers) {
      Object.entries(config.buildingMultipliers).forEach(([buildingType, multiplier]) => {
        this.updateBuildingMultiplier(buildingType, multiplier);
      });
    }

    if (config.rateLimitConfig) {
      this.updateRateLimitConfig(config.rateLimitConfig);
    }

    if (config.cacheConfig) {
      this.cacheConfig = {
        ...this.cacheConfig,
        ...config.cacheConfig
      };
    }

    console.info('Configuration imported successfully');
  }

  // Reload configuration from environment variables
  public reloadConfiguration(): void {
    this.loadConfiguration();
    console.info('Configuration reloaded from environment variables');
  }

  // Get configuration summary for monitoring
  public getConfigurationSummary(): {
    aiModel: string;
    visionModel: string;
    serviceCount: number;
    buildingTypeCount: number;
    rateLimitPerMinute: number;
    cachingEnabled: boolean;
    loggingEnabled: boolean;
  } {
    return {
      aiModel: this.config.defaultModel,
      visionModel: this.config.visionModel,
      serviceCount: Object.keys(this.servicePricing).length,
      buildingTypeCount: Object.keys(this.buildingMultipliers).length,
      rateLimitPerMinute: this.rateLimitConfig.requestsPerMinute,
      cachingEnabled: this.cacheConfig.enabled,
      loggingEnabled: this.config.enableLogging
    };
  }
}

// Export singleton instance
export const aiConfig = AIConfigManager.getInstance();