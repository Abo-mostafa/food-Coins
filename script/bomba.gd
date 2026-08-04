extends RigidBody2D

#==================================================
# Bomb.gd
#==================================================

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var timer: Timer = $ExplotionTimer
@onready var audio: AudioStreamPlayer2D = $AudioStreamPlayer2D
@onready var explosion_area: Area2D = $ExplosionArea

signal bomb_exploded

# 🔥 متغيرات التحكم في عملية الضرر
var has_dealt_damage := false  # نتأكد إن الضرر اتعمل مرة واحدة بس
var is_exploding := false      # هل القنبلة في حالة انفجار؟


func _ready():
	sprite.play("normal")
	audio.play()
	timer.start()

func _on_explosion_timer_timeout():
	# بداية الانفجار
	start_explosion()

func start_explosion():
	if is_exploding:
		return  # منع التكرار
	
	is_exploding = true
	freeze = true
	sprite.play("explosion")

	# 🔥 نبدأ في تطبيق الضرر فوراً
	apply_damage_to_nearby_entities()
	
	# 🔥 نستمر في تطبيق الضرر كل 0.1 ثانية أثناء الانفجار
	# عشان نضمن إن أي حد يدخل منطقة الانفجار يتأثر
	var damage_timer = Timer.new()
	damage_timer.wait_time = 0.1
	damage_timer.one_shot = false
	add_child(damage_timer)
	damage_timer.timeout.connect(_apply_damage_continuously)
	damage_timer.start()

func _apply_damage_continuously():
	# نطبق الضرر على كل الأجسام الموجودة في المنطقة
	apply_damage_to_nearby_entities()
		# 🔥 حركة التفجير المتسلسل للـ Bomba القريبة
	#_trigger_nearby_bombs()
	

func apply_damage_to_nearby_entities():
	var bodies = explosion_area.get_overlapping_bodies()
	
	for body in bodies:
		# منع القنبلة إنها تفجر نفسها مرتين
		if body == self:
			continue
			
		# تحويل الوحوش لطعام
		if body.has_method("transform_to_food"):
			body.transform_to_food()
			
		# إلحاق الضرر باللاعب
		if body.has_method("damage_player"):
			body.damage_player("bomba")
			
		# 🔥 تفجير القنابل المجاورة (استخدام الجروب أو الدالة مباشرة على الجسم)
		if body.is_in_group("Bomba") and body.has_method("start_explosion"):
			body.start_explosion()
func _on_animated_sprite_2d_animation_finished():
	if sprite.animation == "explosion":
		# 🔥 نوقف تطبيق الضرر
		var timers = get_children()
		for child in timers:
			if child is Timer and child != timer:
				child.stop()
				child.queue_free()
		
		# نبعت إشارة إن القنبلة انفجرت
		bomb_exploded.emit()
		queue_free()


# دالة البحث عن القنابل القريبة وتفجيرها
#func _trigger_nearby_bombs() -> void:
	## نصف قطر دائرة الانفجار (مثلاً 100 بكسل) - تقدر تكبره أو تصغره
	#var explosion_radius: float = 100.0 
	#
	## جلب جميع القنابل الموجودة حالياً في الجروب "Bomba"
	#var all_bombs = get_tree().get_nodes_in_group("Bomba")
	#
	#for other_bomb in all_bombs:
		## التأكد إن القنبلة مش هي نفسها القنبلة الحالية وأنها لم تنفجر بعد
		#if other_bomb != self and is_instance_valid(other_bomb):
			## حساب المسافة بين القنبلة الحالية والقنبلة الثانية
			#var distance = global_position.distance_to(other_bomb.global_position)
			#
			## لو القنبلة الثانية جوه نطاق الانفجار
			#if distance <= explosion_radius:
				## نفجر القنبلة الثانية فوراً!
				#if other_bomb.has_method("start_explosion"):
					#other_bomb.start_explosion()
					
					
					
func throw(direction):
	apply_impulse(Vector2(550 * direction, -220))
