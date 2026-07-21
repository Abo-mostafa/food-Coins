extends Node2D
@onready var player: CharacterBody2D = $"../Player"

func _ready():
	# ربط إشارة تخبرنا عندما يغادر أي نود (وحش) الشجرة
	child_exiting_tree.connect(_on_monster_died)
	#print("redy mainMap")

func _on_monster_died(node):
	# ننتظر نهاية الفريم الحالي للتأكد من أن الوحش حُذف تماماً من الحسبة
	await get_tree().process_frame
	print(get_child_count())
	# إذا أصبح عدد الوحوش المتبقية صفر
	if get_child_count() == 0:
		print("تمت إبادة جميع الوحوش!")
		if player.has_method("player_Win"):
			player.player_Win()
