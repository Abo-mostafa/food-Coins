extends CanvasLayer



# المسار الخاص بمجلد المستويات
@export_dir var levels_folder_path: String = "res://screens/levels/"

# رابط لعقدة الـ GridContainer
@onready var grid_container: GridContainer = $ScrollContainer/GridContainer

func _ready() -> void:
	load_levels_dynamically()
	create_level_button("الصفحة الرئيسية", "res://screens/main_page.tscn")
func load_levels_dynamically() -> void:
	# 1. فتح مجلد المستويات
	var dir = DirAccess.open(levels_folder_path)
	print("مجلد المستويات: ", levels_folder_path)
	if dir:
		dir.list_dir_begin()
		var file_name = dir.get_next()
		print("قائمة المستويات: ", levels_folder_path)
		while file_name != "":
			# التنسيق والتأكد من فتح الملفات التي تنتهي بـ .tscn ولا تبدأ بنقطة
			if not dir.current_is_dir() and (file_name.ends_with(".tscn") or file_name.ends_with(".tscn.remap")):
				var clean_name = file_name.replace(".remap", "").get_basename()
				create_level_button(clean_name, levels_folder_path + clean_name + ".tscn")
				
			file_name = dir.get_next()
		dir.list_dir_end()
	else:
		print("خطأ: تعذر الوصول إلى مجلد المستويات على المسار: ", levels_folder_path)
	
func create_level_button(level_name: String, full_path: String) -> void:
	# إنشاء زر جديد برمجياً
	var btn = Button.new()
	btn.text = level_name
	
	# إعطاء حجم مناسب للزر
	btn.custom_minimum_size = Vector2(150, 100)
	
	# ربط حدث الضغط على الزر بـ Callable لنقل اللاعب للمستوى
	btn.pressed.connect(func(): _on_level_selected(full_path))
	
	# إضافة الزر داخل الـ GridContainer
	grid_container.add_child(btn)

func _on_level_selected(level_path: String) -> void:
	print("جاري تحميل المستوى: ", level_path)
	get_tree().change_scene_to_file(level_path)
