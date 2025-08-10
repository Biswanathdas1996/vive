import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";
import type { DatabaseConfig } from "@shared/schema";

neonConfig.webSocketConstructor = ws;

class DynamicDatabaseService {
  private currentPool: Pool | null = null;
  private currentDb: any = null;
  private currentConnectionString: string | null = null;

  /**
   * Build connection string from database config
   */
  private buildConnectionString(config: DatabaseConfig): string {
    if (config.connectionString) {
      return config.connectionString;
    }

    const {
      host = 'localhost',
      port = 5432,
      database = 'postgres',
      username = 'postgres',
      password = '',
      ssl = true
    } = config;

    const sslParam = ssl ? '?sslmode=require' : '';
    return `postgresql://${username}:${password}@${host}:${port}/${database}${sslParam}`;
  }

  /**
   * Get database connection using settings configuration
   */
  async getDatabase() {
    try {
      // Try to get database config from settings
      const settings = await this.getSettingsWithFallback();
      
      let connectionString: string;
      
      if (settings?.databaseConfig) {
        connectionString = this.buildConnectionString(settings.databaseConfig);
      } else {
        // Fallback to environment variable if no settings config
        connectionString = process.env.DATABASE_URL || '';
        if (!connectionString) {
          throw new Error("No database configuration found. Please configure database settings.");
        }
      }

      // Reuse existing connection if same connection string
      if (this.currentDb && this.currentConnectionString === connectionString) {
        return this.currentDb;
      }

      // Close existing connection if different
      if (this.currentPool) {
        await this.currentPool.end();
      }

      // Create new connection
      this.currentPool = new Pool({ connectionString });
      this.currentDb = drizzle({ client: this.currentPool, schema });
      this.currentConnectionString = connectionString;

      return this.currentDb;
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }

  /**
   * Get settings with basic fallback to bootstrap the system
   */
  private async getSettingsWithFallback() {
    try {
      // Use environment variable for initial bootstrap
      if (!this.currentDb) {
        const fallbackConnectionString = process.env.DATABASE_URL;
        if (!fallbackConnectionString) {
          return null;
        }
        
        const fallbackPool = new Pool({ connectionString: fallbackConnectionString });
        const fallbackDb = drizzle({ client: fallbackPool, schema });
        
        const [settings] = await fallbackDb
          .select()
          .from(schema.settings)
          .where(eq(schema.settings.userId, "default"));
        
        await fallbackPool.end();
        return settings || null;
      } else {
        const [settings] = await this.currentDb
          .select()
          .from(schema.settings)
          .where(eq(schema.settings.userId, "default"));
        
        return settings || null;
      }
    } catch (error) {
      console.error('Error getting settings:', error);
      return null;
    }
  }

  /**
   * Test database connection with given configuration
   */
  async testConnection(config: DatabaseConfig): Promise<boolean> {
    try {
      const connectionString = this.buildConnectionString(config);
      const testPool = new Pool({ connectionString });
      const testDb = drizzle({ client: testPool, schema });
      
      // Simple query to test connection
      await testDb.select().from(schema.settings).limit(1);
      await testPool.end();
      
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Close current database connection
   */
  async closeConnection() {
    if (this.currentPool) {
      await this.currentPool.end();
      this.currentPool = null;
      this.currentDb = null;
      this.currentConnectionString = null;
    }
  }
}

export const dynamicDbService = new DynamicDatabaseService();

// Export dynamic database getter
export const getDynamicDb = () => dynamicDbService.getDatabase();