import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../services/api_service.dart';

class ScanQrScreen extends StatefulWidget {
  const ScanQrScreen({super.key});

  @override
  State<ScanQrScreen> createState() => _ScanQrScreenState();
}

class _ScanQrScreenState extends State<ScanQrScreen> {
  bool _isProcessing = false;

  void _handleBarcode(BarcodeCapture capture) async {
    if (_isProcessing) return;
    
    final List<Barcode> barcodes = capture.barcodes;
    final String? rawValue = barcodes.first.rawValue;
    
    if (rawValue == null) return;
    
    // Debug: show what the camera actually saw
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Scanned: $rawValue'), duration: const Duration(seconds: 1)),
    );

    if (!rawValue.contains('MAMS-SESSION-') && !rawValue.contains('/scan/')) return;

    setState(() { _isProcessing = true; });

    try {
      int sessionId;
      if (rawValue.contains('MAMS-SESSION-')) {
        sessionId = int.parse(rawValue.split('MAMS-SESSION-')[1]);
      } else {
        sessionId = int.parse(rawValue.split('/scan/').last);
      }
      final result = await ApiService.scanAttendance(sessionId);
      
      if (!mounted) return;
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message']),
          backgroundColor: result['success'] ? Colors.green : Colors.red,
        ),
      );
      
      if (result['success']) {
        Navigator.pop(context);
      } else {
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) setState(() { _isProcessing = false; });
        });
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) setState(() { _isProcessing = false; });
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan Attendance QR'),
        backgroundColor: const Color(0xFF4F46E5),
        foregroundColor: Colors.white,
      ),
      body: Stack(
        children: [
          MobileScanner(
            onDetect: _handleBarcode,
          ),
          CustomPaint(
            painter: ScannerOverlay(),
            child: Container(),
          ),
          if (_isProcessing)
            Container(
              color: Colors.black54,
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: Colors.white),
                    SizedBox(height: 16),
                    Text('Recording Attendance...', style: TextStyle(color: Colors.white, fontSize: 16)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class ScannerOverlay extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black54
      ..style = PaintingStyle.fill;
      
    final path = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
      ..addRRect(RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: Offset(size.width / 2, size.height / 2),
          width: 250,
          height: 250,
        ),
        const Radius.circular(16),
      ))
      ..fillType = PathFillType.evenOdd;
      
    canvas.drawPath(path, paint);
    
    final borderPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;
      
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: Offset(size.width / 2, size.height / 2),
          width: 250,
          height: 250,
        ),
        const Radius.circular(16),
      ),
      borderPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
