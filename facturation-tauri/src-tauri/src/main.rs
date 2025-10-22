    #![cfg_attr(
      all(not(debug_assertions), target_os = "windows"),
      windows_subsystem = "windows"
    )]

    mod db;
    mod models;
    mod error;

    use std::collections::HashMap;
    use tauri::Manager;
    use std::sync::Mutex;
    use rusqlite::Connection;
    use models::{Facture, FactureData, FactureItem, PaginatedResponse, Pagination, Theme};
    use error::Error;

    pub struct AppState {
      db: Mutex<Option<Connection>>,
    }

    type Result<T> = std::result::Result<T, Error>;

    // --- Tauri Commands ---

    #[tauri::command]
    fn get_factures(
        state: tauri::State<AppState>,
        page: i64,
        limit: i64,
        search: String,
        sort_by: String,
    ) -> Result<PaginatedResponse> {
        let db = state.db.lock().unwrap();
        let conn = db.as_ref().ok_or(Error::DbConnection)?;

        let offset = (page - 1) * limit;
        let order_by = if sort_by == "oldest" { "created_at ASC" } else { "created_at DESC" };
        let where_clause = if search.is_empty() {
            "".to_string()
        } else {
            format!("WHERE client_name LIKE '%{0}%' OR facture_number LIKE '%{0}%' OR CAST(total AS TEXT) LIKE '%{0}%'", search)
        };
        
        let mut count_stmt = conn.prepare(&format!("SELECT COUNT(*) FROM factures {}", where_clause))?;
        let total_count: i64 = count_stmt.query_row([], |row| row.get(0))?;
        
        let mut stmt = conn.prepare(&format!("SELECT * FROM factures {} ORDER BY {} LIMIT ?1 OFFSET ?2", where_clause, order_by))?;
        
        let factures_iter = stmt.query_map([limit, offset], |row| {
            let items_str: String = row.get("items")?;
            let items: Vec<FactureItem> = serde_json::from_str(&items_str).unwrap_or_default();
            
            Ok(Facture {
                id: Some(row.get("id")?),
                facture_number: row.get("facture_number")?,
                client_name: row.get("client_name")?,
                client_address: row.get("client_address")?,
                client_ice: row.get("client_ice")?,
                date: row.get("date")?,
                items,
                r#type: row.get("type")?,
                show_margin: row.get("show_margin")?,
                prix_total_hors_frais: row.get("prix_total_hors_frais")?,
                total_frais_service_ht: row.get("total_frais_service_ht")?,
                tva: row.get("tva")?,
                total: row.get("total")?,
                notes: row.get("notes")?,
            })
        })?;

        let factures: std::result::Result<Vec<Facture>, _> = factures_iter.collect();
        
        Ok(PaginatedResponse {
            data: factures?,
            pagination: Pagination {
                current_page: page,
                total_pages: (total_count as f64 / limit as f64).ceil() as i64,
                total_count,
            },
        })
    }

    #[tauri::command]
    fn create_facture(state: tauri::State<AppState>, data: FactureData) -> Result<Facture> {
        let db = state.db.lock().unwrap();
        let conn = db.as_ref().ok_or(Error::DbConnection)?;
        
        // This logic can be expanded to auto-generate facture_number if needed
        let facture_number = data.facture_number.unwrap_or_else(|| "FN-001".to_string());
        let items_json = serde_json::to_string(&data.items)?;

        conn.execute(
            "INSERT INTO factures (facture_number, client_name, client_address, client_ice, date, items, type, show_margin, prix_total_hors_frais, total_frais_service_ht, tva, total, notes) 
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            (
                &facture_number, &data.client_name, &data.client_address, &data.client_ice, &data.date, &items_json, &data.r#type,
                &data.show_margin, &data.prix_total_hors_frais, &data.total_frais_service_ht, &data.tva, &data.total, &data.notes,
            ),
        )?;
        
        let id = conn.last_insert_rowid();

        Ok(Facture {
            id: Some(id),
            facture_number,
            client_name: data.client_name,
            client_address: data.client_address,
            client_ice: data.client_ice,
            date: data.date,
            items: data.items,
            r#type: data.r#type,
            show_margin: data.show_margin,
            prix_total_hors_frais: data.prix_total_hors_frais,
            total_frais_service_ht: data.total_frais_service_ht,
            tva: data.tva,
            total: data.total,
            notes: data.notes,
        })
    }
    
    #[tauri::command]
    fn update_facture(state: tauri::State<AppState>, id: i64, data: FactureData) -> Result<Facture> {
        let db = state.db.lock().unwrap();
        let conn = db.as_ref().ok_or(Error::DbConnection)?;

        let items_json = serde_json::to_string(&data.items)?;
        
        conn.execute(
            "UPDATE factures SET 
            client_name = ?1, client_address = ?2, client_ice = ?3, date = ?4, items = ?5, type = ?6, show_margin = ?7, 
            prix_total_hors_frais = ?8, total_frais_service_ht = ?9, tva = ?10, total = ?11, notes = ?12
            WHERE id = ?13",
            (
                &data.client_name, &data.client_address, &data.client_ice, &data.date, &items_json, &data.r#type, &data.show_margin,
                &data.prix_total_hors_frais, &data.total_frais_service_ht, &data.tva, &data.total, &data.notes, id
            )
        )?;

        // Return the updated facture data. `facture_number` is not updatable.
        Ok(Facture { 
            id: Some(id), 
            facture_number: data.facture_number.unwrap_or_default(), // Should be fetched or passed
            client_name: data.client_name, client_address: data.client_address, client_ice: data.client_ice, 
            date: data.date, items: data.items, r#type: data.r#type, show_margin: data.show_margin, 
            prix_total_hors_frais: data.prix_total_hors_frais, total_frais_service_ht: data.total_frais_service_ht,
            tva: data.tva, total: data.total, notes: data.notes
        })
    }

    #[tauri::command]
    fn delete_facture(state: tauri::State<AppState>, id: i64) -> Result<()> {
        let db = state.db.lock().unwrap();
        let conn = db.as_ref().ok_or(Error::DbConnection)?;
        conn.execute("DELETE FROM factures WHERE id = ?1", [id])?;
        Ok(())
    }

    #[tauri::command]
    fn get_settings(state: tauri::State<AppState>) -> Result<HashMap<String, String>> {
        let db = state.db.lock().unwrap();
        let conn = db.as_ref().ok_or(Error::DbConnection)?;

        let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
        let settings_iter = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?;
        
        let mut settings = HashMap::new();
        for setting in settings_iter {
            let (key, value) = setting?;
            settings.insert(key, value);
        }
        Ok(settings)
    }

    #[tauri::command]
    fn update_settings(state: tauri::State<AppState>, settings: HashMap<String, String>) -> Result<()> {
        let db = state.db.lock().unwrap();
        let conn = db.as_ref().ok_or(Error::DbConnection)?;

        let mut stmt = conn.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)")?;
        for (key, value) in &settings {
            stmt.execute([key, value])?;
        }
        Ok(())
    }

    #[tauri::command]
    fn get_theme(state: tauri::State<AppState>) -> Result<Theme> {
        let db = state.db.lock().unwrap();
        let conn = db.as_ref().ok_or(Error::DbConnection)?;
        
        let styles_str: String = conn.query_row(
            "SELECT styles FROM theme WHERE id = 1",
            [],
            |row| row.get(0),
        ).unwrap_or_else(|_| "{}".to_string());
        
        let styles: serde_json::Value = serde_json::from_str(&styles_str)?;
        Ok(Theme { styles })
    }

    #[tauri::command]
    fn update_theme(state: tauri::State<AppState>, styles: serde_json::Value) -> Result<()> {
        let db = state.db.lock().unwrap();
        let conn = db.as_ref().ok_or(Error::DbConnection)?;
        let styles_str = serde_json::to_string(&styles)?;
        
        conn.execute(
            "INSERT OR REPLACE INTO theme (id, styles) VALUES (1, ?1)",
            [&styles_str],
        )?;

        Ok(())
    }


    fn main() {
        tauri::Builder::default()
            .plugin(tauri_plugin_opener::init())
            .manage(AppState { db: Mutex::new(None) })
            .setup(|app| {
                let handle = app.handle();
                let app_state = app.state::<AppState>();
                
                let db_path = db::get_db_path(&handle);
                let conn = db::init_db(&db_path).expect("Database initialization failed");
                *app_state.db.lock().unwrap() = Some(conn);

                Ok(())
            })
            .invoke_handler(tauri::generate_handler![
                get_factures,
                create_facture,
                update_facture,
                delete_facture,
                get_settings,
                update_settings,
                get_theme,
                update_theme
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    }
