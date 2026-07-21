extends CharacterBody2D

const Speed = 100.0
var direction := 1.0
var is_dead := false
const RaycastOffest = 15
@onready var EatSound: AudioStreamPlayer2D = $EatSound

func  _physics_process(delta: float) -> void:
	_on_Shawerma_area_area_entered

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
	#$ShawermaArea.body_entered.connect(_on_chiken_area_body_enterd)
	_on_Shawerma_area_area_entered

	



func _on_Shawerma_area_area_entered(body: Node2D) -> void:
	print(body.name)
	if body.name=="Player":
		if is_dead:
			EatSound.play()
			print("اكلت السمكة حتى راسها")
			# نخفي الدجاجة ونوقف تصادمها حتى لا يراها اللاعب أو يتفاعل معها مجدداً
			hide() 
			$ShawermaArea.queue_free() # حذف منطقة التصادم فوراً
			
			# ننتظر حتى ينتهي الصوت تماماً قبل حذف الدجاجة نهائياً من الذاكرة
			await EatSound.finished
			queue_free()
		else :
			if body.has_method("damage_player"):
				body.damage_player("Shawerma")
			

func _auto_jump() -> void:
	if not is_dead:
		velocity.y = randf_range(-350.0 , -650.0)
		$Timer.wait_time = randf_range(1.0 , 3)
		$Timer.start()
		
	
func transform_to_food():
	$AnimatedSprite2D.play("cooked")
	is_dead=true
