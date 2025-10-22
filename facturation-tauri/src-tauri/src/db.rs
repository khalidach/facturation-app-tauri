use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::fs;

/// Get path to database
pub fn get_db_path() -> PathBuf {
    // Get system data directory (OS-specific)
    let mut path = dirs::data_dir().expect("Failed to get system data directory");

    // Add your app folder
    path.push("facturation-tauri");

    // Create folder if missing
    if !path.exists() {
        fs::create_dir_all(&path).expect("Failed to create app data directory");
    }

    // Database file path
    path.join("facturation.db")
}

/// Initialize SQLite database
pub fn init_db(db_path: &PathBuf) -> Result<Connection> {
    let conn = Connection::open(db_path)?;

    conn.execute_batch(
        "
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS factures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            facture_number TEXT UNIQUE NOT NULL,
            client_name TEXT NOT NULL,
            client_address TEXT,
            client_ice TEXT,
            date TEXT NOT NULL,
            items TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('facture', 'devis')),
            show_margin BOOLEAN NOT NULL DEFAULT TRUE,
            prix_total_hors_frais REAL NOT NULL,
            total_frais_service_ht REAL NOT NULL,
            tva REAL NOT NULL,
            total REAL NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS theme (
            id INTEGER PRIMARY KEY DEFAULT 1,
            styles TEXT
        );
        "
    )?;

    Ok(conn)
}
