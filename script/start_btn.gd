extends Button

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	pass

func _on_pressed() -> void:
		# الذهاب الى صفحة المستويات
	get_tree().change_scene_to_file("res://screens/levels_page.tscn")
