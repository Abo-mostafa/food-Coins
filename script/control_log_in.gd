extends Control

const SAVE_PATH := "user://player_profile.dat"

# Web Client ID من Firebase / Google Cloud Console
const CLIENT_ID := "82220331811-38nk6u1s815i3do7jjngvniaqebd5dld.apps.googleusercontent.com"

# ⚠️ ضع هنا Web API Key الصحيح من Firebase Console
# يجب أن يبدأ بـ AIzaSy (ليس بالمفتاح الذي يبدأ بـ 1:...)
const FIREBASE_API_KEY := "AIzaSyAWaNAy7wK1hTGLkvNoTYkCrI_8BMM0tVk"  

const PORT := 8080
const REDIRECT_URI := "http://localhost:8080"
const DEEP_LINK_SCHEME := "food-Coins"

@onready var login_button: Button = $Log/LoginButton
@onready var profile_button: Button = $Log/ProfileButton
@onready var user_name_label: Label = $Log/ProfileButton/UserNameLabel
@onready var logout_button: Button = $Log/LogoutButton

var tcp_server: TCPServer
var http_request: HTTPRequest
var is_mobile := false

var player_data := {
	"is_logged_in": false,
	"display_name": "",
	"email": "",
	"avatar_url": "",
	"firebase_uid": "",
	"refresh_token": "",
	"access_token": ""  # تخزين الـ Access Token للاستخدام المستقبلي
}

func _ready() -> void:
	is_mobile = OS.has_feature("android") or OS.has_feature("ios")
	
	if login_button and not login_button.pressed.is_connected(_on_login_button_pressed):
		login_button.pressed.connect(_on_login_button_pressed)
	
	if logout_button and not logout_button.pressed.is_connected(_on_logout_button_pressed):
		logout_button.pressed.connect(_on_logout_button_pressed)
	
	http_request = HTTPRequest.new()
	add_child(http_request)
	http_request.request_completed.connect(_on_http_request_completed)

	load_player_data()
	_update_ui()
	
	if player_data["is_logged_in"]:
		_verify_firebase_token()

func _process(_delta: float) -> void:
	if not is_mobile and tcp_server and tcp_server.is_connection_available():
		var peer = tcp_server.take_connection()
		var request_string = peer.get_string(peer.get_available_bytes())
		
		if "GET /" in request_string:
			_handle_oauth_response(peer, request_string)

# ==========================================
# 1. عملية تسجيل الدخول (Google OAuth2)
# ==========================================
func _on_login_button_pressed() -> void:
	print("\n--- [START] بدء عملية تسجيل الدخول ---")
	
	if is_mobile:
		_login_mobile()
	else:
		_login_desktop()

func _login_desktop() -> void:
	if tcp_server:
		tcp_server.stop()
	
	tcp_server = TCPServer.new()
	var err = tcp_server.listen(PORT)
	if err != OK:
		print("[Error] فشل تشغيل السيرفر المحلي: ", err)
		return

	print("[Auth] السيرفر يعمل على البورت: ", PORT)

	var auth_url = "https://accounts.google.com/o/oauth2/v2/auth"
	var scope = "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"
	var full_url = "%s?client_id=%s&redirect_uri=%s&response_type=token&scope=%s&prompt=consent" % [
		auth_url, CLIENT_ID, REDIRECT_URI, scope.uri_encode()
	]
	
	print("[Auth] فتح المتصفح للتسجيل...")
	OS.shell_open(full_url)

func _login_mobile() -> void:
	var auth_url = "https://accounts.google.com/o/oauth2/v2/auth"
	var scope = "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"
	var redirect_uri = DEEP_LINK_SCHEME + "://oauth2callback"
	var full_url = "%s?client_id=%s&redirect_uri=%s&response_type=token&scope=%s&prompt=consent" % [
		auth_url, CLIENT_ID, redirect_uri, scope.uri_encode()
	]
	
	print("[Auth] فتح المتصفح للتسجيل (موبايل)...")
	OS.shell_open(full_url)

