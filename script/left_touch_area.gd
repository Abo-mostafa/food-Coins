#extends Control
#
#@onready var joystick: Control = $Joystick
#@onready var tip: Sprite2D = $Joystick/Tip
#@onready var base: Sprite2D = $Joystick/Base
#
## أقصى مسافة يتحركها الموجه الداخلي من المركز
#@export var max_length: float = 60.0
#
#var touch_index: int = -1
#var joystick_center: Vector2 = Vector2.ZERO
#
#func _gui_input(event: InputEvent) -> void:
	#if event is InputEventScreenTouch:
		#if event.pressed and touch_index == -1:
			#touch_index = event.index
			#joystick_center = event.position
			#joystick.global_position = joystick_center
			#joystick.visible = true
		#elif not event.pressed and event.index == touch_index:
			#touch_index = -1
			#joystick.visible = false
			#tip.position = Vector2.ZERO
			#_reset_inputs()
#
	## التأكد من التحديث عند السحب بالإصبع
	#elif event is InputEventScreenDrag:
		#if event.index == touch_index or touch_index == -1:
			#var drag_offset = event.position - joystick_center
			#if drag_offset.length() > max_length:
				#drag_offset = drag_offset.normalized() * max_length
				#
			#tip.position = drag_offset
			#_process_joystick_input(drag_offset / max_length)
#
#func _process_joystick_input(dir: Vector2) -> void:
	## حركة اليمين واليسار (مباشرة مع move_left / move_right)
	#if dir.x > 0.3:
		#Input.action_press("move_right", abs(dir.x))
		#Input.action_release("move_left")
	#elif dir.x < -0.3:
		#Input.action_press("move_left", abs(dir.x))
		#Input.action_release("move_right")
	#else:
		#Input.action_release("move_left")
		#Input.action_release("move_right")
#
	## حركة الطيران/القفز للأعلى
	#if dir.y < -0.4:
		#Input.action_press("jump")
	#else:
		#Input.action_release("jump")
#
#func _reset_inputs() -> void:
	#Input.action_release("move_left")
	#Input.action_release("move_right")
	#Input.action_release("jump")
	
extends Control
#
#@onready var joystick: Control = $Joystick
#@onready var tip: Sprite2D = $Joystick/Tip
#
#@export var max_length: float = 60.0
#
#var touch_index: int = -1
#var joystick_center: Vector2 = Vector2.ZERO
#
#func _gui_input(event: InputEvent) -> void:
	## 1. عند وضع الصباع على الشاشة
	#if event is InputEventScreenTouch:
		#if event.pressed and touch_index == -1:
			#touch_index = event.index
			#joystick_center = event.position
			#joystick.global_position = global_position + joystick_center
			#joystick.visible = true
		#elif not event.pressed and event.index == touch_index:
			#_reset_joystick()
#
	## 2. عند سحب الصباع على شاشة الموبايل
	#elif event is InputEventScreenDrag and event.index == touch_index:
		#var drag_offset = event.position - joystick_center
		#
		#if drag_offset.length() > max_length:
			#drag_offset = drag_offset.normalized() * max_length
			#
		#tip.position = drag_offset
		#_process_input(drag_offset / max_length)
#
#func _process_input(vector: Vector2) -> void:
	## حركة اليمين واليسار مع القوة (Strength)
	#if vector.x > 0.2:
		#Input.action_press("move_right", abs(vector.x))
		#Input.action_release("move_left")
	#elif vector.x < -0.2:
		#Input.action_press("move_left", abs(vector.x))
		#Input.action_release("move_right")
	#else:
		#Input.action_release("move_left")
		#Input.action_release("move_right")
#
	## حركة القفز/الطيران للأعلى
	#if vector.y < -0.3:
		#Input.action_press("jump", abs(vector.y))
	#else:
		#Input.action_release("jump")
#
#func _reset_joystick() -> void:
	#touch_index = -1
	#joystick.visible = false
	#tip.position = Vector2.ZERO
	#Input.action_release("move_left")
	#Input.action_release("move_right")
	#Input.action_release("jump")
