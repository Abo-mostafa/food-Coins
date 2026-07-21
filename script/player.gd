extends CharacterBody2D

#==========================
# Player Settings
#==========================
@export var move_speed : float = 300.0
@export var jump_force : float = -500.0
@export var gravity : float = 1800.0

@onready var hurtingSound: AudioStreamPlayer2D = $hurtingSound
@onready var sprite : AnimatedSprite2D = $AnimatedSprite2D
@onready var wing_sound :AudioStreamPlayer2D = $wing
var health := 100 
var face_direction : int = 1
var is_hurting := false
var is_die := false
var can_move := true
var is_Win := false

# 🔥 المتغيرات الجديدة للقنابل
var max_bombs = 3           # الحد الأقصى للقنابل في نفس الوقت
var current_bombs = 0       # عدد القنابل الموجودة حالياً

const BOMB_SCENE = preload("res://screens/main/bomba.tscn")

func _physics_process(delta):
	if not is_on_floor():
		velocity.y += gravity * delta
	
	if Input.is_action_just_pressed("jump") and can_move and not is_hurting:
		wing_sound.play()
		velocity.y = jump_force
	
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
	elif is_Win:
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
	
	# تحديد موقع القنبلة ورميها
	bomb.global_position = $BombSpawn.global_position
	bomb.throw(face_direction)

# 🔥 الدالة اللي بتتسمى لما قنبلة تنفجر
func _on_bomb_exploded():
	# ✅ نقلل عدد القنابل الموجودة
	current_bombs -= 1
	print("قنبلة انفجرت! العدد المتبقي: ", current_bombs, "/", max_bombs)
	
	# ممكن تعمل حاجة إضافية هنا لو عايز

#===========================
# باقي دوال اللاعب
#===========================
func damage_player(from_enemy: String) -> void:
	if is_die or is_hurting:
		return
		
	print("Player damaged by: ", from_enemy)
	is_hurting = true
	can_move = false
	
	sprite.play("hit")
	hurtingSound.play()
	health -= 50
	
	if from_enemy == "bomba":
		velocity.y = -350
		velocity.x = -face_direction * 150
	
	await get_tree().create_timer(2.0).timeout
	
	if health <= 0:
		is_die = true
		can_move = false
		sprite.play("lose")
		if has_node("LoseSound"):
			$LoseSound.play()
	else:
		is_hurting = false
		can_move = true

func player_Win():
	sprite.scale = Vector2(2.0, 2.0)
	is_Win = true
