extends CharacterBody2D

const SPEED = 200.0
var current_speed = SPEED
const RAYCAST_OFFSET = 15.0

var direction := 1.0
var is_dead := false
var is_dunse := false
var is_afraid := false

@onready var EatSound: AudioStreamPlayer2D = $EatSound
const OIL_SCENE = preload("res://screens/main/oil.tscn")
var face_direction : int = 1

@onready var hud = get_tree().get_first_node_in_group("HUD")
@export var addScore : int = 200

func _ready() -> void:
	# ضبط اتجاه الوجه ومكان إطلاق الزيت عند بدء التشغيل تلقائياً بناءً على الاتجاه الافتراضي
	face_direction = 1 if direction > 0 else -1
	$BombSpawn.position.x = abs($BombSpawn.position.x) * face_direction


func _physics_process(delta: float) -> void:
	# 1. تطبيق الجاذبية أولاً إذا لم يكن على الأرض
	if not is_on_floor():
		velocity += get_gravity() * delta
	
	# 2. منطق الحركة والتصرفات
	if not is_dead and not is_dunse and not is_afraid:
		# تغيير الاتجاه عند الجدران أو الحواف
		if is_on_wall() or (is_on_floor() and not $FloorRayCast.is_colliding()):
			direction *= -1.0
			$FloorRayCast.position.x = direction * RAYCAST_OFFSET
			face_direction = 1 if direction > 0 else -1
			$BombSpawn.position.x = abs($BombSpawn.position.x) * face_direction	
			
		velocity.x = direction * current_speed
		$AnimatedSprite2D.flip_h = (direction < 0)
		$AnimatedSprite2D.play("walk")
		
	elif is_dunse:
		velocity.x = direction * (current_speed - 100)
		$AnimatedSprite2D.play("ideal")
		
	elif is_afraid:
		# إذا واجه جداراً أثناء الخوف يغير اتجاهه أيضاً
		if is_on_wall() or (is_on_floor() and not $FloorRayCast.is_colliding()):
			direction *= -1.0
			$FloorRayCast.position.x = direction * RAYCAST_OFFSET
			face_direction = 1 if direction > 0 else -1
			$BombSpawn.position.x = abs($BombSpawn.position.x) * face_direction	
			
		velocity.x = direction * current_speed
		$AnimatedSprite2D.flip_h = (direction < 0)
		$AnimatedSprite2D.play("afraid")
		
	else: # في حالة الموت أو أي حالة غير متوقعة
		velocity.x = 0 
		transform_to_food()
		$AnimatedSprite2D.play("cooked")
		
	# 3. استدعاء الحركة الفعلي
	move_and_slide()


# --- الدوال المرتبطة بالإشارات (Signals) ---

func _on_Mozzarila_area_entered(area: Node2D) -> void:
	# تغيير السرعة وإطلاق الزيت إن صادف قنبلة    
	if area.name == "bomba":
		on_show_bomba()

	if area.name == "Player" or area.get_parent().name == "Player":
		var body = area.get_parent() if area.name != "Player" else area
		if is_dead:
			EatSound.play()
			print("تم أكل البطاطس المقرمشة!")
			hud.update_score(addScore)
			
			# إيقاف جميع التايمرات فوراً لمنعها من العمل في الخلفية
			if has_node("TimerJump"): $TimerJump.stop()
			if has_node("TimerEndDunse"): $TimerEndDunse.stop()
			if has_node("TimerDunse"): $TimerDunse.stop()
			if has_node("SpeedTimer"): $SpeedTimer.stop()
			
			hide() # إخفاء الوحش
			$MozzarilaArea.queue_free() # حذف منطقة التصادم
			$CollisionShape2D.queue_free()
			await EatSound.finished # الانتظار حتى ينتهي صوت الأكل
			queue_free() # الحذف النهائي من الذاكرة
		else:
			if body.has_method("damage_player"):
				body.damage_player("Fries")


func _auto_jump() -> void:
	if not is_dead and is_on_floor(): 
		velocity.y = randf_range(-350.0, -650.0)
		$TimerJump.wait_time = randf_range(4.0, 6.0)
		$TimerJump.start()


func _auto_dunse() -> void:
	if not is_dead:
		is_dunse = true
		$TimerEndDunse.wait_time = randf_range(3.0, 5.0)
		$TimerEndDunse.start()
		$TimerDunse.stop()	


func _end_Dunse() -> void:
	if has_node("TimerDunse"):
		$TimerDunse.wait_time = randf_range(2.0, 5.0)
		$TimerDunse.start()
		$TimerEndDunse.stop()
	is_dunse = false


func transform_to_food() -> void:
	is_dead = true
	is_afraid = false
	is_dunse = false
	# إيقاف كل المؤقتات لمنع أي حركة عشوائية بعد الموت
	if has_node("TimerJump"): $TimerJump.stop()
	if has_node("TimerDunse"): $TimerDunse.stop()
	if has_node("TimerEndDunse"): $TimerEndDunse.stop()
	if has_node("SpeedTimer"): $SpeedTimer.stop()


func on_show_bomba():
	if not is_dead and not is_afraid:
		current_speed = 500
		is_dunse = false
		is_afraid = true
		
		# إصلاح المحاذاة: استدعاء إطلاق الزيت يحدث فقط عند تفعيل الخوف لأول مرة
		if OIL_SCENE == null:
			push_error("OIL_SCENE غير مرتبطة في الـ Inspector")
			return

		if not has_node("BombSpawn"):
			push_error("BombSpawn Node غير موجودة كابن للوحش")
			return

		var oil = OIL_SCENE.instantiate()
		var current_scene = get_tree().current_scene
		current_scene.add_child(oil)
		
		oil.global_position = $BombSpawn.global_position
		oil.throw(face_direction) # قذف الزيت باتجاه الوجه الحالي
		
		$SpeedTimer.start()  
		print("تم تفعيل الخوف والسرعة الفائقة وإطلاق الزيت الساخن!")


func _reset_speed():
	is_afraid = false
	current_speed = SPEED
	print("تم العودة للسرعة العادية وزوال الخوف")
