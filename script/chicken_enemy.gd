extends  CharacterBody2D

const Speed = 100.0
var direction := 1.0
var is_dead := false
const RaycastOffest = 15
@onready var EatSound: AudioStreamPlayer2D = $EatSound

func  _physics_process(delta: float) -> void:
	_on_chicken_area_area_entered
#	كود التحرك من البرنامج  
	move_and_slide()
	
	if not is_on_floor():
		velocity += get_gravity() * delta
	
	if not is_dead:
		if is_on_wall() or (is_on_floor() and not $FloorRayCast.is_colliding()):
			direction *= -1.0
			$FloorRayCast.position.x =direction * RaycastOffest
		velocity.x = direction * Speed
		$AnimatedSprite2D.flip_h = ( direction < 0 )
		$AnimatedSprite2D.play("walk")
	else:
		velocity.x = 0 
		$AnimatedSprite2D.play("cooked")
		
func  _ready() -> void:
#	ربط دخول اي جسم فى الفرخة
	#$ChickenArea.body_entered.connect(_on_chiken_area_body_enterd)
	_on_chicken_area_area_entered
	
	



func _on_chicken_area_area_entered(body: Node2D) -> void:
	if body.name=="Player":
		if is_dead:
			EatSound.play()
			print("اكلت السمكة حتى راسها")
			# نخفي الدجاجة ونوقف تصادمها حتى لا يراها اللاعب أو يتفاعل معها مجدداً
			hide() 
			$ChickenArea.queue_free() # حذف منطقة التصادم فوراً
			
			# ننتظر حتى ينتهي الصوت تماماً قبل حذف الدجاجة نهائياً من الذاكرة
			await EatSound.finished
			queue_free()
		else :
			if body.has_method("damage_player"):
				body.damage_player("chicken")
			
func transform_to_food():
	$AnimatedSprite2D.play("cooked")
	is_dead=true