# ==========================================
# 2. استقبال رد المتصفح (Desktop)
# ==========================================
func _handle_oauth_response(peer: StreamPeerTCP, request: String) -> void:
	if "access_token=" in request:
		var access_token = ""
		var start = request.find("access_token=") + 13
		var end = request.find("&", start)
		if end == -1: end = request.find(" ", start)
		access_token = request.substr(start, end - start)
		
		# تخزين الـ Access Token
		player_data["access_token"] = access_token
		
		peer.disconnect_from_host()
		tcp_server.stop()
		
		print("[Success] تم استلام الـ Access Token!")
		_fetch_google_user_profile(access_token)
		return
	
	var html_script = """
	<html>
	<body>
		<h2 style='color:green; font-family:sans-serif;'>✅ جاري إتمام تسجيل الدخول...</h2>
		<p style='font-family:sans-serif;'>يمكنك إغلاق هذه الصفحة الآن.</p>
		<script>
			if (window.location.hash) {
				var hash = window.location.hash.substring(1);
				window.location.href = "http://localhost:8080/?" + hash;
			}
		</script>
	</body>
	</html>
	"""

	var response_bytes = html_script.to_utf8_buffer()
	var header = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: " + str(response_bytes.size()) + "\r\n\r\n"
	
	peer.put_data(header.to_utf8_buffer())
	peer.put_data(response_bytes)

# ==========================================
# 3. جلب بيانات المستخدم من Google
# ==========================================
func _fetch_google_user_profile(token: String) -> void:
	print("[Google] جاري جلب بيانات المستخدم...")
	var url = "https://www.googleapis.com/oauth2/v3/userinfo"
	var headers = ["Authorization: Bearer " + token]
	http_request.request(url, headers)

