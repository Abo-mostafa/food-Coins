extends PointLight2D

# المسافة الأفية التي تريد أن يبعدها الكشاف عن مركز اللاعب (لأمام أو الخلف)
const LIGHT_OFFSET_X = 792.0

@onready var player: CharacterBody2D = get_parent()
@onready var player_sprite: AnimatedSprite2D = get_parent().get_node("AnimatedSprite2D")

func _physics_process(_delta: float) -> void:
	# التأكد من أن العقدة الأب (اللاعب) والـ Sprite موجودين لتجنب الأخطاء
	if not player or not player_sprite:
		return
		
	# تحديد الاتجاه بناءً على خاصية flip_h الخاصة باللاعب
	# إذا كان flip_h يساوي true يعني ينظر لليسار (-1)، وإذا false ينظر لليمين (1)
	var direction :=-1 if player_sprite.flip_h else 1
	scale.x = abs(scale.x) * direction	
	# 1. تعديل مكان الكشاف ليكون دائماً أمام وجه اللاعب
	position.x = direction * LIGHT_OFFSET_X
	
