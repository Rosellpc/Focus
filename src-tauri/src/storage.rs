use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePoolOptions, Row, SqlitePool};
use std::{
    collections::HashSet,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{Manager, State};

#[derive(Default)]
pub struct Storage(pub tauri::async_runtime::Mutex<Option<SqlitePool>>);
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Habit {
    id: String,
    title: String,
    target_hours: f64,
    color: String,
    created_on: String,
    archived_on: Option<String>,
}
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Log {
    habit_id: String,
    log_date: String,
    logged_minutes: i64,
    #[serde(default)]
    completed: bool,
}
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Goal {
    habit_id: String,
    effective_on: String,
    target_hours: f64,
}
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Activity {
    habit_id: String,
    effective_on: String,
    active: bool,
}
#[derive(Serialize, Deserialize)]
pub struct Backup {
    version: u32,
    habits: Vec<Habit>,
    logs: Vec<Log>,
    goals: Vec<Goal>,
    #[serde(default)]
    activity: Vec<Activity>,
}
fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}
fn valid_date(s: &str) -> bool {
    let parts: Vec<_> = s.split('-').collect();
    if s.len() != 10
        || parts.len() != 3
        || parts[0].len() != 4
        || parts[1].len() != 2
        || parts[2].len() != 2
    {
        return false;
    }
    let (Ok(y), Ok(m), Ok(d)) = (
        parts[0].parse::<u32>(),
        parts[1].parse::<u32>(),
        parts[2].parse::<u32>(),
    ) else {
        return false;
    };
    let max = match m {
        2 if y % 4 == 0 && (y % 100 != 0 || y % 400 == 0) => 29,
        2 => 28,
        4 | 6 | 9 | 11 => 30,
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        _ => 0,
    };
    y >= 1970 && y <= 9999 && d >= 1 && d <= max
}
fn valid_hours(h: f64) -> bool {
    h.is_finite() && h > 0.0 && h <= 24.0 && (h * 60.0 - (h * 60.0).round()).abs() < 0.00001
}
fn valid_color(s: &str) -> bool {
    matches!(s, "blue" | "amber" | "purple" | "emerald" | "rose")
}
fn normalize_color(s: &str) -> String {
    for color in ["amber", "purple", "emerald", "rose"] {
        if s.contains(color) {
            return color.into();
        }
    }
    "blue".into()
}
async fn execute_script(conn: &mut sqlx::SqliteConnection, sql: &str) -> Result<(), sqlx::Error> {
    for statement in sql.split(';').filter(|s| !s.trim().is_empty()) {
        sqlx::query(statement).execute(&mut *conn).await?;
    }
    Ok(())
}
async fn pool(app: &tauri::AppHandle, storage: &Storage) -> Result<SqlitePool, String> {
    let mut guard = storage.0.lock().await;
    if let Some(db) = guard.as_ref() {
        return Ok(db.clone());
    }
    let dir = app.path().app_config_dir().map_err(err)?;
    std::fs::create_dir_all(&dir).map_err(err)?;
    let options = sqlx::sqlite::SqliteConnectOptions::new()
        .filename(dir.join("dailyfocus.db"))
        .create_if_missing(true)
        .foreign_keys(true)
        .busy_timeout(std::time::Duration::from_secs(10));
    let db = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await
        .map_err(err)?;
    migrate(&db).await?;
    *guard = Some(db.clone());
    Ok(db)
}
async fn migrate(db: &SqlitePool) -> Result<(), String> {
    let mut tx = db.begin().await.map_err(err)?;
    execute_script(&mut tx, "CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY); CREATE TABLE IF NOT EXISTS habits(id TEXT PRIMARY KEY,title TEXT NOT NULL,target_hours REAL NOT NULL,color TEXT NOT NULL); CREATE TABLE IF NOT EXISTS daily_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,habit_id TEXT NOT NULL REFERENCES habits(id),log_date TEXT NOT NULL,logged_minutes INTEGER NOT NULL DEFAULT 0,UNIQUE(habit_id,log_date));").await.map_err(err)?;
    let migrated: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM schema_migrations WHERE version=1")
            .fetch_one(&mut *tx)
            .await
            .map_err(err)?;
    if migrated == 0 {
        execute_script(&mut tx, "ALTER TABLE habits ADD COLUMN created_on TEXT NOT NULL DEFAULT '1970-01-01'; ALTER TABLE habits ADD COLUMN archived_on TEXT; CREATE TABLE habit_goals(habit_id TEXT NOT NULL REFERENCES habits(id),effective_on TEXT NOT NULL,target_hours REAL NOT NULL CHECK(target_hours>0 AND target_hours<=24),PRIMARY KEY(habit_id,effective_on)); CREATE INDEX IF NOT EXISTS logs_date ON daily_logs(log_date);").await.map_err(err)?;
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM habits")
            .fetch_one(&mut *tx)
            .await
            .map_err(err)?;
        if count == 0 {
            for (id, title, hours, color) in [
                ("prog", "Programación", 6.0, "blue"),
                ("read", "Lectura", 2.0, "amber"),
                ("eng", "Inglés", 1.0, "purple"),
                ("ml", "Machine Learning", 1.0, "emerald"),
                ("ex", "Ejercicio", 1.0, "rose"),
            ] {
                sqlx::query("INSERT INTO habits(id,title,target_hours,color,created_on) VALUES(?,?,?,?,date('now','localtime'))")
                    .bind(id)
                    .bind(title)
                    .bind(hours)
                    .bind(color)
                    .execute(&mut *tx)
                    .await
                    .map_err(err)?;
            }
        }
        let rows = sqlx::query("SELECT id,color FROM habits")
            .fetch_all(&mut *tx)
            .await
            .map_err(err)?;
        for row in rows {
            sqlx::query("UPDATE habits SET color=? WHERE id=?")
                .bind(normalize_color(row.get("color")))
                .bind(row.get::<String, _>("id"))
                .execute(&mut *tx)
                .await
                .map_err(err)?;
        }
        execute_script(&mut tx, "INSERT INTO habit_goals SELECT id,created_on,target_hours FROM habits; INSERT INTO schema_migrations VALUES(1);").await.map_err(err)?;
    }
    let migrated: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM schema_migrations WHERE version=2")
            .fetch_one(&mut *tx)
            .await
            .map_err(err)?;
    if migrated == 0 {
        execute_script(&mut tx, "CREATE TABLE habit_activity(habit_id TEXT NOT NULL REFERENCES habits(id),effective_on TEXT NOT NULL,active INTEGER NOT NULL,PRIMARY KEY(habit_id,effective_on)); INSERT INTO habit_activity SELECT id,created_on,1 FROM habits; INSERT OR REPLACE INTO habit_activity SELECT id,archived_on,0 FROM habits WHERE archived_on IS NOT NULL; INSERT INTO schema_migrations VALUES(2);").await.map_err(err)?;
    }
    let migrated: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM schema_migrations WHERE version=3")
            .fetch_one(&mut *tx)
            .await
            .map_err(err)?;
    if migrated == 0 {
        execute_script(&mut tx,"ALTER TABLE daily_logs ADD COLUMN completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN(0,1)); INSERT INTO schema_migrations VALUES(3);").await.map_err(err)?;
    }
    tx.commit().await.map_err(err)?;
    Ok(())
}
async fn read_snapshot(db: &SqlitePool) -> Result<Backup, String> {
    let mut tx = db.begin().await.map_err(err)?;
    let habits = sqlx::query("SELECT id,title,CAST(target_hours AS REAL) AS target_hours,color,created_on,archived_on FROM habits ORDER BY rowid")
        .fetch_all(&mut *tx)
        .await
        .map_err(err)?
        .iter()
        .map(|r| Habit {
            id: r.get("id"),
            title: r.get("title"),
            target_hours: r.get("target_hours"),
            color: r.get("color"),
            created_on: r.get("created_on"),
            archived_on: r.get("archived_on"),
        })
        .collect();
    let logs = sqlx::query("SELECT * FROM daily_logs ORDER BY log_date,habit_id")
        .fetch_all(&mut *tx)
        .await
        .map_err(err)?
        .iter()
        .map(|r| Log {
            habit_id: r.get("habit_id"),
            log_date: r.get("log_date"),
            logged_minutes: r.get("logged_minutes"),
            completed: r.get("completed"),
        })
        .collect();
    let goals = sqlx::query("SELECT * FROM habit_goals ORDER BY effective_on")
        .fetch_all(&mut *tx)
        .await
        .map_err(err)?
        .iter()
        .map(|r| Goal {
            habit_id: r.get("habit_id"),
            effective_on: r.get("effective_on"),
            target_hours: r.get("target_hours"),
        })
        .collect();
    let activity = sqlx::query("SELECT * FROM habit_activity ORDER BY effective_on")
        .fetch_all(&mut *tx)
        .await
        .map_err(err)?
        .iter()
        .map(|r| Activity {
            habit_id: r.get("habit_id"),
            effective_on: r.get("effective_on"),
            active: r.get("active"),
        })
        .collect();
    tx.commit().await.map_err(err)?;
    Ok(Backup {
        version: 3,
        habits,
        logs,
        goals,
        activity,
    })
}
#[tauri::command]
pub async fn snapshot(
    app: tauri::AppHandle,
    storage: State<'_, Storage>,
) -> Result<Backup, String> {
    read_snapshot(&pool(&app, &storage).await?).await
}
#[tauri::command]
pub async fn save_minutes(
    app: tauri::AppHandle,
    storage: State<'_, Storage>,
    habit_id: String,
    date: String,
    minutes: i64,
    delta: bool,
) -> Result<(), String> {
    if !valid_date(&date)
        || (!delta && !(0..=1440).contains(&minutes))
        || (delta && !(-1440..=1440).contains(&minutes))
    {
        return Err("Fecha o minutos inválidos".into());
    }
    let db = pool(&app, &storage).await?;
    apply_minutes(&db, &habit_id, &date, minutes, delta).await
}
async fn apply_minutes(
    db: &SqlitePool,
    habit_id: &str,
    date: &str,
    minutes: i64,
    delta: bool,
) -> Result<(), String> {
    let mut tx = db.begin().await.map_err(err)?;
    let exists:i64=sqlx::query_scalar("SELECT COUNT(*) FROM habits WHERE id=? AND created_on<=? AND COALESCE((SELECT active FROM habit_activity WHERE habit_id=habits.id AND effective_on<=? ORDER BY effective_on DESC LIMIT 1),0)=1").bind(&habit_id).bind(&date).bind(&date).fetch_one(&mut *tx).await.map_err(err)?;
    if exists == 0 {
        return Err("El hábito no está activo en esa fecha".into());
    }
    sqlx::query("INSERT INTO daily_logs(habit_id,log_date,logged_minutes) VALUES(?,?,MAX(0,MIN(1440,?))) ON CONFLICT(habit_id,log_date) DO UPDATE SET logged_minutes=MAX(0,MIN(1440,CASE WHEN ? THEN daily_logs.logged_minutes+? ELSE ? END))").bind(&habit_id).bind(&date).bind(minutes).bind(delta).bind(minutes).bind(minutes).execute(&mut *tx).await.map_err(err)?;
    tx.commit().await.map_err(err)?;
    Ok(())
}
#[tauri::command]
pub async fn complete_habit(
    app: tauri::AppHandle,
    storage: State<'_, Storage>,
    habit_id: String,
    date: String,
    completed: bool,
) -> Result<(), String> {
    if !valid_date(&date) {
        return Err("Fecha inválida".into());
    }
    apply_completion(&pool(&app, &storage).await?, &habit_id, &date, completed).await
}
async fn apply_completion(
    db: &SqlitePool,
    id: &str,
    date: &str,
    completed: bool,
) -> Result<(), String> {
    let mut tx = db.begin().await.map_err(err)?;
    let goal:Option<f64>=sqlx::query_scalar("SELECT CAST(COALESCE((SELECT target_hours FROM habit_goals WHERE habit_id=h.id AND effective_on<=? ORDER BY effective_on DESC LIMIT 1),h.target_hours) AS REAL) FROM habits h WHERE h.id=? AND h.created_on<=? AND COALESCE((SELECT active FROM habit_activity WHERE habit_id=h.id AND effective_on<=? ORDER BY effective_on DESC LIMIT 1),0)=1").bind(date).bind(id).bind(date).bind(date).fetch_optional(&mut *tx).await.map_err(err)?;
    let goal = goal.ok_or("El hábito no está activo en esa fecha")?;
    if completed {
        sqlx::query("INSERT INTO daily_logs(habit_id,log_date,logged_minutes,completed) VALUES(?,?,?,1) ON CONFLICT(habit_id,log_date) DO UPDATE SET logged_minutes=MAX(daily_logs.logged_minutes,excluded.logged_minutes),completed=1").bind(id).bind(date).bind((goal*60.0).round() as i64).execute(&mut *tx).await.map_err(err)?;
    } else {
        sqlx::query("UPDATE daily_logs SET completed=0 WHERE habit_id=? AND log_date=?")
            .bind(id)
            .bind(date)
            .execute(&mut *tx)
            .await
            .map_err(err)?;
    }
    tx.commit().await.map_err(err)?;
    Ok(())
}
#[tauri::command]
pub async fn save_habit(
    app: tauri::AppHandle,
    storage: State<'_, Storage>,
    id: String,
    title: String,
    target_hours: f64,
    color: String,
    date: String,
) -> Result<(), String> {
    let title = title.trim();
    if id.is_empty()
        || id.len() > 100
        || title.is_empty()
        || title.chars().count() > 80
        || !valid_hours(target_hours)
        || !valid_color(&color)
        || !valid_date(&date)
    {
        return Err("Revisa el nombre, la fecha y la meta (1 minuto a 24 horas)".into());
    }
    let db = pool(&app, &storage).await?;
    let mut tx = db.begin().await.map_err(err)?;
    sqlx::query("INSERT INTO habits(id,title,target_hours,color,created_on) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,target_hours=excluded.target_hours,color=excluded.color").bind(&id).bind(title).bind(target_hours).bind(color).bind(&date).execute(&mut *tx).await.map_err(err)?;
    sqlx::query("INSERT INTO habit_activity(habit_id,effective_on,active) SELECT ?,?,1 WHERE NOT EXISTS(SELECT 1 FROM habit_activity WHERE habit_id=?)").bind(&id).bind(&date).bind(&id).execute(&mut *tx).await.map_err(err)?;
    sqlx::query("INSERT INTO habit_goals VALUES(?,?,?) ON CONFLICT(habit_id,effective_on) DO UPDATE SET target_hours=excluded.target_hours").bind(id).bind(date).bind(target_hours).execute(&mut *tx).await.map_err(err)?;
    tx.commit().await.map_err(err)?;
    Ok(())
}
#[tauri::command]
pub async fn archive_habit(
    app: tauri::AppHandle,
    storage: State<'_, Storage>,
    id: String,
    date: String,
    archived: bool,
) -> Result<(), String> {
    if !valid_date(&date) {
        return Err("Fecha inválida".into());
    }
    let db = pool(&app, &storage).await?;
    let mut tx = db.begin().await.map_err(err)?;
    sqlx::query("UPDATE habits SET archived_on=? WHERE id=?")
        .bind(if archived { Some(date.clone()) } else { None })
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(err)?;
    sqlx::query("INSERT INTO habit_activity VALUES(?,?,?) ON CONFLICT(habit_id,effective_on) DO UPDATE SET active=excluded.active").bind(id).bind(date).bind(!archived).execute(&mut *tx).await.map_err(err)?;
    tx.commit().await.map_err(err)?;
    Ok(())
}
fn validate_backup(b: &Backup) -> Result<(), String> {
    if ![1, 2, 3].contains(&b.version)
        || b.habits.len() > 1000
        || b.logs.len() > 1000000
        || b.goals.len() > 100000
    {
        return Err("Formato o tamaño de respaldo no compatible".into());
    }
    let mut ids = HashSet::new();
    for h in &b.habits {
        if h.id.is_empty()
            || h.id.len() > 100
            || !ids.insert(h.id.clone())
            || h.title.trim().is_empty()
            || h.title.chars().count() > 80
            || !valid_hours(h.target_hours)
            || !valid_color(&h.color)
            || !valid_date(&h.created_on)
            || h.archived_on
                .as_ref()
                .is_some_and(|d| !valid_date(d) || d < &h.created_on)
        {
            return Err("Hábito inválido en el respaldo".into());
        }
    }
    let mut log_keys = HashSet::new();
    for l in &b.logs {
        if !ids.contains(&l.habit_id)
            || !valid_date(&l.log_date)
            || !(0..=1440).contains(&l.logged_minutes)
            || !log_keys.insert((&l.habit_id, &l.log_date))
        {
            return Err("Registro inválido en el respaldo".into());
        }
    }
    let mut goal_keys = HashSet::new();
    for g in &b.goals {
        if !ids.contains(&g.habit_id)
            || !valid_date(&g.effective_on)
            || !valid_hours(g.target_hours)
            || !goal_keys.insert((&g.habit_id, &g.effective_on))
        {
            return Err("Meta inválida en el respaldo".into());
        }
    }
    for h in &b.habits {
        if !b
            .goals
            .iter()
            .any(|g| g.habit_id == h.id && g.effective_on == h.created_on)
        {
            return Err("Falta la meta inicial de un hábito".into());
        }
    }
    let mut activity_keys = HashSet::new();
    for a in &b.activity {
        if !ids.contains(&a.habit_id)
            || !valid_date(&a.effective_on)
            || !activity_keys.insert((&a.habit_id, &a.effective_on))
        {
            return Err("Actividad inválida en el respaldo".into());
        }
    }
    if b.version >= 2 {
        for h in &b.habits {
            if !b
                .activity
                .iter()
                .any(|a| a.habit_id == h.id && a.effective_on == h.created_on)
            {
                return Err("Falta el historial de actividad".into());
            }
        }
    }
    Ok(())
}
fn write_backup(app: &tauri::AppHandle, b: &Backup) -> Result<String, String> {
    let dir = app.path().app_config_dir().map_err(err)?.join("backups");
    std::fs::create_dir_all(&dir).map_err(err)?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(err)?
        .as_nanos();
    let path = dir.join(format!("Focus-{stamp}.json"));
    std::fs::write(&path, serde_json::to_vec_pretty(b).map_err(err)?).map_err(err)?;
    Ok(path.to_string_lossy().into_owned())
}
#[tauri::command]
pub async fn export_backup(
    app: tauri::AppHandle,
    storage: State<'_, Storage>,
) -> Result<String, String> {
    write_backup(&app, &read_snapshot(&pool(&app, &storage).await?).await?)
}
#[tauri::command]
pub async fn import_backup(
    app: tauri::AppHandle,
    storage: State<'_, Storage>,
    content: String,
) -> Result<String, String> {
    if content.len() > 50_000_000 {
        return Err("El respaldo supera 50 MB".into());
    }
    let mut b: Backup = serde_json::from_str(&content).map_err(err)?;
    validate_backup(&b)?;
    if b.version == 1 {
        for h in &b.habits {
            b.activity.push(Activity {
                habit_id: h.id.clone(),
                effective_on: h.created_on.clone(),
                active: true,
            });
            if let Some(d) = &h.archived_on {
                b.activity.push(Activity {
                    habit_id: h.id.clone(),
                    effective_on: d.clone(),
                    active: false,
                });
            }
        }
    }
    let db = pool(&app, &storage).await?;
    let previous = write_backup(&app, &read_snapshot(&db).await?)?;
    apply_backup(&db, b).await?;
    Ok(previous)
}
async fn apply_backup(db: &SqlitePool, b: Backup) -> Result<(), String> {
    let mut tx = db.begin().await.map_err(err)?;
    execute_script(&mut tx, "DELETE FROM daily_logs; DELETE FROM habit_goals; DELETE FROM habit_activity; DELETE FROM habits;").await.map_err(err)?;
    for h in b.habits {
        sqlx::query("INSERT INTO habits(id,title,target_hours,color,created_on,archived_on) VALUES(?,?,?,?,?,?)").bind(h.id).bind(h.title).bind(h.target_hours).bind(h.color).bind(h.created_on).bind(h.archived_on).execute(&mut *tx).await.map_err(err)?;
    }
    for l in b.logs {
        sqlx::query(
            "INSERT INTO daily_logs(habit_id,log_date,logged_minutes,completed) VALUES(?,?,?,?)",
        )
        .bind(l.habit_id)
        .bind(l.log_date)
        .bind(l.logged_minutes)
        .bind(l.completed)
        .execute(&mut *tx)
        .await
        .map_err(err)?;
    }
    for g in b.goals {
        sqlx::query("INSERT INTO habit_goals VALUES(?,?,?)")
            .bind(g.habit_id)
            .bind(g.effective_on)
            .bind(g.target_hours)
            .execute(&mut *tx)
            .await
            .map_err(err)?;
    }
    for a in b.activity {
        sqlx::query("INSERT INTO habit_activity VALUES(?,?,?)")
            .bind(a.habit_id)
            .bind(a.effective_on)
            .bind(a.active)
            .execute(&mut *tx)
            .await
            .map_err(err)?;
    }
    tx.commit().await.map_err(err)?;
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn dates_and_goals() {
        assert!(valid_date("2024-02-29"));
        assert!(!valid_date("2025-02-29"));
        assert!(!valid_date("2026-04-31"));
        assert!(!valid_date("2026-1-01"));
        assert!(valid_hours(0.5));
        assert!(!valid_hours(0.0));
        assert!(!valid_hours(25.0));
    }
    #[test]
    fn invalid_backups_are_rejected() {
        let mut b = Backup {
            version: 1,
            habits: vec![Habit {
                id: "a".into(),
                title: "Leer".into(),
                target_hours: 1.0,
                color: "blue".into(),
                created_on: "2026-01-01".into(),
                archived_on: None,
            }],
            logs: vec![],
            goals: vec![Goal {
                habit_id: "a".into(),
                effective_on: "2026-01-01".into(),
                target_hours: 1.0,
            }],
            activity: vec![],
        };
        assert!(validate_backup(&b).is_ok());
        b.logs.push(Log {
            habit_id: "missing".into(),
            log_date: "2026-01-01".into(),
            logged_minutes: 30,
            completed: false,
        });
        assert!(validate_backup(&b).is_err());
    }
    #[test]
    fn migrate_legacy_and_restore_atomically() {
        tauri::async_runtime::block_on(async {
            let options = sqlx::sqlite::SqliteConnectOptions::new()
                .filename(":memory:")
                .foreign_keys(true);
            let db = SqlitePoolOptions::new()
                .max_connections(1)
                .connect_with(options)
                .await
                .unwrap();
            let mut conn = db.acquire().await.unwrap();
            execute_script(&mut conn,"CREATE TABLE habits(id TEXT PRIMARY KEY,title TEXT NOT NULL,target_hours INTEGER NOT NULL,color TEXT NOT NULL); CREATE TABLE daily_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,habit_id TEXT NOT NULL REFERENCES habits(id),log_date TEXT NOT NULL,logged_minutes INTEGER NOT NULL DEFAULT 0,UNIQUE(habit_id,log_date)); INSERT INTO habits VALUES('prog','Programación',6,'from-blue-500/20 to-cyan-500/20'); INSERT INTO daily_logs(habit_id,log_date,logged_minutes) VALUES('prog','2026-10-06',90);").await.unwrap();
            drop(conn);
            migrate(&db).await.unwrap();
            migrate(&db).await.unwrap();
            let before = read_snapshot(&db).await.unwrap();
            assert_eq!(before.habits.len(), 1);
            assert_eq!(before.logs[0].logged_minutes, 90);
            assert_eq!(before.habits[0].color, "blue");
            assert_eq!(before.habits[0].target_hours, 6.0);
            assert!(!before.logs[0].completed);
            apply_completion(&db, "prog", "2026-10-06", true)
                .await
                .unwrap();
            apply_completion(&db, "prog", "2026-10-06", true)
                .await
                .unwrap();
            let done = read_snapshot(&db).await.unwrap();
            assert!(done.logs[0].completed);
            assert_eq!(done.logs[0].logged_minutes, 360);
            assert!(!done.logs.iter().any(|l| l.log_date == "2026-10-07"));
            validate_backup(&done).unwrap();
            apply_backup(
                &db,
                serde_json::from_str(&serde_json::to_string(&done).unwrap()).unwrap(),
            )
            .await
            .unwrap();
            assert!(read_snapshot(&db).await.unwrap().logs[0].completed);
            apply_minutes(&db, "prog", "2026-10-06", 400, false)
                .await
                .unwrap();
            apply_completion(&db, "prog", "2026-10-06", true)
                .await
                .unwrap();
            assert_eq!(
                read_snapshot(&db).await.unwrap().logs[0].logged_minutes,
                400
            );
            apply_completion(&db, "prog", "2026-10-06", false)
                .await
                .unwrap();
            assert!(!read_snapshot(&db).await.unwrap().logs[0].completed);
            apply_minutes(&db, "prog", "2026-10-06", 90, false)
                .await
                .unwrap();
            validate_backup(&before).unwrap();
            let json = serde_json::to_string(&before).unwrap();
            let roundtrip: Backup = serde_json::from_str(&json).unwrap();
            apply_backup(&db, roundtrip).await.unwrap();
            let mut invalid: Backup = serde_json::from_str(&json).unwrap();
            invalid.logs.push(Log {
                habit_id: "unknown".into(),
                log_date: "2026-10-07".into(),
                logged_minutes: 30,
                completed: false,
            });
            assert!(apply_backup(&db, invalid).await.is_err());
            let after = read_snapshot(&db).await.unwrap();
            assert_eq!(serde_json::to_string(&after).unwrap(), json);
            let first = db.clone();
            let second = db.clone();
            let a = tauri::async_runtime::spawn(async move {
                apply_minutes(&first, "prog", "2026-10-06", 30, true).await
            });
            let b = tauri::async_runtime::spawn(async move {
                apply_minutes(&second, "prog", "2026-10-06", 60, true).await
            });
            a.await.unwrap().unwrap();
            b.await.unwrap().unwrap();
            assert_eq!(
                read_snapshot(&db).await.unwrap().logs[0].logged_minutes,
                180
            );
            apply_minutes(&db, "prog", "2026-10-06", 0, false)
                .await
                .unwrap();
            assert_eq!(read_snapshot(&db).await.unwrap().logs[0].logged_minutes, 0);
            apply_minutes(&db, "prog", "2026-10-06", 1440, true)
                .await
                .unwrap();
            apply_minutes(&db, "prog", "2026-10-06", 60, true)
                .await
                .unwrap();
            assert_eq!(
                read_snapshot(&db).await.unwrap().logs[0].logged_minutes,
                1440
            );
            sqlx::query("INSERT INTO habit_activity VALUES('prog','2026-10-07',0)")
                .execute(&db)
                .await
                .unwrap();
            assert!(apply_minutes(&db, "prog", "2026-10-07", 30, true)
                .await
                .is_err());
            apply_minutes(&db, "prog", "2026-10-06", 30, false)
                .await
                .unwrap();
        });
    }
    #[test]
    fn persistence_after_reopen() {
        tauri::async_runtime::block_on(async {
            let stamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            let path = std::env::temp_dir().join(format!("focus-test-{stamp}.db"));
            let opts = sqlx::sqlite::SqliteConnectOptions::new()
                .filename(&path)
                .create_if_missing(true)
                .foreign_keys(true);
            let db = SqlitePoolOptions::new()
                .max_connections(1)
                .connect_with(opts.clone())
                .await
                .unwrap();
            migrate(&db).await.unwrap();
            let date = read_snapshot(&db)
                .await
                .unwrap()
                .habits
                .into_iter()
                .find(|h| h.id == "read")
                .unwrap()
                .created_on;
            apply_minutes(&db, "read", &date, 45, false).await.unwrap();
            apply_completion(&db, "read", &date, true).await.unwrap();
            db.close().await;
            let reopened = SqlitePoolOptions::new()
                .max_connections(1)
                .connect_with(opts)
                .await
                .unwrap();
            migrate(&reopened).await.unwrap();
            assert_eq!(
                read_snapshot(&reopened).await.unwrap().logs[0].logged_minutes,
                120
            );
            assert!(read_snapshot(&reopened).await.unwrap().logs[0].completed);
            reopened.close().await;
            std::fs::remove_file(path).unwrap();
        });
    }
}
