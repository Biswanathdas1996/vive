import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";
import type { DatabaseConfig } from "@shared/schema";
import { db } from "./db"; // Static connection for settings

neonConfig.webSocketConstructor = ws;

class DatabaseManager {
  private configuredPool: Pool | null = null;
  private configuredDb: any = null;
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
   * Get the configured database connection (separate from settings storage)
   */
  async getConfiguredDatabase() {
    try {
      // Always use static db for settings to avoid circular dependency
      const [settings] = await db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.userId, "default"));

      if (!settings?.databaseConfig?.connectionString) {
        // No custom database configured, use default static connection
        return db;
      }

      const connectionString = this.buildConnectionString(settings.databaseConfig);

      // Reuse existing connection if same connection string
      if (this.configuredDb && this.currentConnectionString === connectionString) {
        return this.configuredDb;
      }

      // Close existing connection if different
      if (this.configuredPool) {
        await this.configuredPool.end();
      }

      // Create new connection to configured database
      this.configuredPool = new Pool({ connectionString });
      this.configuredDb = drizzle({ client: this.configuredPool, schema });
      this.currentConnectionString = connectionString;

      return this.configuredDb;
    } catch (error) {
      console.error('Configured database connection error:', error);
      // Fallback to static connection
      return db;
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
   * Close configured database connection
   */
  async closeConfiguredConnection() {
    if (this.configuredPool) {
      await this.configuredPool.end();
      this.configuredPool = null;
      this.configuredDb = null;
      this.currentConnectionString = null;
    }
  }

  /**
   * Get connection for settings operations (always uses static connection)
   */
  getSettingsDatabase() {
    return db;
  }
}

export const databaseManager = new DatabaseManager();