# ==========================================
# 4. استقبال الردود
# ==========================================
func _on_http_request_completed(_result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	var json = JSON.new()
	var parse_result = json.parse(body.get_string_from_utf8())
	
	if parse_result != OK:
		print("[Error] فشل قراءة استجابة السيرفر.")
		return
	
	var response = json.data
	print("[Response] كود الاستجابة: ", response_code)
	
	# إذا كان رد من Google UserInfo
	if response.has("email") and response.has("sub"):
		_handle_google_user_info(response)
	# إذا كان رد من Firebase
	elif response.has("idToken") or response.has("localId") or response.has("refreshToken"):
		_handle_firebase_response(response, response_code)
	else:
		print("[Response] استجابة غير متوقعة: ", response)

func _handle_google_user_info(response: Dictionary) -> void:
	print("[Google] تم استلام بيانات المستخدم!")
	
	var email = response.get("email", "")
	var user_name = response.get("name", "Player")
	var avatar = response.get("picture", "")
	var google_id = response.get("sub", "")
	
	# حفظ صورة المستخدم
	player_data["avatar_url"] = avatar
	
	if email:
		_sign_in_with_firebase_google(email, user_name, google_id)
	else:
		print("[Error] لم يتم استلام البريد الإلكتروني")

# ==========================================
# 5. تسجيل الدخول إلى Firebase باستخدام Google
# ==========================================
func _sign_in_with_firebase_google(email: String, user_name: String, google_id: String) -> void:
	print("[Firebase] جاري تسجيل الدخول إلى Firebase...")
	
	# الطريقة الصحيحة: استخدام signInWithIdp مع id_token من Google
	# لكن بما أننا نستخدم Access Token، نحتاج إلى ID Token أيضاً
	# الحل: استخدام Accounts:signInWithIdp مع الـ Access Token مباشرة
	
	var url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=" + FIREBASE_API_KEY
	
	var headers = ["Content-Type: application/json"]
	
	# استخدام Access Token مباشرة مع provider
	var body_dict = {
		"postBody": "access_token=" + player_data["access_token"] + "&providerId=google.com",
		"requestUri": REDIRECT_URI,
		"returnIdpCredential": true,
		"returnSecureToken": true
	}
	
	var error = http_request.request(url, headers, HTTPClient.METHOD_POST, JSON.stringify(body_dict))
	if error != OK:
		print("[Error] فشل إرسال طلب Firebase: ", error)

# ==========================================
# 6. معالجة رد Firebase
# ==========================================
func _handle_firebase_response(response: Dictionary, response_code: int) -> void:
	if response_code != 200:
		print("[Firebase Error] فشل التسجيل. كود: ", response_code)
		print("التفاصيل: ", response)
		
		# محاولة بديلة: تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور
		if response.has("error") and response.error.has("message"):
			if "API key not valid" in response.error.message:
				print("[Error] ⚠️ مفتاح Firebase API غير صحيح!")
				print("الرجاء الحصول على Web API Key من Firebase Console")
				print("(يبدأ بـ AIzaSy وليس بـ 1:)")
			elif "EMAIL_EXISTS" in response.error.message:
				print("[Firebase] الحساب موجود، جاري تسجيل الدخول...")
				# محاولة تسجيل الدخول باستخدام البريد الإلكتروني
		return
	
	# تسجيل ناجح
	player_data["is_logged_in"] = true
	player_data["display_name"] = response.get("displayName", response.get("email", "Player"))
	player_data["email"] = response.get("email", "")
	player_data["firebase_uid"] = response.get("localId", "")
	player_data["refresh_token"] = response.get("refreshToken", "")
	
	print("\n==========================================")
	print("🎉 تم تسجيل الدخول بنجاح!")
	print("👤 اسم المستخدم: ", player_data["display_name"])
	print("📧 البريد الإلكتروني: ", player_data["email"])
	print("🆔 Firebase UID: ", player_data["firebase_uid"])
	print("==========================================\n")
	
	save_player_data()
	_update_ui()

# ==========================================
# 7. التحقق من صحة التوكن (Refresh)
# ==========================================
func _verify_firebase_token() -> void:
	if not player_data["refresh_token"]:
		print("[Warning] لا يوجد Refresh Token للتحقق")
		_on_logout_button_pressed()
		return
	
	print("[Auth] جاري التحقق من صحة الجلسة...")
	var url = "https://securetoken.googleapis.com/v1/token?key=" + FIREBASE_API_KEY
	var headers = ["Content-Type: application/x-www-form-urlencoded"]
	var body = "grant_type=refresh_token&refresh_token=" + player_data["refresh_token"]
	
	var error = http_request.request(url, headers, HTTPClient.METHOD_POST, body)
	if error != OK:
		print("[Error] فشل تحديث التوكن: ", error)

# ==========================================
# 8. تسجيل الخروج
# ==========================================
func _on_logout_button_pressed() -> void:
	print("[Auth] جاري تسجيل الخروج...")
	
	player_data = {
		"is_logged_in": false,
		"display_name": "",
		"email": "",
		"avatar_url": "",
		"firebase_uid": "",
		"refresh_token": "",
		"access_token": ""
	}
	
	save_player_data()
	_update_ui()
	print("[Success] تم تسجيل الخروج بنجاح!")

# ==========================================
# 9. واجهة المستخدم والحفظ
# ==========================================
func _update_ui() -> void:
	if player_data["is_logged_in"]:
		if login_button: login_button.hide()
		if profile_button: profile_button.show()
		if logout_button: logout_button.show()
		if user_name_label: 
			user_name_label.text = player_data["display_name"]
	else:
		if login_button: login_button.show()
		if profile_button: profile_button.hide()
		if logout_button: logout_button.hide()

func save_player_data() -> void:
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file:
		file.store_var(player_data)
		file.close()

func load_player_data() -> void:
	if FileAccess.file_exists(SAVE_PATH):
		var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
		if file:
			var data = file.get_var()
			if data is Dictionary:
				player_data = data
			file.close()
