import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  static const _secureStorage = FlutterSecureStorage();
  // Default URL: Permanent Cloud Server (works 24/7 anywhere on Mobile Data or Wi-Fi)
  static const String defaultBaseUrl = 'https://mamszambia.pythonanywhere.com/api';
  static const Duration _timeout = Duration(seconds: 12);

  /// Tracks whether the app is currently operating on cached offline data
  static bool isOfflineMode = false;

  static Map<String, String> _jsonHeaders([String? token]) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  static Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('custom_base_url');
    if (saved == null ||
        saved.isEmpty ||
        saved.contains('172.16.') ||
        saved.contains('10.77.') ||
        saved.contains('127.0.0.1') ||
        saved.contains('trycloudflare.com')) {
      await prefs.setString('custom_base_url', defaultBaseUrl);
      return defaultBaseUrl;
    }
    return saved;
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
    // Keep a persistent backup token so offline login works even after logout
    await prefs.setString('offline_backup_token', access);

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

  static Future<void> saveVaultCredentials(
    String usernameOrEmail,
    String password,
  ) async {
    try {
      await _secureStorage.write(
        key: 'vault_username',
        value: usernameOrEmail.trim(),
      );
      await _secureStorage.write(key: 'vault_password', value: password);
      await _secureStorage.write(key: 'vault_enabled', value: 'true');
    } catch (e) {
      debugPrint('Failed to save vault credentials: $e');
    }
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('offline_username', usernameOrEmail.trim().toLowerCase());
      await prefs.setString('offline_password', password);
    } catch (_) {}
  }

  static Future<Map<String, String>?> getVaultCredentials() async {
    try {
      final enabled = await _secureStorage.read(key: 'vault_enabled');
      if (enabled == 'true') {
        final username = await _secureStorage.read(key: 'vault_username');
        final password = await _secureStorage.read(key: 'vault_password');
        if (username != null && password != null) {
          return {'username': username, 'password': password};
        }
      }
    } catch (e) {
      debugPrint('Failed to read vault credentials: $e');
    }
    try {
      final prefs = await SharedPreferences.getInstance();
      final u = prefs.getString('offline_username');
      final p = prefs.getString('offline_password');
      if (u != null && p != null && u.isNotEmpty) {
        return {'username': u, 'password': p};
      }
    } catch (_) {}
    return null;
  }

  static Future<bool> hasVaultCredentials() async {
    final creds = await getVaultCredentials();
    return creds != null;
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
            headers: _jsonHeaders(),
            body: jsonEncode({
              'username': usernameOrEmail,
              'password': password,
            }),
          )
          .timeout(_timeout);

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['access'] != null) {
        isOfflineMode = false;
        await saveTokens(data['access'], data['refresh'] ?? '');
        if (saveToVault) {
          await saveVaultCredentials(usernameOrEmail, password);
        }
        await syncOfflineAttendanceQueue();
        return {'success': true, 'data': data, 'offline': false};
      } else {
        String errorMsg = 'Invalid username or password.';
        if (data is Map && data['detail'] != null) {
          errorMsg = data['detail'].toString();
        } else if (data is Map && data['non_field_errors'] != null) {
          errorMsg = (data['non_field_errors'] as List).join(' ');
        }
        return {'success': false, 'error': errorMsg};
      }
    } catch (e) {
      // Offline Login Fallback: allow previously authenticated user to sign in without internet
      final prefs = await SharedPreferences.getInstance();
      final creds = await getVaultCredentials();
      final enteredUser = usernameOrEmail.trim().toLowerCase();
      final savedUser = (creds?['username'] ?? prefs.getString('offline_username') ?? '')
          .trim()
          .toLowerCase();
      final savedPass = creds?['password'] ?? prefs.getString('offline_password') ?? '';
      final backupToken =
          prefs.getString('access_token') ?? prefs.getString('offline_backup_token');

      if (savedUser.isNotEmpty &&
          enteredUser == savedUser &&
          password == savedPass &&
          backupToken != null &&
          backupToken.isNotEmpty) {
        isOfflineMode = true;
        await prefs.setString('access_token', backupToken);
        return {
          'success': true,
          'offline': true,
          'data': {'access': backupToken},
        };
      }

      return {
        'success': false,
        'error':
            'No internet connection detected. Sign in once while online to enable Offline Mode on this phone.',
      };
    }
  }

  static Future<Map<String, dynamic>> getCurrentUser() async {
    final prefs = await SharedPreferences.getInstance();
    try {
      final token = await getToken();
      if (token == null) return {'error': 'No authentication token found'};

      final baseUrl = await getBaseUrl();
      final response = await http
          .get(
            Uri.parse('$baseUrl/auth/me/'),
            headers: _jsonHeaders(token),
          )
          .timeout(_timeout);
      if (response.statusCode == 200) {
        isOfflineMode = false;
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          await prefs.setString('cached_user_json', jsonEncode(decoded));
          if (decoded['first_name'] != null) {
            await prefs.setString('first_name', decoded['first_name'].toString());
          }
          if (decoded['last_name'] != null) {
            await prefs.setString('last_name', decoded['last_name'].toString());
          }
          if (decoded['org_name'] != null) {
            await prefs.setString('org_name', decoded['org_name'].toString());
          }
          if (decoded['org_code'] != null &&
              decoded['org_code'].toString().trim().isNotEmpty) {
            await prefs.setString(
              'org_code',
              decoded['org_code'].toString().trim(),
            );
          }
          if (decoded['role'] != null) {
            await prefs.setString('role', decoded['role'].toString());
          }
          if (decoded['member_id'] != null) {
            await prefs.setInt(
              'member_id',
              int.tryParse(decoded['member_id'].toString()) ?? 0,
            );
          }
          if (decoded['section_name'] != null) {
            await prefs.setString(
              'section_name',
              decoded['section_name'].toString(),
            );
          }
          if (decoded['zone_name'] != null) {
            await prefs.setString('zone_name', decoded['zone_name'].toString());
          }
          if (decoded['profile_picture'] != null) {
            await prefs.setString(
              'profile_picture',
              decoded['profile_picture'].toString(),
            );
          } else {
            await prefs.remove('profile_picture');
          }
          // Opportunistically sync any queued offline attendance scans
          syncOfflineAttendanceQueue();
          return decoded;
        }
      }
      return _getCachedUserFallback(prefs);
    } catch (e) {
      isOfflineMode = true;
      return _getCachedUserFallback(prefs);
    }
  }

  static Map<String, dynamic> _getCachedUserFallback(SharedPreferences prefs) {
    final cachedStr = prefs.getString('cached_user_json');
    if (cachedStr != null && cachedStr.isNotEmpty) {
      try {
        final map = Map<String, dynamic>.from(jsonDecode(cachedStr) as Map);
        map['is_offline'] = true;
        return map;
      } catch (_) {}
    }
    final first = prefs.getString('first_name') ?? '';
    final last = prefs.getString('last_name') ?? '';
    if (first.isNotEmpty || last.isNotEmpty) {
      return {
        'first_name': first,
        'last_name': last,
        'username': prefs.getString('username') ?? '',
        'role': prefs.getString('role') ?? 'member',
        'member_id': prefs.getInt('member_id') ?? 0,
        'org_name': prefs.getString('org_name') ?? '',
        'org_code': prefs.getString('org_code') ?? '',
        'section_name': prefs.getString('section_name') ?? 'Unassigned Section',
        'zone_name': prefs.getString('zone_name') ?? 'Unassigned Zone',
        'profile_picture': prefs.getString('profile_picture'),
        'is_offline': true,
      };
    }
    return {'error': 'Offline and no cached profile available'};
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

      Map<String, dynamic> result;
      if (profileImage != null) {
        var request = http.MultipartRequest('PATCH', uri);
        request.headers['Authorization'] = 'Bearer $token';

        data.forEach((key, value) {
          if (value != null) {
            request.fields[key] = value.toString();
          }
        });

        request.files.add(
          await http.MultipartFile.fromPath(
            'profile_picture',
            profileImage.path,
          ),
        );

        var streamedResponse = await request.send().timeout(
          const Duration(seconds: 20),
        );
        var response = await http.Response.fromStream(streamedResponse);
        result = jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        final response = await http
            .patch(
              uri,
              headers: _jsonHeaders(token),
              body: jsonEncode(data),
            )
            .timeout(_timeout);
        result = jsonDecode(response.body) as Map<String, dynamic>;
      }

      if (result.containsKey('profile_picture')) {
        final prefs = await SharedPreferences.getInstance();
        if (result['profile_picture'] != null) {
          await prefs.setString(
            'profile_picture',
            result['profile_picture'].toString(),
          );
        } else {
          await prefs.remove('profile_picture');
        }
      }
      isOfflineMode = false;
      return result;
    } catch (e) {
      return {'error': 'You are currently offline. Connect to the internet to save profile changes.'};
    }
  }

  static Future<Map<String, dynamic>> verifyOrgCode(String code) async {
    try {
      final baseUrl = await getBaseUrl();
      final response = await http
          .get(
            Uri.parse('$baseUrl/churches/verify-code/?code=$code'),
            headers: _jsonHeaders(),
          )
          .timeout(_timeout);
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Unable to verify code while offline. Please check your internet connection.'};
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

        request.files.add(
          await http.MultipartFile.fromPath(
            'profile_picture',
            profileImage.path,
          ),
        );

        var streamedResponse = await request.send().timeout(
          const Duration(seconds: 20),
        );
        var response = await http.Response.fromStream(streamedResponse);
        return jsonDecode(response.body);
      } else {
        final response = await http
            .post(
              uri,
              headers: _jsonHeaders(),
              body: jsonEncode(data),
            )
            .timeout(_timeout);
        return jsonDecode(response.body);
      }
    } catch (e) {
      return {'error': 'Registration requires an internet connection.'};
    }
  }

  static Future<Map<String, dynamic>> verifyEmail(
    String email,
    String otp,
  ) async {
    try {
      final baseUrl = await getBaseUrl();
      final response = await http
          .post(
            Uri.parse('$baseUrl/verify-email/'),
            headers: _jsonHeaders(),
            body: jsonEncode({'email': email, 'otp': otp}),
          )
          .timeout(_timeout);
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Email verification requires an internet connection.'};
    }
  }

  static Future<List<dynamic>> getAnnouncements() async {
    final prefs = await SharedPreferences.getInstance();
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final response = await http
          .get(
            Uri.parse('$baseUrl/announcements/'),
            headers: _jsonHeaders(token),
          )
          .timeout(_timeout);
      if (response.statusCode == 200) {
        isOfflineMode = false;
        final data = jsonDecode(response.body);
        List<dynamic> list = [];
        if (data is Map && data.containsKey('results')) {
          list = data['results'] as List<dynamic>;
        } else if (data is List) {
          list = data;
        }
        await prefs.setString('cached_announcements_json', jsonEncode(list));
        return list;
      }
    } catch (_) {
      isOfflineMode = true;
    }
    final cached = prefs.getString('cached_announcements_json');
    if (cached != null && cached.isNotEmpty) {
      try {
        return jsonDecode(cached) as List<dynamic>;
      } catch (_) {}
    }
    return [];
  }

  static Future<Map<String, dynamic>?> getMobileDashboardStats() async {
    final prefs = await SharedPreferences.getInstance();
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final response = await http
          .get(
            Uri.parse('$baseUrl/mobile-dashboard/'),
            headers: _jsonHeaders(token),
          )
          .timeout(_timeout);
      if (response.statusCode == 200) {
        isOfflineMode = false;
        final data = jsonDecode(response.body);
        if (data is Map<String, dynamic>) {
          await prefs.setString('cached_dashboard_json', jsonEncode(data));
          return data;
        }
      }
    } catch (_) {
      isOfflineMode = true;
    }
    final cached = prefs.getString('cached_dashboard_json');
    if (cached != null && cached.isNotEmpty) {
      try {
        return Map<String, dynamic>.from(jsonDecode(cached) as Map);
      } catch (_) {}
    }
    return null;
  }

  static Future<bool> createAnnouncement(
    String title,
    String content,
    String audience,
    String announcementType,
  ) async {
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final response = await http
          .post(
            Uri.parse('$baseUrl/announcements/'),
            headers: _jsonHeaders(token),
            body: jsonEncode({
              'title': title,
              'content': content,
              'audience': audience,
              'announcement_type': announcementType,
            }),
          )
          .timeout(_timeout);
      return response.statusCode == 201;
    } catch (e) {
      debugPrint('Error creating announcement: $e');
      return false;
    }
  }

  static Future<bool> deleteAnnouncement(int id) async {
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final response = await http
          .delete(
            Uri.parse('$baseUrl/announcements/$id/'),
            headers: _jsonHeaders(token),
          )
          .timeout(_timeout);
      return response.statusCode == 204 || response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  static Future<Map<String, dynamic>> verifyMemberForAttendance([
    int? memberId,
  ]) async {
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final query = memberId != null ? '?member_id=$memberId' : '';
      final response = await http
          .get(
            Uri.parse('$baseUrl/attendance/sessions/verify_member/$query'),
            headers: _jsonHeaders(token),
          )
          .timeout(_timeout);
      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data is Map && data['member'] != null) {
        return {
          'success': true,
          'member': Map<String, dynamic>.from(data['member'] as Map),
        };
      }
      return {
        'success': false,
        'message': (data is Map ? (data['error'] ?? data['detail']) : null) ??
            'Member not found',
      };
    } catch (e) {
      // Offline verification lookup from cached members list
      if (memberId != null) {
        final prefs = await SharedPreferences.getInstance();
        final cached = prefs.getString('cached_members_json');
        if (cached != null && cached.isNotEmpty) {
          try {
            final list = jsonDecode(cached) as List<dynamic>;
            for (final item in list) {
              if (item is Map && item['id'].toString() == memberId.toString()) {
                return {
                  'success': true,
                  'member': {
                    'id': item['id'],
                    'full_name': '${item['first_name'] ?? ''} ${item['last_name'] ?? ''}'.trim(),
                    'first_name': item['first_name'],
                    'last_name': item['last_name'],
                    'section_name': item['section_name'] ?? 'Unassigned Section',
                    'zone_name': item['zone_name'] ?? 'Unassigned Zone',
                    'role': item['role'] ?? 'member',
                    'status': item['status'] ?? 'active',
                    'profile_picture': item['profile_picture'],
                  },
                };
              }
            }
          } catch (_) {}
        }
      }
      return {'success': false, 'message': 'Offline: Member not in cached directory.'};
    }
  }

  /// Saves an attendance scan locally when offline so it can be synced automatically when back online
  static Future<void> _queueOfflineAttendance({int? sessionId, int? memberId}) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = prefs.getStringList('offline_attendance_queue') ?? <String>[];
    final entry = jsonEncode({
      'session_id': sessionId,
      'member_id': memberId,
      'queued_at': DateTime.now().toIso8601String(),
    });
    if (!queue.contains(entry)) {
      queue.add(entry);
      await prefs.setStringList('offline_attendance_queue', queue);
    }
  }

  static Future<int> getOfflineQueueCount() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList('offline_attendance_queue') ?? <String>[]).length;
  }

  static Future<int> syncOfflineAttendanceQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final queue = prefs.getStringList('offline_attendance_queue') ?? <String>[];
    if (queue.isEmpty) return 0;

    final token = await getToken();
    if (token == null) return 0;
    final baseUrl = await getBaseUrl();

    final remaining = <String>[];
    int synced = 0;

    for (final item in queue) {
      try {
        final decoded = jsonDecode(item) as Map<String, dynamic>;
        final sessionId = decoded['session_id'] as int?;
        final memberId = decoded['member_id'] as int?;
        final body = memberId != null ? jsonEncode({'member_id': memberId}) : jsonEncode({});
        final url = sessionId != null
            ? '$baseUrl/attendance/sessions/$sessionId/scan/'
            : '$baseUrl/attendance/sessions/scan_today/';
        final res = await http
            .post(Uri.parse(url), headers: _jsonHeaders(token), body: body)
            .timeout(const Duration(seconds: 8));
        if (res.statusCode >= 200 && res.statusCode < 500) {
          synced++;
        } else {
          remaining.add(item);
        }
      } catch (_) {
        remaining.add(item);
      }
    }

    await prefs.setStringList('offline_attendance_queue', remaining);
    return synced;
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
      final response = await http
          .post(
            Uri.parse('$baseUrl/attendance/sessions/$sessionId/scan/'),
            headers: _jsonHeaders(token),
            body: body,
          )
          .timeout(_timeout);
      final data = jsonDecode(response.body);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {
          'success': true,
          'message': data['message'] ?? 'Attendance recorded successfully!',
          'session_title': data['session_title'],
          'session_date': data['session_date'],
          'already_checked_in': data['already_checked_in'] == true,
          'is_first_visit': data['is_first_visit'] == true,
          'member': data['member'] is Map
              ? Map<String, dynamic>.from(data['member'] as Map)
              : null,
        };
      } else {
        return {
          'success': false,
          'message':
              data['error'] ?? data['detail'] ?? 'Attendance recording failed',
          'member': (data is Map && data['member'] is Map)
              ? Map<String, dynamic>.from(data['member'] as Map)
              : null,
        };
      }
    } catch (e) {
      await _queueOfflineAttendance(sessionId: sessionId, memberId: memberId);
      return {
        'success': true,
        'offline_queued': true,
        'message': 'Recorded in Offline Mode! Will sync automatically when back online.',
        'session_title': 'Offline Attendance Queue',
      };
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
      final response = await http
          .post(
            Uri.parse('$baseUrl/attendance/sessions/scan_today/'),
            headers: _jsonHeaders(token),
            body: body,
          )
          .timeout(_timeout);
      final data = jsonDecode(response.body);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {
          'success': true,
          'message': data['message'] ?? 'Attendance recorded for today!',
          'session_title': data['session_title'],
          'session_date': data['session_date'],
          'already_checked_in': data['already_checked_in'] == true,
          'is_first_visit': data['is_first_visit'] == true,
          'member': data['member'] is Map
              ? Map<String, dynamic>.from(data['member'] as Map)
              : null,
        };
      } else {
        return {
          'success': false,
          'message':
              data['message'] ?? data['error'] ?? data['detail'] ?? 'Check-in failed',
          'member': (data is Map && data['member'] is Map)
              ? Map<String, dynamic>.from(data['member'] as Map)
              : null,
        };
      }
    } catch (e) {
      await _queueOfflineAttendance(memberId: memberId);
      return {
        'success': true,
        'offline_queued': true,
        'message': 'Recorded in Offline Mode! Will sync automatically when back online.',
        'session_title': "Today's Service (Offline Queue)",
      };
    }
  }

  static Future<List<dynamic>> getMembers() async {
    final prefs = await SharedPreferences.getInstance();
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final response = await http
          .get(
            Uri.parse('$baseUrl/members/'),
            headers: _jsonHeaders(token),
          )
          .timeout(_timeout);
      if (response.statusCode == 200) {
        isOfflineMode = false;
        final data = jsonDecode(response.body);
        List<dynamic> list = [];
        if (data is Map && data.containsKey('results')) {
          list = data['results'] as List<dynamic>;
        } else if (data is List) {
          list = data;
        }
        await prefs.setString('cached_members_json', jsonEncode(list));
        return list;
      }
    } catch (_) {
      isOfflineMode = true;
    }
    final cached = prefs.getString('cached_members_json');
    if (cached != null && cached.isNotEmpty) {
      try {
        return jsonDecode(cached) as List<dynamic>;
      } catch (_) {}
    }
    return [];
  }

  static Future<List<dynamic>> getDonations() async {
    final prefs = await SharedPreferences.getInstance();
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final response = await http
          .get(
            Uri.parse('$baseUrl/finances/donations/'),
            headers: _jsonHeaders(token),
          )
          .timeout(_timeout);
      if (response.statusCode == 200) {
        isOfflineMode = false;
        final data = jsonDecode(response.body);
        List<dynamic> list = [];
        if (data is Map && data.containsKey('results')) {
          list = data['results'] as List<dynamic>;
        } else if (data is List) {
          list = data;
        }
        await prefs.setString('cached_donations_json', jsonEncode(list));
        return list;
      }
    } catch (_) {
      isOfflineMode = true;
    }
    final cached = prefs.getString('cached_donations_json');
    if (cached != null && cached.isNotEmpty) {
      try {
        return jsonDecode(cached) as List<dynamic>;
      } catch (_) {}
    }
    return [];
  }

  // --- Group Chat Endpoints ---

  static Future<List<dynamic>> getChatChannels() async {
    final prefs = await SharedPreferences.getInstance();
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final response = await http
          .get(
            Uri.parse('$baseUrl/chat/channels/'),
            headers: _jsonHeaders(token),
          )
          .timeout(_timeout);
      if (response.statusCode == 200) {
        isOfflineMode = false;
        final data = jsonDecode(response.body);
        List<dynamic> list = [];
        if (data is List) {
          list = data;
        } else if (data is Map && data['results'] is List) {
          list = data['results'];
        }
        await prefs.setString('cached_channels_json', jsonEncode(list));
        return list;
      }
    } catch (_) {
      isOfflineMode = true;
    }
    final cached = prefs.getString('cached_channels_json');
    if (cached != null && cached.isNotEmpty) {
      try {
        return jsonDecode(cached) as List<dynamic>;
      } catch (_) {}
    }
    return [];
  }

  static Future<List<dynamic>> getChannelMessages(
    int channelId, {
    int? sinceId,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      String url = '$baseUrl/chat/channels/$channelId/messages/';
      if (sinceId != null) {
        url += '?since_id=$sinceId';
      }
      final response = await http
          .get(
            Uri.parse(url),
            headers: _jsonHeaders(token),
          )
          .timeout(_timeout);
      if (response.statusCode == 200) {
        isOfflineMode = false;
        final data = jsonDecode(response.body);
        List<dynamic> list = [];
        if (data is List) {
          list = data;
        } else if (data is Map && data['results'] is List) {
          list = data['results'];
        }
        if (sinceId == null) {
          await prefs.setString('cached_messages_$channelId', jsonEncode(list));
        }
        return list;
      }
    } catch (_) {
      isOfflineMode = true;
    }
    if (sinceId == null) {
      final cached = prefs.getString('cached_messages_$channelId');
      if (cached != null && cached.isNotEmpty) {
        try {
          return jsonDecode(cached) as List<dynamic>;
        } catch (_) {}
      }
    }
    return [];
  }

  static Future<Map<String, dynamic>?> sendChatMessage(
    int channelId,
    String content, {
    String? attachmentPath,
    String? attachmentType,
  }) async {
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final uri = Uri.parse('$baseUrl/chat/channels/$channelId/messages/');

      if (attachmentPath != null && attachmentPath.isNotEmpty) {
        final request = http.MultipartRequest('POST', uri);
        if (token != null) {
          request.headers['Authorization'] = 'Bearer $token';
        }
        if (content.isNotEmpty) {
          request.fields['content'] = content;
        }
        if (attachmentType != null && attachmentType.isNotEmpty) {
          request.fields['attachment_type'] = attachmentType;
        }
        request.files.add(
          await http.MultipartFile.fromPath('attachment', attachmentPath),
        );
        final streamedResponse = await request.send().timeout(
          const Duration(seconds: 60),
        );
        final response = await http.Response.fromStream(streamedResponse);
        if (response.statusCode == 201) {
          return jsonDecode(response.body);
        }
        return null;
      }

      final response = await http
          .post(
            uri,
            headers: _jsonHeaders(token),
            body: jsonEncode({'content': content}),
          )
          .timeout(_timeout);
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
      final response = await http
          .delete(
            Uri.parse('$baseUrl/chat/messages/$messageId/'),
            headers: _jsonHeaders(token),
          )
          .timeout(_timeout);
      return response.statusCode == 200 || response.statusCode == 204;
    } catch (_) {
      return false;
    }
  }

  static Future<List<int>> bulkDeleteChatMessages(List<int> messageIds) async {
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final response = await http
          .post(
            Uri.parse('$baseUrl/chat/messages/bulk-delete/'),
            headers: _jsonHeaders(token),
            body: jsonEncode({'message_ids': messageIds}),
          )
          .timeout(_timeout);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is Map && data['deleted_ids'] is List) {
          return (data['deleted_ids'] as List)
              .map((e) => int.tryParse(e.toString()) ?? 0)
              .where((id) => id > 0)
              .toList();
        }
        return messageIds;
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  static Future<Map<String, dynamic>?> draftMessageWithAI({
    required String prompt,
    String tone = 'warm',
    String audience = 'all',
  }) async {
    try {
      final baseUrl = await getBaseUrl();
      final token = await getToken();
      final response = await http
          .post(
            Uri.parse('$baseUrl/ai/draft-message/'),
            headers: _jsonHeaders(token),
            body: jsonEncode({
              'prompt': prompt,
              'tone': tone,
              'audience': audience,
            }),
          )
          .timeout(_timeout);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is Map<String, dynamic>) {
          return data;
        }
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
