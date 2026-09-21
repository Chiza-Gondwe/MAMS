import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  static const _secureStorage = FlutterSecureStorage();
  // Default URL: localhost:8000 (standard for ADB reverse port-forwarding over USB)
  static const String defaultBaseUrl = 'http://127.0.0.1:8000/api';

  static Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('custom_base_url') ?? defaultBaseUrl;
  }

  static Future<void> setBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    String formatted = url.trim();
    if (formatted.endsWith('/')) {
      formatted = formatted.substring(0, formatted.length - 1);
    }
    if (!formatted.endsWith('/api')) {
      formatted = '$formatted/api';
    }
    await prefs.setString('custom_base_url', formatted);
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('access_token');
  }

  static Map<String, dynamic>? decodeTokenPayload(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;
      final payload = parts[1];
      final normalized = base64Url.normalize(payload);
      final resp = utf8.decode(base64Url.decode(normalized));
      return jsonDecode(resp);
    } catch (_) {
      return null;
    }
  }

  static Future<void> saveTokens(String access, String refresh) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access_token', access);
    await prefs.setString('refresh_token', refresh);

    final payload = decodeTokenPayload(access);
    if (payload != null) {
      if (payload['user_id'] != null) {
        await prefs.setInt('user_id', payload['user_id']);
      }
      if (payload['member_id'] != null) {
        await prefs.setInt('member_id', payload['member_id']);
      }
      if (payload['role'] != null) {
        await prefs.setString('role', payload['role'].toString());
      }
      if (payload['username'] != null) {
        await prefs.setString('username', payload['username'].toString());
      }
      if (payload['first_name'] != null) {
        await prefs.setString('first_name', payload['first_name'].toString());
      }
      if (payload['last_name'] != null) {
        await prefs.setString('last_name', payload['last_name'].toString());
      }
    }
  }

  static Future<void> saveVaultCredentials(String usernameOrEmail, String password) async {
    try {
      await _secureStorage.write(key: 'vault_username', value: usernameOrEmail.trim());
      await _secureStorage.write(key: 'vault_password', value: password);
      await _secureStorage.write(key: 'vault_enabled', value: 'true');
    } catch (e) {
      print('Failed to save vault credentials: $e');
    }
  }

  static Future<Map<String, String>?> getVaultCredentials() async {
    try {
      final enabled = await _secureStorage.read(key: 'vault_enabled');
      if (enabled != 'true') return null;
      final username = await _secureStorage.read(key: 'vault_username');
      final password = await _secureStorage.read(key: 'vault_password');
      if (username != null && password != null) {
        return {'username': username, 'password': password};
      }
    } catch (e) {
      print('Failed to read vault credentials: $e');
    }
    return null;
  }

  static Future<bool> hasVaultCredentials() async {
    try {
      final enabled = await _secureStorage.read(key: 'vault_enabled');
      if (enabled != 'true') return false;
      final username = await _secureStorage.read(key: 'vault_username');
      final password = await _secureStorage.read(key: 'vault_password');
      return username != null && password != null;
    } catch (_) {
      return false;
    }
  }

  static Future<void> clearVaultCredentials() async {
    try {
      await _secureStorage.delete(key: 'vault_username');
      await _secureStorage.delete(key: 'vault_password');
      await _secureStorage.delete(key: 'vault_enabled');
    } catch (_) {}
  }

  static Future<void> clearTokens() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('refresh_token');
    await prefs.remove('user_id');
    await prefs.remove('member_id');
    await prefs.remove('role');
    await prefs.remove('username');
    await prefs.remove('first_name');
    await prefs.remove('last_name');
  }

  static Future<Map<String, dynamic>> login(
    String usernameOrEmail,
    String password, {
    bool saveToVault = true,
  }) async {
    try {
      final baseUrl = await getBaseUrl();
      final response = await http
          .post(
            Uri.parse('$baseUrl/token/'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'username': usernameOrEmail, 'password': password}),
          )
          .timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['access'] != null) {
        await saveTokens(data['access'], data['refresh'] ?? '');
        if (saveToVault) {
          await saveVaultCredentials(usernameOrEmail, password);
        }
        return {'success': true, 'data': data};
      } else {
        String errorMsg = 'Invalid username or password.';
        if (data is Map && data['detail'] != null) {
          errorMsg = data['detail'];
        } else if (data is Map && data['non_field_errors'] != null) {
          errorMsg = (data['non_field_errors'] as List).join(' ');
        }
        return {'success': false, 'error': errorMsg};
      }
    } catch (e) {
      return {
        'success': false,
        'error':
            'Unable to connect to backend server.\nMake sure "adb reverse tcp:8000 tcp:8000" or server IP is active.\n($e)',
      };
    }
  }

  static Future<Map<String, dynamic>> getCurrentUser() async {
    try {
      final token = await getToken();
      if (token == null) return {'error': 'No authentication token found'};

      final baseUrl = await getBaseUrl();
      final response = await http.get(
        Uri.parse('$baseUrl/auth/me/'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Connection failed: $e'};
    }
  }

  static Future<Map<String, dynamic>> updateProfile(
    Map<String, dynamic> data, {
    File? profileImage,
  }) async {
    try {
      final token = await getToken();
      if (token == null) return {'error': 'No authentication token found'};

      final baseUrl = await getBaseUrl();
      final uri = Uri.parse('$baseUrl/auth/update_profile/');

      if (profileImage != null) {
        var request = http.MultipartRequest('PATCH', uri);
        request.headers['Authorization'] = 'Bearer $token';
        
        data.forEach((key, value) {
          if (value != null) {
            request.fields[key] = value.toString();
          }
        });

        request.files.add(await http.MultipartFile.fromPath(
          'profile_picture',
          profileImage.path,
        ));

        var streamedResponse = await request.send();
        var response = await http.Response.fromStream(streamedResponse);
        return jsonDecode(response.body);
      } else {
        final response = await http.patch(
          uri,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
          body: jsonEncode(data),
        );
        return jsonDecode(response.body);
      }
    } catch (e) {
      return {'error': 'Connection failed: $e'};
    }
  }

  static Future<Map<String, dynamic>> verifyOrgCode(String code) async {
    try {
      final baseUrl = await getBaseUrl();
      final response = await http.get(
        Uri.parse('$baseUrl/churches/verify-code/?code=$code'),
        headers: {'Content-Type': 'application/json'},
      );
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Connection failed: $e'};
    }
  }

  static Future<Map<String, dynamic>> register(
    Map<String, dynamic> data, {
    File? profileImage,
  }) async {
    try {
      final baseUrl = await getBaseUrl();
      final uri = Uri.parse('$baseUrl/register/');

      if (profileImage != null) {
        var request = http.MultipartRequest('POST', uri);
        
        data.forEach((key, value) {
          if (value != null) {
            request.fields[key] = value.toString();
          }
        });

        request.files.add(await http.MultipartFile.fromPath(
          'profile_picture',
          profileImage.path,
        ));

        var streamedResponse = await request.send();
        var response = await http.Response.fromStream(streamedResponse);
        return jsonDecode(response.body);
      } else {
        final response = await http.post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(data),
        );
        return jsonDecode(response.body);
      }
    } catch (e) {
      return {'error': 'Connection failed: $e'};
    }
  }

  static Future<Map<String, dynamic>> verifyEmail(
    String email,
    String otp,
  ) async {
    try {
      final baseUrl = await getBaseUrl();
      final response = await http.post(
        Uri.parse('$baseUrl/verify-email/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'otp': otp}),
      );
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Connection failed: $e'};
    }
  }

  static Future<List<dynamic>> getAnnouncements() async {
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final response = await http.get(
        Uri.parse('$baseUrl/announcements/'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      final data = jsonDecode(response.body);
      if (data is Map && data.containsKey('results')) {
        return data['results'];
      } else if (data is List) {
        return data;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  static Future<Map<String, dynamic>?> getMobileDashboardStats() async {
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final response = await http.get(
        Uri.parse('$baseUrl/mobile-dashboard/'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static Future<bool> createAnnouncement(String title, String content, String audience, String announcementType) async {
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final response = await http.post(
        Uri.parse('$baseUrl/announcements/'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'title': title,
          'content': content,
          'audience': audience,
          'announcement_type': announcementType,
        }),
      );
      return response.statusCode == 201;
    } catch (e) {
      print('Error creating announcement: $e');
      return false;
    }
  }

  static Future<bool> deleteAnnouncement(int id) async {
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final response = await http.delete(
        Uri.parse('$baseUrl/announcements/$id/'),
        headers: {'Authorization': 'Bearer $token'},
      );
      return response.statusCode == 204;
    } catch (e) {
      return false;
    }
  }

  static Future<Map<String, dynamic>> scanAttendance(
    int sessionId, [
    int? memberId,
  ]) async {
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final body = memberId != null
          ? jsonEncode({'member_id': memberId})
          : jsonEncode({});
      final response = await http.post(
        Uri.parse('$baseUrl/attendance/sessions/$sessionId/scan/'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: body,
      );
      final data = jsonDecode(response.body);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {'success': true, 'message': data['message'] ?? 'Attendance recorded successfully!'};
      } else {
        return {'success': false, 'message': data['error'] ?? data['detail'] ?? 'Attendance recording failed'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }

  static Future<Map<String, dynamic>> scanTodayAttendance([
    int? memberId,
  ]) async {
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final body = memberId != null
          ? jsonEncode({'member_id': memberId})
          : jsonEncode({});
      final response = await http.post(
        Uri.parse('$baseUrl/attendance/sessions/scan_today/'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: body,
      );
      final data = jsonDecode(response.body);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {'success': true, 'message': data['message'] ?? 'Attendance recorded for today!'};
      } else {
        return {'success': false, 'message': data['error'] ?? data['detail'] ?? 'Check-in failed'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }

  static Future<List<dynamic>> getMembers() async {
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final response = await http.get(
        Uri.parse('$baseUrl/members/'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      final data = jsonDecode(response.body);
      if (data is Map && data.containsKey('results')) {
        return data['results'];
      } else if (data is List) {
        return data;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  static Future<List<dynamic>> getDonations() async {
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final response = await http.get(
        Uri.parse('$baseUrl/finances/donations/'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      final data = jsonDecode(response.body);
      if (data is Map && data.containsKey('results')) {
        return data['results'];
      } else if (data is List) {
        return data;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // --- Group Chat Endpoints ---

  static Future<List<dynamic>> getChatChannels() async {
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final response = await http.get(
        Uri.parse('$baseUrl/chat/channels/'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data is Map && data['results'] is List) return data['results'];
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  static Future<List<dynamic>> getChannelMessages(int channelId, {int? sinceId}) async {
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      String url = '$baseUrl/chat/channels/$channelId/messages/';
      if (sinceId != null) {
        url += '?since_id=$sinceId';
      }
      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data is Map && data['results'] is List) return data['results'];
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  static Future<Map<String, dynamic>?> sendChatMessage(int channelId, String content) async {
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final response = await http.post(
        Uri.parse('$baseUrl/chat/channels/$channelId/messages/'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'content': content}),
      );
      if (response.statusCode == 201) {
        return jsonDecode(response.body);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  static Future<bool> deleteChatMessage(int messageId) async {
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final response = await http.delete(
        Uri.parse('$baseUrl/chat/messages/$messageId/'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      return response.statusCode == 200 || response.statusCode == 204;
    } catch (_) {
      return false;
    }
  }
}
