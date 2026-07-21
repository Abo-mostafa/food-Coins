extends Timer


# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	pass



# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass
	


func _on_timeout() -> void:
	$"../staticBody/CollisionShape2D4".position.x=575.0
	print("f")
