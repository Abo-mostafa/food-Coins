extends Control

const SAVE_PATH := "user://player_profile.dat"
const CLIENT_ID := "82220331811-38nk6u1s815i3do7jjngvniaqebd5dld.apps.googleusercontent.com"
const FIREBASE_API_KEY := "AIzaSyAWaNAy7wK1hTGLkvNoTYkCrI_8BMM0tVk"
const PORT := 8080
const REDIRECT_URI := "http://localhost:8080"
const DEEP_LINK_SCHEME := "foodcoins"  # ⚠️ غيرته: lowercase بدون واصلة
const DEEP_LINK_HOST := "oauth2callback"

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
	"access_token": ""
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
	
	# ─── التحقق من Deep Link عند بدء التطبيق على الموبايل ───
	if is_mobile:
		_check_deep_link()
	
	if player_data["is_logged_in"]:
		_verify_firebase_token()

# ─── مهم جداً: يتم استدعاؤه عند استئناف التطبيق من الخلفية ───
func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_RESUMED and is_mobile:
		_check_deep_link()

# ==========================================
# 1. تسجيل الدخول (Desktop & Mobile)
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
		tcp_server = null
	
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
	var redirect_uri = DEEP_LINK_SCHEME + "://" + DEEP_LINK_HOST
	var full_url = "%s?client_id=%s&redirect_uri=%s&response_type=token&scope=%s&prompt=consent" % [
		auth_url, CLIENT_ID, redirect_uri, scope.uri_encode()
	]
	
	print("[Auth] فتح المتصفح للتسجيل (موبايل)...")
	OS.shell_open(full_url)

# ==========================================
# 2. معالجة رد السيرفر (Desktop) - مُصلح بالكامل
# ==========================================
func _process(_delta: float) -> void:
	if not is_mobile and tcp_server and tcp_server.is_connection_available():
		var peer = tcp_server.take_connection()
		if peer:
			var bytes = peer.get_available_bytes()
			if bytes > 0:
				var request_string = peer.get_string(bytes)
				_handle_oauth_response(peer, request_string)

func _handle_oauth_response(peer: StreamPeerTCP, request: String) -> void:
	# ─── الحالة الأولى: استلام access_token في Query String ───
	if "GET /?" in request and "access_token=" in request:
		var access_token = _extract_token_from_request(request)
		if access_token != "":
			player_data["access_token"] = access_token
			
			# ✅ إرسال صفحة نجاح للمتصفح (هذا ما كان ينقص!)
			var success_html = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><title>تم التسجيل</title></head>
<body style="font-family:sans-serif; text-align:center; padding-top:60px; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:white;">
	<div style="background:rgba(255,255,255,0.15); padding:40px; border-radius:20px; display:inline-block;">
		<h1 style="font-size:48px; margin-bottom:10px;">✅</h1>
		<h2>تم تسجيل الدخول بنجاح!</h2>
		<p>يمكنك إغلاق هذه الصفحة والعودة إلى اللعبة.</p>
	</div>
	<script>setTimeout(function(){ window.close(); }, 2500);</script>
</body></html>"""
			
			_send_http_response(peer, success_html)
			peer.disconnect_from_host()
			tcp_server.stop()
			tcp_server = null
			
			print("[Success] تم استلام الـ Access Token!")
			_fetch_google_user_profile(access_token)
			return
	
	# ─── الحالة الثانية: Google ترجع التوكن في #hash ───
	# المتصفح لا يرسل الـ hash للسيرفر، لذا نرسل JavaScript يقرأه ويعيد التوجيه
	var redirect_html = """<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>جاري التحويل...</title></head>
<body style="font-family:sans-serif; text-align:center; padding-top:50px;">
	<h2 style="color:#2196F3;">⏳ جاري إتمام تسجيل الدخول...</h2>
	<p>يرجى الانتظار...</p>
	<script>
		if (window.location.hash && window.location.hash.length > 1) {
			var hash = window.location.hash.substring(1);
			window.location.replace("http://localhost:8080/?" + hash);
		} else {
			document.body.innerHTML = "<h2 style='color:red;'>❌ لم يتم العثور على بيانات المصادقة</h2><p>يرجى المحاولة مرة أخرى.</p>";
		}
	</script>
