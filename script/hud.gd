extends CanvasLayer

# ربط عناصر الواجهة
@onready var health_bar: ProgressBar = $TopBar/TopHBox/HealthSection/HealthBar
@onready var level_name_label: Label = $TopBar/TopHBox/LevelInfo/LevelNameLabel
@onready var timer_label: Label = $TopBar/TopHBox/LevelInfo/TimerLabel
@onready var score_label: Label = $TopBar/TopHBox/StatsSection/ScoreLabel
@onready var enemy_label: Label = $TopBar/TopHBox/StatsSection/EnemyLabel
@onready var bomb_label: Label = $TopBar/TopHBox/StatsSection/BombLabel
@onready var level_timer: Timer = $LevelTimer
var health_tween: Tween
#var time_left: int = 2 # وقت المستوى بالثواني (مثلاً 2 دقيقة)
@export var level_time_seconds: int = 120 # الوقت الافتراضي (دقيقتين)
var time_left: int

var current_score: int = 0

# إشارة عند انتهاء الوقت
signal level_time_out

func _ready() -> void:
	# تحديث اسم المستوى تلقائياً من اسم المشهد الحالي
	var scene_name = get_tree().current_scene.name
	level_name_label.text = scene_name
	# نضبط الوقت المتبقي بناءً على القيمة المحددة
	time_left = level_time_seconds
	# إعداد التايمر
	level_timer.wait_time = 1.0
	level_timer.timeout.connect(_on_timer_second_passed)
	level_timer.start()
	_update_timer_display()
# --- دمج وتحديث البيانات ---
	# ننتظر فريم واحد عشان نضمن إن الـ Player اتقرأ في المشهد
	await get_tree().process_frame
	
	# البحث عن اللاعب في المشهد الحالي
	var player = get_tree().get_first_node_in_group("Player")
	#var player = get_tree().get_first_node_in_group("Player")
	if player:
		# ربط إشارات اللاعب بالـ HUD تلقائياً!
		player.health_changed.connect(update_health)
		player.bombs_changed.connect(update_bombs)
		
		# تحديث القيم لأول مرة
		update_health(player.health , player.health)
		update_bombs(player.current_bombs, player.max_bombs)
		
		
func update_health(new_health: int, max_health: int = 100) -> void:

	health_bar.max_value = max_health
	
	# إلغاء الـ Tween القديم لو كان شغال عشان متحصلش لخبطة في الأرقام
	if health_tween and health_tween.is_running():
		health_tween.kill()
		
	health_tween = create_tween()
	health_tween.tween_property(health_bar, "value", new_health, 0.2).set_trans(Tween.TRANS_SINE)

func update_bombs(active_bombs: int, max_bombs: int) -> void:
	# بيظهر عدد القنابل المتاحة للرمي حالياً (مثلاً 3/3)
	var available = max_bombs - active_bombs
	bomb_label.text = "💣 %d/%d" % [available, max_bombs]

func update_monsters(remaining_monsters: int) -> void:
	if enemy_label:
		enemy_label.text = "🍽  %d" % remaining_monsters

func update_score(points: int) -> void:
	current_score += points
	score_label.text = " %d" % current_score

# --- إدارة الوقت ---

func _on_timer_second_passed() -> void:
	if time_left > 0:
		time_left -= 1
		_update_timer_display()
	else:
		level_timer.stop()
#ارسال الاشارة و هستقبلها فى اللعيب عشان يموت       
		emit_signal("level_time_out")


func _update_timer_display() -> void:
	var minutes = time_left / 60
	var seconds = time_left % 60
	timer_label.text = "⏱ %02d:%02d" % [minutes, seconds]



func _on_home_pressed() -> void:
	# الذهاب الى صفحة المستويات
	get_tree().change_scene_to_file("res://screens/main_page.tscn")
