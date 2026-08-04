extends CharacterBody2D

const SPEED = 200.0
var current_speed = SPEED
const RAYCAST_OFFSET = 15.0

var direction := 1.0
var is_dead := false
var is_dunse := false
var is_afraid := false
@onready var EatSound: AudioStreamPlayer2D = $EatSound

@onready var hud = get_tree().get_first_node_in_group("HUD")
@export var addScore : int =150


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
			
		velocity.x = direction * current_speed
		$AnimatedSprite2D.flip_h = (direction < 0)
		$AnimatedSprite2D.play("walk")
		
	elif is_dunse:
		velocity.x = 0 
		$AnimatedSprite2D.play("duns")
	elif is_afraid:
		if is_on_wall() or (is_on_floor() and not $FloorRayCast.is_colliding()):
			direction *= -1.0
			$FloorRayCast.position.x = direction * RAYCAST_OFFSET
		velocity.x = direction * current_speed
		$AnimatedSprite2D.flip_h = (direction < 0)
		$AnimatedSprite2D.play("afraid")
	elif is_dead:
		velocity.x = 0 
		transform_to_food()
		$AnimatedSprite2D.play("cooked")
	else:
		velocity.x = 0 
		transform_to_food()
		$AnimatedSprite2D.play("cooked")
		
	# 3. استدعاء الحركة الفعلي (يفضل دائماً في نهاية الدالة)
	move_and_slide()

func _ready() -> void:
	# الدالة فارغة الآن لأن الإشارات مرتبطة تلقائياً من المحرك
	pass


# --- الدوال المرتبطة بالإشارات (Signals) ---

# هذه الدالة مرتبطة بإشارة area_entered من عقدة MozzarilaArea

func _on_Mozzarila_area_entered(area: Node2D) -> void:
#	تغيير السرعة ان صادفت قنبلة    
	if area.name == "bomba" :
		on_show_bomba()
	#else:
		#_reset_speed()

	if area.name == "Player" or area.get_parent().name == "Player":
		var body = area.get_parent() if area.name != "Player" else area
		if is_dead:
			EatSound.play()
			print("اكلت السمكة حتى راسها")
			hud.update_score(addScore)
			# 🛠️ الحل: إيقاف جميع التايمرات فوراً لمنعها من العمل في الخلفية
			if has_node("TimerJump"): $TimerJump.stop()
			if has_node("TimerEndDunse"): $TimerEndDunse.stop()
			if has_node("TimerDunse"): $TimerDunse.stop()
			
			hide() # إخفاء الدجاجة
			$MozzarilaArea.queue_free() # حذف منطقة التصادم
			$CollisionShape2D.queue_free()
			await EatSound.finished # الانتظار حتى ينتهي الصوت
			queue_free() # الحذف النهائي من الذاكرة
		else:
			if body.has_method("damage_player"):
				body.damage_player("Mozzarilaa")

# مرتبطة بـ Timer القفز (تأكد أن الـ Timer مضبوط على Autostart أو تم تشغيله)
func _auto_jump() -> void:
	if not is_dead and is_on_floor(): # أضفنا شرط أن يكون على الأرض ليقفز بشكل منطقي
		velocity.y = randf_range(-350.0, -650.0)
		$TimerJump.wait_time = randf_range(1.0, 3.0)
		$TimerJump.start()


# مرتبطة بـ Timer بدء الرقص
func _auto_dunse() -> void:
	if not is_dead:
		is_dunse = true
		#print("start dunse")
		$TimerEndDunse.wait_time = randf_range(6.0, 10.0)
		$TimerEndDunse.start()
		$TimerDunse.stop()	

# مرتبطة بـ Timer إيقاف الرقص
func _end_Dunse() -> void:
	#print("end dunse")
	# إذا كان لديك تايمر يعيد تشغيل الدورة (TimerDunse) تأكد من صحة اسمه هنا
	if has_node("TimerDunse"):
		$TimerDunse.wait_time =randf_range(2.0, 5.0)
		$TimerDunse.start()
		$TimerEndDunse.stop()
	is_dunse = false


# دالة تحويل العدو إلى طعام (تستدعيها عندما يموت 
func transform_to_food() -> void:
	is_dead = true
	is_afraid =false
	is_dunse=false
		# إيقاف كل المؤقتات
	$TimerJump.stop()
	$TimerDunse.stop()
	$TimerEndDunse.stop()
	$SpeedTimer.stop()
	#$AnimatedSprite2D.play("cooked")
	
	
func on_show_bomba():
	if not is_dead and not is_afraid:
		current_speed = 500
		is_dunse=false
		is_afraid = true
		$SpeedTimer.start()  
		print("تم تفعيل السرعة السريعة!")
#مربوط ب SpeedTimer   
func _reset_speed():
	is_afraid=false
	current_speed = SPEED
	print("تم العودة للسرعة العادية")
