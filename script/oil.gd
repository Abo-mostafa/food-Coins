extends RigidBody2D

#==================================================
# Bomb.gd
#==================================================

#--------------- Nodes ----------------------------
@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var timer: Timer = $ExplotionTimer
@onready var audio: AudioStreamPlayer2D = $AudioStreamPlayer2D
@onready var explosion_area: Area2D = $ExplosionArea


func _ready():
	# تشغيل الأنيميشن العادي وصوت التكتكة وبدء العد
	sprite.play("normal")
	audio.play()
	timer.start()

# الداله المعتاده
func _on_explosion_area_body_entered(body : Node2D):
	print(body.name)
	if body.has_method("damage_player"):
		body.damage_player("bomba")
		
		print("oil")



#==================================================
# انتهاء المؤقت (الانفجار)
#==================================================
func _on_explosion_timer_timeout():
	# إيقاف حركة وتأثير الفيزيائية تماماً أثناء الانفجار
	#freeze = true

	# تشغيل أنيميشن الانفجار
	sprite.play("explosion")
	if sprite.animation == "explosion":
		queue_free()




# دالة تنفيذ الرمي
func throw(direction):
	# إعطاء قوة دفع تعتمد على اتجاه وجه اللاعب
	apply_impulse(Vector2(550 * direction, -220))
