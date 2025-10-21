    use rusqlite::{Connection, Result};
    use std::path::PathBuf;
    use tauri::AppHandle;
    use std::fs;

    pub fn get_db_path(app_handle: &AppHandle) -> PathBuf {
        let path = app_handle.path_resolver()
            .app_data_dir()
            .expect("Failed to get app data directory");

        if !path.exists() {
            fs::create_dir_all(&path).expect("Failed to create app data directory");
        }
        
        path.join("facturation.db")
    }

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
    
