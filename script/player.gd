extends CharacterBody2D

#==========================
# Player Settings
#==========================
@export var move_speed : float = 300.0
@export var jump_force : float = -500.0
@export var gravity : float = 1800.0
@onready var hud = get_tree().get_first_node_in_group("HUD")

@onready var hurtingSound: AudioStreamPlayer2D = $hurtingSound
@onready var sprite : AnimatedSprite2D = $AnimatedSprite2D
@onready var wing_sound :AudioStreamPlayer2D = $wing

# مؤقت عمل ريستارت للعبة
@onready var timer_restart: Timer = $TimerRestart

var health := 100 
var face_direction : int = 1
var is_hurting := false
var is_die := false
var can_move := true
var is_win := false

# 🔥 المتغيرات الجديدة للقنابل
var max_bombs = 3           # الحد الأقصى للقنابل في نفس الوقت
var current_bombs = 0       # عدد القنابل الموجودة حالياً
var reset

# الطيران
var fly_cooldown := 0.0
@export var fly_rate := 0.15 # السرعة بين القفزات عند الضغط المستمر


# إشارات للـ HUD
signal health_changed(new_health , max_health)
signal bombs_changed(active_bombs, max_bombs)
#=========================================================
const BOMB_SCENE = preload("res://screens/main/bomba.tscn")
const Restart_SCENE = preload("res://screens/Restart.tscn")

func _ready() -> void:
	# print("صحة اللاعب الابتدائية: ", health)
	
	# انتظار فريم لضمان تحميل العقد
	await get_tree().process_frame
	
	var hud_node = get_tree().get_first_node_in_group("HUD")
	if hud_node and hud_node.has_signal("level_time_out"):
		hud_node.level_time_out.connect(player_Die)
		


func _physics_process(delta):
	if not is_on_floor():
		velocity.y += gravity * delta
	
	# تحديث مؤقت الطيران
	if fly_cooldown > 0:
		fly_cooldown -= delta

	# استبدال is_action_just_pressed بـ is_action_pressed مع التأكد من مهلة الطيران
	if Input.is_action_pressed("jump") and can_move and not is_hurting and fly_cooldown <= 0:
		wing_sound.play()
		velocity.y = jump_force
		fly_cooldown = fly_rate # إعادة ضبط المهلة


	if Input.is_action_just_pressed("throw_bomb") and can_move and not is_hurting:
		throw_bomb()

	var direction = Input.get_axis("move_left", "move_right")
	
	if direction != 0 and can_move and not is_hurting:
		velocity.x = direction * move_speed
		sprite.flip_h = direction < 0
		face_direction = 1 if direction > 0 else -1
		$BombSpawn.position.x = abs($BombSpawn.position.x) * face_direction	
	else:
		if not is_hurting:
			velocity.x = move_toward(velocity.x, 0, move_speed)

	move_and_slide()
	update_animation()

func update_animation():
	if is_die or is_hurting:
		return

	if not is_on_floor():
		sprite.play("jump")
		return

	if abs(velocity.x) > 10:
		sprite.play("run")
	elif is_win:
		sprite.play("win")
	else:
		sprite.play("idle")

#===========================
# إلقاء القنبلة (مطور)
#===========================
func throw_bomb():
	# ✅ نتحقق من عدد القنابل المسموح به
	if current_bombs >= max_bombs:
		print("وصلت للحد الأقصى للقنابل! (", max_bombs, ")")
		return  # منرميش قنبلة جديدة
		
	if BOMB_SCENE == null:
		push_error("Bomb Scene غير مرتبطة في الـ Inspector")
		return

	if not has_node("BombSpawn"):
		push_error("BombSpawn Node غير موجودة كابن للاعب")
		return

	# إنشاء القنبلة
	var bomb = BOMB_SCENE.instantiate()
	var current_scene = get_tree().current_scene
	current_scene.add_child(bomb)
	
	# 🔥 ربط إشارة انفجار القنبلة
	bomb.bomb_exploded.connect(_on_bomb_exploded)
	
	# 🔥 نزيد العدد الحالي للقنابل
	current_bombs += 1
	print("قنبلة جديدة! العدد الحالي: ", current_bombs, "/", max_bombs)
	emit_signal("bombs_changed", current_bombs, max_bombs)
	
	# تحديد موقع القنبلة ورميها
	bomb.global_position = $BombSpawn.global_position
	bomb.throw(face_direction)

# 🔥 الدالة اللي بتتسمى لما قنبلة تنفجر
func _on_bomb_exploded():
	# ✅ نقلل عدد القنابل الموجودة
	current_bombs -= 1
	print("قنبلة انفجرت! العدد المتبقي: ", current_bombs, "/", max_bombs)
	emit_signal("bombs_changed", current_bombs, max_bombs)
	
	# ممكن تعمل حاجة إضافية هنا لو عايز

#===========================
# باقي دوال اللاعب
#===========================
func damage_player(from_enemy: String) -> void:
	# منع تلقي الضرر إذا كان ميتاً، فائزاً، أو متألماً بالفعل
	if is_die or is_hurting or is_win:
		return
		
	print("Player damaged by: ", from_enemy)
	is_hurting = true
	can_move = false
	
	sprite.play("hit")
	if hurtingSound:
		hurtingSound.play()
		
	# خصم الصحة
	health -= 50
	health = max(0, health) # نضمن أن الصحة لا تنزل تحت الصفر
	
	# إرسال الإشارة بالقيم الصحيحة (50 ثم 0)
	emit_signal("health_changed", health, 100)
	
	if from_enemy == "bomba":
		velocity.y = -350
		velocity.x = -face_direction * 150
	
	if health <= 0:
		player_Die()
	else:
		# فترة انتعاش وحماية قصيرة (مثلاً 0.8 ثانية بدلاً من 2.0 ثانية)
		await get_tree().create_timer(0.8).timeout
		is_hurting = false
		can_move = true

		
func player_Die():
	if not is_die and not is_win:
		is_die = true
		can_move = false
		sprite.play("lose")
		
		if has_node("LoseSound"):
			$LoseSound.play()
			

		if timer_restart:
			timer_restart.start()

			
func player_Win():
	sprite.scale = Vector2(2.0, 2.0)
	is_win = true

func _on_timer_restart_timeout():
	#اضافة شاشة 
	reset = Restart_SCENE.instantiate()
	add_child(reset)
	if reset.has_node("AnimationPlayer"):
				reset.get_node("AnimationPlayer").play("fadOut") # اسم الأنيميشن عندك
	# الانتظار حتى ينتهي الانيميشن
	await reset.get_node("AnimationPlayer").animation_finished
	get_tree().reload_current_scene()
