import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../services/api_service.dart';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  bool _scanned = false;
  String _message = '';
  bool _success = false;

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_scanned) return;
    final barcode = capture.barcodes.firstOrNull;
    if (barcode == null) return;

    final code = barcode.rawValue?.trim() ?? '';
    if (code.isEmpty) return;

    int? sessionId;
    if (code.contains('/scan/')) {
      final parts = code.split('/scan/');
      sessionId = int.tryParse(parts.last.replaceAll('/', ''));
    } else if (code.startsWith('MAMS-SESSION-')) {
      sessionId = int.tryParse(code.split('-').last);
    } else {
      sessionId = int.tryParse(code);
    }

    if (sessionId == null) return;

    setState(() => _scanned = true);

    try {
      final result = await ApiService.scanAttendance(sessionId);

      setState(() {
        _success = result['success'] == true;
        _message = result['message'] ?? (_success ? 'Attendance recorded' : 'Failed to record attendance');
      });
    } catch (e) {
      setState(() {
        _message = 'Failed to record attendance: $e';
        _success = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A1628),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1F3864),
        title: const Text(
          'Scan QR Code',
          style: TextStyle(color: Colors.white),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Column(
        children: [
          Expanded(
            flex: 3,
            child: _scanned
                ? Center(
                    child: Container(
                      margin: const EdgeInsets.all(24),
                      padding: const EdgeInsets.all(32),
                      decoration: BoxDecoration(
                        color: _success
                            ? const Color(0xFF4CAF50).withValues(alpha: 0.15)
                            : Colors.red.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: _success
                              ? const Color(0xFF4CAF50)
                              : Colors.red,
                        ),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _success
                                ? Icons.check_circle_outline
                                : Icons.error_outline,
                            size: 64,
                            color: _success
                                ? const Color(0xFF4CAF50)
                                : Colors.red,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _message,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: _success
                                  ? const Color(0xFF4CAF50)
                                  : Colors.red,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 24),
                          ElevatedButton(
                            onPressed: () => setState(() => _scanned = false),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF1F3864),
                            ),
                            child: const Text(
                              'Scan Again',
                              style: TextStyle(color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : MobileScanner(onDetect: _onDetect),
          ),
          Container(
            padding: const EdgeInsets.all(20),
            child: const Text(
              'Point your camera at the MAMS QR code to check in',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white60, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }
}
