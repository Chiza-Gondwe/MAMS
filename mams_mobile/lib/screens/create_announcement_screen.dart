import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/theme_controller.dart';

class CreateAnnouncementScreen extends StatefulWidget {
  const CreateAnnouncementScreen({super.key});

  @override
  State<CreateAnnouncementScreen> createState() => _CreateAnnouncementScreenState();
}

class _CreateAnnouncementScreenState extends State<CreateAnnouncementScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();
  final _aiPromptController = TextEditingController();
  String _audience = 'all';
  String _announcementType = 'text';
  String _aiTone = 'warm';
  bool _isLoading = false;
  bool _isGeneratingAI = false;

  Future<void> _generateWithAI() async {
    final prompt = _aiPromptController.text.trim();
    if (prompt.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Enter a short note first (e.g. Choir rehearsal Saturday 2pm)'),
        ),
      );
      return;
    }
    setState(() => _isGeneratingAI = true);
    try {
      final data = await ApiService.draftMessageWithAI(
        prompt: prompt,
        tone: _aiTone,
        audience: _audience,
      );
      if (!mounted) return;
      if (data != null) {
        setState(() {
          if ((data['title'] ?? '').toString().isNotEmpty) {
            _titleController.text = data['title'].toString();
          }
          if ((data['content'] ?? '').toString().isNotEmpty) {
            _contentController.text = data['content'].toString();
          }
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Announcement drafted with AI!')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not reach AI drafter. Check connection.')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isGeneratingAI = false);
      }
    }
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    
    try {
      final success = await ApiService.createAnnouncement(
        _titleController.text.trim(),
        _contentController.text.trim(),
        _audience,
        _announcementType,
      );
      
      if (success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Announcement created successfully!')),
          );
          Navigator.pop(context, true);
        }
      } else {
        throw Exception('Failed to create announcement');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    _aiPromptController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = MamsColors.of(context);

    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        title: Text('New Announcement', style: TextStyle(color: colors.textPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
        backgroundColor: colors.background,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: IconThemeData(color: colors.textPrimary),
      ),
      body: _isLoading 
          ? Center(child: CircularProgressIndicator(color: colors.primaryNavy))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20.0),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: colors.cardSurface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: colors.cardBorder),
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // AI Smart Announcement Drafter
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: colors.subtleSurface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: colors.cardBorder),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Icon(Icons.auto_awesome_rounded, size: 16, color: colors.accentBlue),
                                    const SizedBox(width: 6),
                                    Text(
                                      'AI Smart Drafter',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 13,
                                        color: colors.textPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                                DropdownButtonHideUnderline(
                                  child: DropdownButton<String>(
                                    value: _aiTone,
                                    isDense: true,
                                    dropdownColor: colors.cardSurface,
                                    style: TextStyle(
                                      color: colors.textSecondary,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                    items: const [
                                      DropdownMenuItem(value: 'warm', child: Text('Warm Tone')),
                                      DropdownMenuItem(value: 'formal', child: Text('Formal Tone')),
                                      DropdownMenuItem(value: 'urgent', child: Text('Urgent Notice')),
                                    ],
                                    onChanged: (val) {
                                      if (val != null) setState(() => _aiTone = val);
                                    },
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            TextField(
                              controller: _aiPromptController,
                              style: TextStyle(color: colors.textPrimary, fontSize: 13),
                              decoration: InputDecoration(
                                hintText: 'Brief note: e.g. Youth meeting Saturday 2pm at Main Hall...',
                                hintStyle: TextStyle(color: colors.textMuted, fontSize: 12.5),
                                isDense: true,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: BorderSide(color: colors.cardBorder),
                                ),
                                filled: true,
                                fillColor: colors.cardSurface,
                              ),
                            ),
                            const SizedBox(height: 10),
                            SizedBox(
                              width: double.infinity,
                              height: 38,
                              child: OutlinedButton.icon(
                                onPressed: _isGeneratingAI ? null : _generateWithAI,
                                icon: _isGeneratingAI
                                    ? SizedBox(
                                        width: 14,
                                        height: 14,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: colors.primaryNavy,
                                        ),
                                      )
                                    : Icon(Icons.auto_awesome_rounded, size: 15, color: colors.accentBlue),
                                label: Text(
                                  _isGeneratingAI ? 'Drafting Announcement...' : 'Generate with AI',
                                  style: TextStyle(
                                    color: colors.textPrimary,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12.5,
                                  ),
                                ),
                                style: OutlinedButton.styleFrom(
                                  side: BorderSide(color: colors.cardBorder),
                                  backgroundColor: colors.cardSurface,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),
                      Text('Title', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: colors.textPrimary)),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _titleController,
                        style: TextStyle(color: colors.textPrimary),
                        decoration: InputDecoration(
                          hintText: 'e.g. Youth Meeting Moved',
                          hintStyle: TextStyle(color: colors.textMuted),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: colors.cardBorder),
                          ),
                          filled: true,
                          fillColor: colors.subtleSurface,
                        ),
                        validator: (value) => value == null || value.isEmpty ? 'Title is required' : null,
                      ),
                      const SizedBox(height: 18),
                      Text('Message', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: colors.textPrimary)),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _contentController,
                        maxLines: 5,
                        style: TextStyle(color: colors.textPrimary),
                        decoration: InputDecoration(
                          hintText: 'Type your message here...',
                          hintStyle: TextStyle(color: colors.textMuted),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: colors.cardBorder),
                          ),
                          filled: true,
                          fillColor: colors.subtleSurface,
                        ),
                        validator: (value) => value == null || value.isEmpty ? 'Message is required' : null,
                      ),
                      const SizedBox(height: 18),
                      Text('Audience', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: colors.textPrimary)),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        initialValue: _audience,
                        dropdownColor: colors.cardSurface,
                        style: TextStyle(color: colors.textPrimary),
                        decoration: InputDecoration(
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: colors.cardBorder),
                          ),
                          filled: true,
                          fillColor: colors.subtleSurface,
                        ),
                        items: const [
                          DropdownMenuItem(value: 'all', child: Text('Everyone (Church & PTA)')),
                          DropdownMenuItem(value: 'members', child: Text('Church Members Only')),
                          DropdownMenuItem(value: 'leaders', child: Text('All Leaders')),
                          DropdownMenuItem(value: 'section_admins', child: Text('Section Leaders Only')),
                          DropdownMenuItem(value: 'zone_admins', child: Text('Zone Leaders Only')),
                          DropdownMenuItem(value: 'pta', child: Text('PTA Officials')),
                        ],
                        onChanged: (value) {
                          setState(() => _audience = value!);
                        },
                      ),
                      const SizedBox(height: 18),
                      Text('Type', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: colors.textPrimary)),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        initialValue: _announcementType,
                        dropdownColor: colors.cardSurface,
                        style: TextStyle(color: colors.textPrimary),
                        decoration: InputDecoration(
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: colors.cardBorder),
                          ),
                          filled: true,
                          fillColor: colors.subtleSurface,
                        ),
                        items: const [
                          DropdownMenuItem(value: 'text', child: Text('Text Announcement')),
                          DropdownMenuItem(value: 'video', child: Text('Video Link')),
                        ],
                        onChanged: (value) {
                          setState(() => _announcementType = value!);
                        },
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: colors.primaryNavy,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text('Send Announcement', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
    );
  }
}


