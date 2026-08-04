extends Node2D

@onready var player: CharacterBody2D = $"../Player"
signal count_enmy(remaining: int)

var hub: Node = null

func _ready() -> void:
	# نربط الإشارة
	child_exiting_tree.connect(_on_child_exiting_tree)
	
	# ننتظر فريم واحد لضمان جاهزية الـ HUD في الشجرة
	await get_tree().process_frame
	hub = get_tree().get_first_node_in_group("HUD")
	
	# تحديث العدد الابتدائي
	_update_monster_count()

func _on_child_exiting_tree(node: Node) -> void:
	# نستخدم call_deferred لتأجيل الحساب للفريم القادم بعد حذف النود بالفعل بدون استخدام await
	call_deferred("_update_monster_count")

func _update_monster_count() -> void:
	# إذا تم إغلاق اللعبة أو المشهد لا نطبق الشيفرة
	if not is_inside_tree():
		return
		
	var remaining_monsters : int = get_child_count()
	
	# إرسال الإشارة وتحديث الـ HUD
	emit_signal("count_enmy", remaining_monsters)
	
	if hub and hub.has_method("update_monsters"):
		hub.update_monsters(remaining_monsters)
		
	# عند إبادة جميع الوحوش
	if remaining_monsters == 0:
		print("تمت إبادة جميع الوحوش!")
		if is_instance_valid(player) and player.has_method("player_Win"):
			player.player_Win()