</body></html>"""
	
	_send_http_response(peer, redirect_html)
	peer.disconnect_from_host()

func _send_http_response(peer: StreamPeerTCP, body: String, status: String = "200 OK") -> void:
	var body_bytes = body.to_utf8_buffer()
	var header = "HTTP/1.1 %s\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: %d\r\nConnection: close\r\n\r\n" % [status, body_bytes.size()]
	peer.put_data(header.to_utf8_buffer())
	peer.put_data(body_bytes)

func _extract_token_from_request(request: String) -> String:
	# استخراج access_token من سطر GET فقط (أكثر أماناً)
	var lines = request.split("\r\n")
	if lines.size() == 0:
		return ""
	
	var first_line = lines[0]
	if not first_line.begins_with("GET /"):
		return ""
	
	var query_start = first_line.find("?")
	if query_start == -1:
		return ""
	
	var query_end = first_line.find(" ", query_start)
	if query_end == -1:
		query_end = first_line.length()
	
	var query = first_line.substr(query_start + 1, query_end - query_start - 1)
	var token_key = "access_token="
	var token_start = query.find(token_key)
	if token_start == -1:
		return ""
	
	token_start += token_key.length()
	var token_end = query.find("&", token_start)
	if token_end == -1:
		token_end = query.length()
	
	return query.substr(token_start, token_end - token_start)

# ==========================================
# 3. معالجة Deep Link على Android
# ==========================================
func _check_deep_link() -> void:
	# الخيار الأفضل: إذا كنت تستخدم Deeplink Plugin
	if Engine.has_singleton("Deeplink"):
		var deeplink = Engine.get_singleton("Deeplink")
		var url = deeplink.get_link_url()
		if url and url.contains("access_token="):
			_process_access_token_from_url(url)
		return
	
	# احتياطي: قراءة من command line args
	var args = OS.get_cmdline_args()
	for arg in args:
		if arg.contains("access_token="):
			_process_access_token_from_url(arg)
			return

func _process_access_token_from_url(url: String) -> void:
	var token = _extract_param_from_url(url, "access_token")
	if token != "":
		player_data["access_token"] = token
		print("[Mobile] تم استلام Access Token من Deep Link")
		_fetch_google_user_profile(token)

func _extract_param_from_url(url: String, param: String) -> String:
	var pattern = param + "="
	var start = url.find(pattern)
	if start == -1:
		return ""
	start += pattern.length()
	var end = url.find("&", start)
	if end == -1:
		end = url.find("#", start)
	if end == -1:
		end = url.length()
	return url.substr(start, end - start)

# ==========================================
# 4. جلب بيانات المستخدم من Google
# ==========================================
func _fetch_google_user_profile(token: String) -> void:
	print("[Google] جاري جلب بيانات المستخدم...")
	var url = "https://www.googleapis.com/oauth2/v3/userinfo"
	var headers = ["Authorization: Bearer " + token]
	http_request.request(url, headers)

func _on_http_request_completed(_result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	var json = JSON.new()
	var parse_result = json.parse(body.get_string_from_utf8())
	
	if parse_result != OK:
		print("[Error] فشل قراءة استجابة السيرفر.")
		return
	
	var response = json.data
	print("[Response] كود الاستجابة: ", response_code)
	
	if response.has("email") and response.has("sub"):
		_handle_google_user_info(response)
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
	
	player_data["avatar_url"] = avatar
	
	if email:
		_sign_in_with_firebase_google(email, user_name, google_id)
	else:
		print("[Error] لم يتم استلام البريد الإلكتروني")

# ==========================================
# 5. تسجيل الدخول إلى Firebase
# ==========================================
func _sign_in_with_firebase_google(email: String, user_name: String, google_id: String) -> void:
	print("[Firebase] جاري تسجيل الدخول إلى Firebase...")
	
	var url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=" + FIREBASE_API_KEY
	var headers = ["Content-Type: application/json"]
	
	var body_dict = {
		"postBody": "access_token=" + player_data["access_token"] + "&providerId=google.com",
		"requestUri": REDIRECT_URI if not is_mobile else (DEEP_LINK_SCHEME + "://" + DEEP_LINK_HOST),
		"returnIdpCredential": true,
		"returnSecureToken": true
	}
	
	var error = http_request.request(url, headers, HTTPClient.METHOD_POST, JSON.stringify(body_dict))
	if error != OK:
		print("[Error] فشل إرسال طلب Firebase: ", error)

func _handle_firebase_response(response: Dictionary, response_code: int) -> void:
	if response_code != 200:
		print("[Firebase Error] فشل التسجيل. كود: ", response_code)
		print("التفاصيل: ", response)
		
		if response.has("error") and response.error.has("message"):
			var msg = response.error.message
			if "API key not valid" in msg:
				print("[Error] ⚠️ مفتاح Firebase API غير صحيح!")
			elif "INVALID_IDP_RESPONSE" in msg or "invalid access_token" in msg.to_lower():
				print("[Error] الـ Access Token غير كافٍ. استخدم Authorization Code Flow للحصول على ID Token.")
		return
	
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
# 6. التحقق من التوكن
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
# 7. تسجيل الخروج
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
# 8. واجهة المستخدم والحفظ
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
