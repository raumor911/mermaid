import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

function initDb(dbPath: string) {
  const dbDir = path.dirname(dbPath);
  if (dbDir !== '.' && !fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return new Database(dbPath);
}

const vantageDbPath = process.env.DATABASE_URL || 'vantage.db';
const catalystDbPath = process.env.CATALYST_DATABASE_URL || 'catalyst.db';
const blueprintDbPath = process.env.BLUEPRINT_DATABASE_URL || 'blueprint.db';

export const vantageDb = initDb(vantageDbPath);
export const catalystDb = initDb(catalystDbPath);
export const blueprintDb = initDb(blueprintDbPath);

// --- Initialize Vantage Tables ---
vantageDb.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    catalyst_lead_id TEXT UNIQUE,
    spending_limit DECIMAL(12,2) DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE'
  );

  CREATE TABLE IF NOT EXISTS bom_items (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    sku TEXT NOT NULL,
    description TEXT,
    quantity_required DECIMAL(10,2),
    unit_cost_estimated DECIMAL(12,2)
  );

  CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    vendor_name TEXT,
    total_amount DECIMAL(12,2),
    status TEXT DEFAULT 'PENDING_IA',
    ai_reasoning TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inventory (
    sku TEXT PRIMARY KEY,
    description TEXT,
    quantity_on_hand DECIMAL(10,2) DEFAULT 0,
    quantity_reserved DECIMAL(10,2) DEFAULT 0,
    unit TEXT
  );

  CREATE TABLE IF NOT EXISTS exceptions (
    id TEXT PRIMARY KEY,
    po_id TEXT REFERENCES purchase_orders(id),
    approved_by TEXT,
    impact_on_margin DECIMAL(5,2),
    justification TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// --- Initialize Catalyst Tables ---
catalystDb.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    project_name TEXT NOT NULL,
    budget_total_contrato DECIMAL(12,2),
    monto_anticipo_real DECIMAL(12,2),
    status TEXT DEFAULT 'NEW',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// --- Initialize Blueprint Tables ---
blueprintDb.exec(`
  CREATE TABLE IF NOT EXISTS designs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    version TEXT NOT NULL,
    status TEXT CHECK (status IN ('DRAFT', 'APPROVED')) DEFAULT 'DRAFT',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bom_items (
    id TEXT PRIMARY KEY,
    design_id TEXT REFERENCES designs(id),
    sku_sugerido TEXT NOT NULL,
    description TEXT,
    cantidad_neta DECIMAL(10,2),
    factor_desperdicio DECIMAL(5,2) DEFAULT 1.05
  );
`);

// --- Seed Vantage Data ---
const projectCount = vantageDb.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
if (projectCount.count === 0) {
  const projectId = 'proj-001';
  vantageDb.prepare('INSERT INTO projects (id, name, catalyst_lead_id, spending_limit) VALUES (?, ?, ?, ?)').run(
    projectId, 'Residencial Arcos', 'lead-abc-123', 750000.00
  );

  vantageDb.prepare('INSERT INTO bom_items (id, project_id, sku, description, quantity_required, unit_cost_estimated) VALUES (?, ?, ?, ?, ?, ?)').run(
    'bom-1', projectId, 'CEM-G50', 'Cemento Gris 50kg', 100, 180.00
  );
  vantageDb.prepare('INSERT INTO bom_items (id, project_id, sku, description, quantity_required, unit_cost_estimated) VALUES (?, ?, ?, ?, ?, ?)').run(
    'bom-2', projectId, 'VAR-3/8', 'Varilla 3/8 pulgada', 50, 250.00
  );

  vantageDb.prepare('INSERT INTO inventory (sku, description, quantity_on_hand, unit) VALUES (?, ?, ?, ?)').run(
    'CEM-G50', 'Cemento Gris 50kg', 20, 'Bulto'
  );
}

// --- Seed Catalyst Data ---
const leadCount = catalystDb.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
if (leadCount.count === 0) {
  catalystDb.prepare('INSERT INTO leads (id, project_name, budget_total_contrato, monto_anticipo_real, status) VALUES (?, ?, ?, ?, ?)').run(
    'lead-abc-123', 'Residencial Arcos', 1500000.00, 750000.00, 'ANTICIPO_CONFIRMADO'
  );
  catalystDb.prepare('INSERT INTO leads (id, project_name, budget_total_contrato, monto_anticipo_real, status) VALUES (?, ?, ?, ?, ?)').run(
    'lead-xyz-789', 'Torre Altura', 3000000.00, 0.00, 'NEW'
  );
}

// --- Seed Blueprint Data ---
const designCount = blueprintDb.prepare('SELECT COUNT(*) as count FROM designs').get() as { count: number };
if (designCount.count === 0) {
  const designId = 'design-001';
  blueprintDb.prepare('INSERT INTO designs (id, project_id, version, status) VALUES (?, ?, ?, ?)').run(
    designId, 'proj-001', 'v1.0', 'APPROVED'
  );

  blueprintDb.prepare('INSERT INTO bom_items (id, design_id, sku_sugerido, description, cantidad_neta, factor_desperdicio) VALUES (?, ?, ?, ?, ?, ?)').run(
    'bitem-1', designId, 'CEM-G50', 'Cemento Gris 50kg', 100, 1.05
  );
  blueprintDb.prepare('INSERT INTO bom_items (id, design_id, sku_sugerido, description, cantidad_neta, factor_desperdicio) VALUES (?, ?, ?, ?, ?, ?)').run(
    'bitem-2', designId, 'VAR-3/8', 'Varilla 3/8 pulgada', 50, 1.10
  );
}

export default vantageDb;
