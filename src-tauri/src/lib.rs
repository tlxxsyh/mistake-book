#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use base64::{Engine as _, engine::general_purpose};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Mistake {
    pub id: String,
    pub question_text: String,
    pub question_images: Vec<String>,
    pub answer_text: String,
    pub answer_images: Vec<String>,
    pub subject: String,
    pub source: String,
    pub is_favorite: bool,
    pub tags: Vec<String>,
    pub note: String,
    pub created_at: i64,
    #[serde(default)]
    pub wrong_count: i32,
    #[serde(default)]
    pub correct_count: i32,
    #[serde(default)]
    pub last_reviewed_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub custom_data_dir: Option<String>,
    #[serde(default)]
    pub exam_date: Option<String>,
    #[serde(default)]
    pub quotes: Vec<String>,
    #[serde(default)]
    pub home_background: Option<String>,
    #[serde(default)]
    pub is_dark_mode: bool,
    #[serde(default = "default_countdown_name")]
    pub countdown_name: String,
}

fn default_countdown_name() -> String {
    "倒计时".to_string()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TodoGroup {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub sort_order: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TodoItem {
    pub id: String,
    pub group_id: String,
    pub name: String,
    #[serde(default = "default_timer_type")]
    pub timer_type: String,
    #[serde(default)]
    pub custom_minutes: u32,
}

fn default_timer_type() -> String { "countdown_25".to_string() }

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimerRecord {
    pub id: String,
    pub item_id: String,
    pub group_id: String,
    pub item_name: String,
    pub group_name: String,
    pub duration_seconds: u64,
    pub started_at: i64,
    pub ended_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlanItem {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub scope: String,
    pub target_date: String,
    #[serde(default)]
    pub completed: bool,
    #[serde(default)]
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NoteLink {
    pub url: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NoteItem {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub content: String,
    #[serde(default)]
    pub links: Vec<NoteLink>,
    #[serde(default)]
    pub images: Vec<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub is_pinned: bool,
    #[serde(default)]
    pub created_at: i64,
    #[serde(default)]
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReviewQueueItem {
    pub mistake_id: String,
    #[serde(default)]
    pub added_at: i64,
    #[serde(default)]
    pub consecutive_correct: i32,
    #[serde(default)]
    pub review_stage: i32, // 0: 初始阶段, 1: 7天间隔, 2: 30天间隔, 3: 完全掌握
    #[serde(default)]
    pub next_review_at: Option<i64>,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            custom_data_dir: None,
            exam_date: None,
            quotes: vec![
                "星光不问赶路人，时光不负有心人。".to_string(),
                "你背单词时，阿拉斯加的鳕鱼正跃出水面；你算数学时，太平洋彼岸的海鸥振翅掠过城市上空；你晚自习时，极圈上的夜空散漫了五彩斑斓。但是少年你别急，在你为自己未来踏踏实实地努力时，那些你感觉从来不会看到的景色，那些你觉得终身不会遇到的人，正一步步向你走来。".to_string(),
                "种一棵树最好的时间是十年前，其次是现在。".to_string(),
                "乾坤未定，你我皆是黑马。".to_string(),
                "将来的你，一定会感谢现在拼命的自己。".to_string(),
            ],
            home_background: None,
            is_dark_mode: false,
            countdown_name: "倒计时".to_string(),
        }
    }
}

fn get_settings_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or("无法获取配置目录".to_string())?
        .join("mistake-book");
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| format!("创建配置目录失败: {}", e))?;
    }
    Ok(config_dir.join("settings.json"))
}

fn load_settings() -> Result<Settings, String> {
    let path = get_settings_path()?;
    if !path.exists() {
        return Ok(Settings::default());
    }
    let content = fs::read_to_string(&path).map_err(|e| format!("读取设置失败: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("解析设置失败: {}", e))
}

fn save_settings(settings: &Settings) -> Result<(), String> {
    let path = get_settings_path()?;
    let content = serde_json::to_string_pretty(settings).map_err(|e| format!("序列化设置失败: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("保存设置失败: {}", e))?;
    Ok(())
}

fn get_default_data_dir() -> Result<PathBuf, String> {
    Ok(dirs::data_dir()
        .ok_or("无法获取数据目录".to_string())?
        .join("mistake-book"))
}

fn get_app_data_dir() -> Result<PathBuf, String> {
    let settings = load_settings()?;
    if let Some(ref custom) = settings.custom_data_dir {
        let dir = PathBuf::from(custom);
        if !dir.exists() {
            fs::create_dir_all(&dir).map_err(|e| format!("创建自定义数据目录失败: {}", e))?;
        }
        return Ok(dir);
    }
    let dir = get_default_data_dir()?;
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("创建目录失败: {}", e))?;
    }
    Ok(dir)
}

fn get_images_dir() -> Result<PathBuf, String> {
    let dir = get_app_data_dir()?.join("images");
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("创建图片目录失败: {}", e))?;
    }
    Ok(dir)
}

fn get_data_file_path() -> Result<PathBuf, String> {
    Ok(get_app_data_dir()?.join("mistakes.json"))
}

fn get_todo_groups_path() -> Result<PathBuf, String> {
    Ok(get_app_data_dir()?.join("todo_groups.json"))
}

fn get_timer_records_path() -> Result<PathBuf, String> {
    Ok(get_app_data_dir()?.join("timer_records.json"))
}

fn get_plans_path() -> Result<PathBuf, String> {
    Ok(get_app_data_dir()?.join("plans.json"))
}

fn get_notes_path() -> Result<PathBuf, String> {
    Ok(get_app_data_dir()?.join("notes.json"))
}

fn get_review_queue_path() -> Result<PathBuf, String> {
    Ok(get_app_data_dir()?.join("review_queue.json"))
}

fn migrate_data(old_dir: &PathBuf, new_dir: &PathBuf) -> Result<(), String> {
    let old_images = old_dir.join("images");
    let new_images = new_dir.join("images");
    let old_data = old_dir.join("mistakes.json");
    let new_data = new_dir.join("mistakes.json");

    if !old_dir.exists() || !old_data.exists() {
        return Ok(());
    }

    fs::create_dir_all(new_dir).map_err(|e| format!("创建新数据目录失败: {}", e))?;

    if old_images.exists() && new_images != old_images {
        fs::create_dir_all(&new_images).map_err(|e| format!("创建新图片目录失败: {}", e))?;
        for entry in fs::read_dir(&old_images).map_err(|e| format!("读取旧图片目录失败: {}", e))? {
            let entry = entry.map_err(|e| format!("读取文件条目失败: {}", e))?;
            let dest = new_images.join(entry.file_name());
            fs::copy(entry.path(), &dest).map_err(|e| format!("复制图片 {} 失败: {}", entry.path().display(), e))?;
        }
        fs::remove_dir_all(&old_images).map_err(|e| format!("删除旧图片目录失败: {}", e))?;
    }

    if new_data != old_data {
        fs::copy(&old_data, &new_data).map_err(|e| format!("复制数据文件失败: {}", e))?;
        fs::remove_file(&old_data).map_err(|e| format!("删除旧数据文件失败: {}", e))?;
    }

    if old_images.exists() || old_data.exists() {
        match fs::read_dir(old_dir) {
            Ok(entries) => {
                let has_remaining = entries.count() > 0;
                if !has_remaining {
                    let _ = fs::remove_dir(old_dir);
                }
            }
            Err(_) => {}
        }
    }

    Ok(())
}

#[tauri::command]
fn get_mistakes() -> Result<Vec<Mistake>, String> {
    let path = get_data_file_path()?;
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(&path).map_err(|e| format!("读取数据失败: {}", e))?;
    let mistakes: Vec<Mistake> = serde_json::from_str(&content).map_err(|e| format!("解析数据失败: {}", e))?;
    Ok(mistakes)
}

#[tauri::command]
fn save_mistakes(mistakes: Vec<Mistake>) -> Result<(), String> {
    let path = get_data_file_path()?;
    let content = serde_json::to_string_pretty(&mistakes).map_err(|e| format!("序列化失败: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("保存数据失败: {}", e))?;
    Ok(())
}

#[tauri::command]
fn add_mistake(
    id: String,
    question_text: String,
    question_images: Vec<String>,
    answer_text: String,
    answer_images: Vec<String>,
    subject: String,
    source: String,
    tags: Vec<String>,
    note: String,
) -> Result<Vec<Mistake>, String> {
    let mut mistakes = get_mistakes()?;
    mistakes.push(Mistake {
        id,
        question_text,
        question_images,
        answer_text,
        answer_images,
        subject,
        source,
        is_favorite: false,
        tags,
        note,
        created_at: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as i64,
        wrong_count: 0,
        correct_count: 0,
        last_reviewed_at: None,
    });
    save_mistakes(mistakes.clone())?;
    Ok(mistakes)
}

#[tauri::command]
fn update_mistake(
    id: String,
    question_text: String,
    question_images: Vec<String>,
    answer_text: String,
    answer_images: Vec<String>,
    subject: String,
    source: String,
    tags: Vec<String>,
    note: String,
) -> Result<(), String> {
    let mut mistakes = get_mistakes()?;
    if let Some(m) = mistakes.iter_mut().find(|m| m.id == id) {
        m.question_text = question_text;
        m.question_images = question_images;
        m.answer_text = answer_text;
        m.answer_images = answer_images;
        m.subject = subject;
        m.source = source;
        m.tags = tags;
        m.note = note;
    } else {
        return Err("未找到该错题".to_string());
    }
    save_mistakes(mistakes)
}

#[tauri::command]
fn delete_mistake(id: String) -> Result<Vec<Mistake>, String> {
    let mut mistakes = get_mistakes()?;
    mistakes.retain(|m| m.id != id);
    save_mistakes(mistakes.clone())?;

    let mut queue = get_review_queue().unwrap_or_default();
    let before = queue.len();
    queue.retain(|item| item.mistake_id != id);
    if queue.len() != before {
        save_review_queue(&queue)?;
    }

    Ok(mistakes)
}

#[tauri::command]
fn save_image(filename: &str, base64_data: &str) -> Result<String, String> {
    let dir = get_images_dir()?;
    let file_path = dir.join(filename);

    let data = base64_data
        .split(',')
        .nth(1)
        .ok_or("无效的 Base64 数据")?;

    let decoded = general_purpose::STANDARD.decode(data).map_err(|e| format!("Base64 解码失败: {}", e))?;
    fs::write(&file_path, &decoded).map_err(|e| format!("保存图片失败: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn read_image(path: &str) -> Result<String, String> {
    let path_buf = if PathBuf::from(path).is_absolute() {
        PathBuf::from(path)
    } else {
        get_images_dir()?.join(path)
    };

    let data = fs::read(&path_buf).map_err(|e| format!("读取图片失败: {}", e))?;
    let encoded = general_purpose::STANDARD.encode(&data);

    let ext = path_buf
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");

    let mime = match ext {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        _ => "image/png",
    };

    Ok(format!("data:{};base64,{}", mime, encoded))
}

#[tauri::command]
fn delete_image(path: &str) -> Result<(), String> {
    let path_buf = if PathBuf::from(path).is_absolute() {
        PathBuf::from(path)
    } else {
        get_images_dir()?.join(path)
    };

    if path_buf.exists() {
        fs::remove_file(&path_buf).map_err(|e| format!("删除图片失败: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn get_all_subjects_and_tags() -> Result<(Vec<String>, Vec<String>), String> {
    let mistakes = get_mistakes()?;
    let mut subjects: Vec<String> = vec![];
    let mut tags: Vec<String> = vec![];
    for m in mistakes {
        if !m.subject.is_empty() && !subjects.contains(&m.subject) {
            subjects.push(m.subject);
        }
        for tag in m.tags {
            if !tags.contains(&tag) {
                tags.push(tag);
            }
        }
    }
    subjects.sort();
    tags.sort();
    Ok((subjects, tags))
}

#[tauri::command]
fn get_all_sources() -> Result<Vec<String>, String> {
    let mistakes = get_mistakes()?;
    let mut sources: Vec<String> = vec![];
    for m in mistakes {
        if !m.source.is_empty() && !sources.contains(&m.source) {
            sources.push(m.source.clone());
        }
    }
    sources.sort();
    Ok(sources)
}

#[tauri::command]
fn toggle_favorite(id: String) -> Result<bool, String> {
    let mut mistakes = get_mistakes()?;
    let mut found = false;
    let mut is_fav = false;
    for m in &mut mistakes {
        if m.id == id {
            m.is_favorite = !m.is_favorite;
            is_fav = m.is_favorite;
            found = true;
            break;
        }
    }
    if !found {
        return Err("未找到该错题".to_string());
    }
    save_mistakes(mistakes)?;
    Ok(is_fav)
}

#[tauri::command]
fn record_review_result(id: String, is_correct: bool) -> Result<(i32, i32), String> {
    let mut mistakes = get_mistakes()?;
    let mut found = false;
    let mut wrong = 0;
    let mut correct = 0;
    for m in &mut mistakes {
        if m.id == id {
            if is_correct {
                m.correct_count += 1;
            } else {
                m.wrong_count += 1;
            }
            m.last_reviewed_at = Some(chrono::Utc::now().timestamp());
            wrong = m.wrong_count;
            correct = m.correct_count;
            found = true;
            break;
        }
    }
    if !found {
        return Err("未找到该错题".to_string());
    }
    save_mistakes(mistakes)?;
    Ok((wrong, correct))
}

#[tauri::command]
fn get_review_queue() -> Result<Vec<ReviewQueueItem>, String> {
    let path = get_review_queue_path()?;
    if !path.exists() { return Ok(vec![]); }
    let content = fs::read_to_string(&path).map_err(|e| format!("读取复习队列失败: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("解析复习队列失败: {}", e))
}

fn next_review_at(days_offset: i64) -> i64 {
    let now = chrono::Local::now();
    let target_date = now.date_naive() + chrono::Duration::days(days_offset);
    target_date.and_hms_opt(4, 0, 0)
        .unwrap()
        .and_local_timezone(chrono::Local)
        .single()
        .unwrap()
        .timestamp()
}

fn save_review_queue(queue: &[ReviewQueueItem]) -> Result<(), String> {
    let path = get_review_queue_path()?;
    let content = serde_json::to_string_pretty(queue).map_err(|e| format!("序列化复习队列失败: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("保存复习队列失败: {}", e))
}

#[tauri::command]
fn update_review_queue(mistake_id: String, is_correct: bool) -> Result<(), String> {
    let mut queue = get_review_queue().unwrap_or_default();

    if let Some(item) = queue.iter_mut().find(|i| i.mistake_id == mistake_id) {
        if is_correct {
            item.consecutive_correct += 1;

            match item.review_stage {
                0 => {
                    if item.consecutive_correct >= 1 {
                        item.review_stage = 1;
                        item.next_review_at = Some(next_review_at(7));
                        item.consecutive_correct = 0;
                    }
                }
                1 => {
                    if item.consecutive_correct >= 1 {
                        item.review_stage = 2;
                        item.next_review_at = Some(next_review_at(30));
                        item.consecutive_correct = 0;
                    }
                }
                2 => {
                    if item.consecutive_correct >= 1 {
                        item.review_stage = 3;
                        item.next_review_at = None;
                    }
                }
                _ => {}
            }
        } else {
            item.consecutive_correct = 0;
            item.review_stage = 0;
            item.next_review_at = Some(next_review_at(1));
        }
    } else if !is_correct {
        let now_ts = chrono::Local::now().timestamp();
        queue.push(ReviewQueueItem {
            mistake_id,
            added_at: now_ts,
            consecutive_correct: 0,
            review_stage: 0,
            next_review_at: Some(next_review_at(1)),
        });
    }

    save_review_queue(&queue)?;
    Ok(())
}

#[tauri::command]
fn add_to_review_queue(mistake_id: String) -> Result<(), String> {
    let mut queue = get_review_queue().unwrap_or_default();
    if !queue.iter().any(|i| i.mistake_id == mistake_id) {
        let now_ts = chrono::Local::now().timestamp();
        queue.push(ReviewQueueItem {
            mistake_id,
            added_at: now_ts,
            consecutive_correct: 0,
            review_stage: 0,
            next_review_at: Some(next_review_at(1)),
        });
        save_review_queue(&queue)?;
    }
    Ok(())
}

#[tauri::command]
fn get_app_info() -> Result<(String, String), String> {
    let data_dir = get_app_data_dir()?;
    let images_dir = get_images_dir()?;
    Ok((
        data_dir.to_string_lossy().to_string(),
        images_dir.to_string_lossy().to_string(),
    ))
}

#[tauri::command]
fn get_settings_info() -> Result<(String, String, String), String> {
    let settings = load_settings()?;
    let current_dir = get_app_data_dir()?;
    let default_dir = get_default_data_dir()?;
    Ok((
        current_dir.to_string_lossy().to_string(),
        default_dir.to_string_lossy().to_string(),
        settings.custom_data_dir.unwrap_or_default(),
    ))
}

#[tauri::command]
fn set_custom_data_dir(dir: Option<String>) -> Result<String, String> {
    let current_dir = get_app_data_dir()?;
    let mut settings = load_settings()?;
    let new_dir = if let Some(ref d) = dir {
        PathBuf::from(d)
    } else {
        get_default_data_dir()?
    };
    if new_dir == current_dir {
        return Ok(current_dir.to_string_lossy().to_string());
    }
    migrate_data(&current_dir, &new_dir)?;
    settings.custom_data_dir = dir;
    save_settings(&settings)?;
    Ok(new_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn get_home_settings() -> Result<(Option<String>, Vec<String>, Option<String>, bool, String), String> {
    let settings = load_settings()?;
    Ok((
        settings.exam_date,
        settings.quotes,
        settings.home_background,
        settings.is_dark_mode,
        settings.countdown_name,
    ))
}

#[tauri::command]
fn set_exam_date(date: Option<String>) -> Result<(), String> {
    let mut settings = load_settings()?;
    settings.exam_date = date;
    save_settings(&settings)?;
    Ok(())
}

#[tauri::command]
fn set_countdown_name(name: String) -> Result<(), String> {
    let mut settings = load_settings()?;
    settings.countdown_name = if name.trim().is_empty() { "倒计时".to_string() } else { name.trim().to_string() };
    save_settings(&settings)?;
    Ok(())
}

#[tauri::command]
fn set_quotes(quotes: Vec<String>) -> Result<(), String> {
    let mut settings = load_settings()?;
    settings.quotes = quotes;
    save_settings(&settings)?;
    Ok(())
}

#[tauri::command]
fn set_home_background(base64_data: Option<String>) -> Result<Option<String>, String> {
    let mut settings = load_settings()?;
    match base64_data {
        Some(data) => {
            if data.is_empty() || !data.starts_with("data:") {
                settings.home_background = None;
            } else {
                let dir = get_images_dir()?;
                let filename = format!("home_bg.{}", if data.contains("png") { "png" } else { "jpg" });
                let file_path = dir.join(&filename);
                let raw = data.split(',').nth(1).ok_or("无效的 Base64 数据")?;
                let decoded = general_purpose::STANDARD.decode(raw).map_err(|e| format!("Base64 解码失败: {}", e))?;
                fs::write(&file_path, &decoded).map_err(|e| format!("保存背景图失败: {}", e))?;
                settings.home_background = Some(filename);
            }
        }
        None => { settings.home_background = None; }
    }
    save_settings(&settings)?;
    Ok(settings.home_background.clone())
}

#[tauri::command]
fn set_dark_mode(is_dark: bool) -> Result<(), String> {
    let mut settings = load_settings()?;
    settings.is_dark_mode = is_dark;
    save_settings(&settings)?;
    Ok(())
}

#[tauri::command]
fn get_todo_data() -> Result<(Vec<TodoGroup>, Vec<TodoItem>), String> {
    let groups_path = get_todo_groups_path()?;
    let groups: Vec<TodoGroup> = if groups_path.exists() {
        let content = fs::read_to_string(&groups_path).map_err(|e| format!("读取待办组失败: {}", e))?;
        serde_json::from_str(&content).map_err(|e| format!("解析待办组失败: {}", e))?
    } else { vec![] };
    Ok((groups, vec![]))
}

#[tauri::command]
fn save_todo_data(groups: Vec<TodoGroup>, items: Vec<TodoItem>) -> Result<(), String> {
    let groups_path = get_todo_groups_path()?;
    let content = serde_json::to_string_pretty(&groups).map_err(|e| format!("序列化待办组失败: {}", e))?;
    fs::write(&groups_path, content).map_err(|e| format!("保存待办组失败: {}", e))?;

    let items_path = get_app_data_dir()?.join("todo_items.json");
    let content = serde_json::to_string_pretty(&items).map_err(|e| format!("序列化待办事项失败: {}", e))?;
    fs::write(&items_path, content).map_err(|e| format!("保存待办事项失败: {}", e))?;
    Ok(())
}

#[tauri::command]
fn get_todo_items() -> Result<Vec<TodoItem>, String> {
    let path = get_app_data_dir()?.join("todo_items.json");
    if !path.exists() { return Ok(vec![]); }
    let content = fs::read_to_string(&path).map_err(|e| format!("读取待办事项失败: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("解析待办事项失败: {}", e))
}

#[tauri::command]
fn add_timer_record(record: TimerRecord) -> Result<(), String> {
    let path = get_timer_records_path()?;
    let mut records: Vec<TimerRecord> = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| format!("读取计时记录失败: {}", e))?;
        serde_json::from_str(&content).map_err(|e| format!("解析计时记录失败: {}", e))?
    } else { vec![] };
    records.push(record);
    let content = serde_json::to_string_pretty(&records).map_err(|e| format!("序列化计时记录失败: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("保存计时记录失败: {}", e))?;
    Ok(())
}

#[tauri::command]
fn get_timer_records() -> Result<Vec<TimerRecord>, String> {
    let path = get_timer_records_path()?;
    if !path.exists() { return Ok(vec![]); }
    let content = fs::read_to_string(&path).map_err(|e| format!("读取计时记录失败: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("解析计时记录失败: {}", e))
}

#[tauri::command]
fn get_plans() -> Result<Vec<PlanItem>, String> {
    let path = get_plans_path()?;
    if !path.exists() { return Ok(vec![]); }
    let content = fs::read_to_string(&path).map_err(|e| format!("读取计划失败: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("解析计划失败: {}", e))
}

#[tauri::command]
fn save_plans(plans: Vec<PlanItem>) -> Result<(), String> {
    let path = get_plans_path()?;
    let content = serde_json::to_string_pretty(&plans).map_err(|e| format!("序列化计划失败: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("保存计划失败: {}", e))?;
    Ok(())
}

#[tauri::command]
fn add_plan(plan: PlanItem) -> Result<Vec<PlanItem>, String> {
    let mut plans = get_plans().unwrap_or_default();
    plans.push(plan);
    save_plans(plans.clone())?;
    Ok(plans)
}

#[tauri::command]
fn update_plan(id: String, title: Option<String>, scope: Option<String>, target_date: Option<String>) -> Result<Vec<PlanItem>, String> {
    let mut plans = get_plans()?;
    let mut found = false;
    for p in &mut plans {
        if p.id == id {
            if let Some(t) = title { p.title = t; }
            if let Some(s) = scope { p.scope = s; }
            if let Some(d) = target_date { p.target_date = d; }
            found = true;
            break;
        }
    }
    if !found { return Err("未找到该计划".to_string()); }
    save_plans(plans.clone())?;
    Ok(plans)
}

#[tauri::command]
fn delete_plan(id: String) -> Result<Vec<PlanItem>, String> {
    let mut plans = get_plans()?;
    plans.retain(|p| p.id != id);
    save_plans(plans.clone())?;
    Ok(plans)
}

#[tauri::command]
fn toggle_plan_complete(id: String) -> Result<(bool, Vec<PlanItem>), String> {
    let mut plans = get_plans()?;
    let mut completed = false;
    for p in &mut plans {
        if p.id == id {
            p.completed = !p.completed;
            completed = p.completed;
            break;
        }
    }
    save_plans(plans.clone())?;
    Ok((completed, plans))
}

fn get_notes() -> Result<Vec<NoteItem>, String> {
    let path = get_notes_path()?;
    if !path.exists() { return Ok(vec![]); }
    let content = fs::read_to_string(&path).map_err(|e| format!("读取便签失败: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("解析便签失败: {}", e))
}

fn save_notes(notes: Vec<NoteItem>) -> Result<(), String> {
    let path = get_notes_path()?;
    let content = serde_json::to_string_pretty(&notes).map_err(|e| format!("序列化便签失败: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("保存便签失败: {}", e))?;
    Ok(())
}

#[tauri::command]
fn get_all_notes() -> Result<Vec<NoteItem>, String> {
    let mut notes = get_notes()?;
    notes.sort_by(|a, b| {
        match (&a.is_pinned, &b.is_pinned) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => b.updated_at.cmp(&a.updated_at),
        }
    });
    Ok(notes)
}

#[tauri::command]
fn add_note(note: NoteItem) -> Result<Vec<NoteItem>, String> {
    let mut notes = get_notes().unwrap_or_default();
    notes.push(note);
    save_notes(notes.clone())?;
    Ok(notes)
}

#[tauri::command]
fn update_note(id: String, title: Option<String>, content: Option<String>, links: Option<Vec<NoteLink>>, images: Option<Vec<String>>, tags: Option<Vec<String>>) -> Result<Vec<NoteItem>, String> {
    let mut notes = get_notes()?;
    let mut found = false;
    for n in &mut notes {
        if n.id == id {
            if let Some(t) = title { n.title = t; }
            if let Some(c) = content { n.content = c; }
            if let Some(l) = links { n.links = l; }
            if let Some(img) = images { n.images = img; }
            if let Some(tg) = tags { n.tags = tg; }
            n.updated_at = chrono::Utc::now().timestamp_millis();
            found = true;
            break;
        }
    }
    if !found { return Err("未找到该便签".to_string()); }
    save_notes(notes.clone())?;
    Ok(notes)
}

#[tauri::command]
fn delete_note(id: String) -> Result<Vec<NoteItem>, String> {
    let mut notes = get_notes()?;
    notes.retain(|n| n.id != id);
    save_notes(notes.clone())?;
    Ok(notes)
}

#[tauri::command]
fn toggle_note_pin(id: String) -> Result<(bool, Vec<NoteItem>), String> {
    let mut notes = get_notes()?;
    let mut pinned = false;
    for n in &mut notes {
        if n.id == id {
            n.is_pinned = !n.is_pinned;
            pinned = n.is_pinned;
            n.updated_at = chrono::Utc::now().timestamp_millis();
            break;
        }
    }
    save_notes(notes.clone())?;
    Ok((pinned, notes))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_mistakes,
            save_mistakes,
            add_mistake,
            update_mistake,
            delete_mistake,
            save_image,
            read_image,
            delete_image,
            get_all_subjects_and_tags,
            get_all_sources,
            toggle_favorite,
            record_review_result,
            get_review_queue,
            update_review_queue,
            add_to_review_queue,
            get_app_info,
            get_settings_info,
            set_custom_data_dir,
            get_home_settings,
            set_exam_date,
            set_countdown_name,
            set_quotes,
            set_home_background,
            set_dark_mode,
            get_todo_data,
            save_todo_data,
            get_todo_items,
            add_timer_record,
            get_timer_records,
            get_plans,
            save_plans,
            add_plan,
            update_plan,
            delete_plan,
            toggle_plan_complete,
            get_all_notes,
            add_note,
            update_note,
            delete_note,
            toggle_note_pin,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
