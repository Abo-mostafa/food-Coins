extends Node2D

@onready var cam : Camera2D = get_node("Player/Camera2D")
# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	cam.limit_right = 2157.0
	cam.limit_bottom = 1000


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass
