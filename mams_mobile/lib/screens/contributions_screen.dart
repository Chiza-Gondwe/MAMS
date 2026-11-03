import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/theme_controller.dart';

class ContributionsScreen extends StatefulWidget {
  const ContributionsScreen({super.key});

  @override
  State<ContributionsScreen> createState() => _ContributionsScreenState();
}

class _ContributionsScreenState extends State<ContributionsScreen> {
  List<dynamic> _donations = [];
  List<dynamic> _members = [];
  List<dynamic> _ledgerAccounts = [];
  bool _isLoading = true;
  String _currentUserRole = 'member';

  @override
  void initState() {
    super.initState();
    _initData();
  }

  Future<void> _initData() async {
    await _fetchCurrentUser();
    await Future.wait([
      _fetchDonations(),
      _fetchMeta(),
    ]);
  }

  Future<void> _fetchCurrentUser() async {
    try {
      final user = await ApiService.getCurrentUser();
      if (mounted) {
        setState(() {
          _currentUserRole = (user['role'] ?? 'member').toString().toLowerCase();
        });
      }
    } catch (_) {}
  }

  Future<void> _fetchMeta() async {
    if (!['admin', 'superadmin', 'treasurer', 'zone_treasurer', 'section_treasurer']
        .contains(_currentUserRole)) {
      return;
    }
    try {
      final results = await Future.wait([
        ApiService.getMembers(),
        ApiService.getLedgerAccounts(),
      ]);
      if (mounted) {
        setState(() {
          _members = results[0];
          _ledgerAccounts = results[1];
        });
      }
    } catch (_) {}
  }

  Future<void> _fetchDonations() async {
    if (mounted) {
      setState(() {
        _isLoading = true;
      });
    }
    final data = await ApiService.getDonations();
    if (!mounted) return;
    setState(() {
      _donations = data;
      _isLoading = false;
    });
  }

  bool get _canRecord {
    return [
      'admin',
      'superadmin',
      'treasurer',
      'zone_treasurer',
      'section_treasurer',
    ].contains(_currentUserRole);
  }

  void _openRecordContributionSheet() async {
    final colors = MamsColors.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);

    // If metadata wasn't loaded yet, fetch now
    if (_members.isEmpty || _ledgerAccounts.isEmpty) {
      final results = await Future.wait([
        ApiService.getMembers(),
        ApiService.getLedgerAccounts(),
      ]);
      if (mounted) {
        setState(() {
          _members = results[0];
          _ledgerAccounts = results[1];
        });
      }
    }

    int? selectedMemberId;
    int? selectedLedgerId;
    final amountController = TextEditingController();
    String selectedService = 'Regular Sunday Service';
    DateTime selectedDate = DateTime.now();
    bool isSubmitting = false;

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final dateStr =
                '${selectedDate.year}-${selectedDate.month.toString().padLeft(2, '0')}-${selectedDate.day.toString().padLeft(2, '0')}';

            return Container(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
                left: 20,
                right: 20,
                top: 20,
              ),
              decoration: BoxDecoration(
                color: colors.cardSurface,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: colors.cardBorder,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: colors.successBg,
                          child: Icon(Icons.add_card_rounded,
                              color: colors.successGreen),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Record Contribution',
                                style: TextStyle(
                                  color: colors.textPrimary,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 18,
                                ),
                              ),
                              Text(
                                'Add a tithe, offering, or pledge payment',
                                style: TextStyle(
                                  color: colors.textSecondary,
                                  fontSize: 12.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: Icon(Icons.close_rounded,
                              color: colors.textSecondary),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Divider(color: colors.cardBorder, height: 1),
                    const SizedBox(height: 16),

                    // Member Selection
                    DropdownButtonFormField<int?>(
                      initialValue: selectedMemberId,
                      dropdownColor: colors.cardSurface,
                      isExpanded: true,
                      style: TextStyle(color: colors.textPrimary, fontSize: 14),
                      decoration: InputDecoration(
                        labelText: 'Select Member',
                        labelStyle: TextStyle(color: colors.textSecondary),
                        prefixIcon: Icon(Icons.person_outline_rounded,
                            color: colors.accentBlue, size: 20),
                        filled: true,
                        fillColor: colors.subtleSurface,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: colors.cardBorder),
                        ),
                      ),
                      items: [
                        const DropdownMenuItem<int?>(
                          value: null,
                          child: Text('Anonymous / General Congregation'),
                        ),
                        ..._members.map<DropdownMenuItem<int?>>((m) {
                          final name =
                              '${m['first_name'] ?? ''} ${m['last_name'] ?? ''}'
                                  .trim();
                          final sec = m['section_name'] != null
                              ? ' (${m['section_name']})'
                              : '';
                          return DropdownMenuItem<int?>(
                            value: m['id'] as int?,
                            child: Text(
                              name.isNotEmpty ? '$name$sec' : 'Member #${m['id']}',
                              overflow: TextOverflow.ellipsis,
                            ),
                          );
                        }),
                      ],
                      onChanged: (val) {
                        setModalState(() => selectedMemberId = val);
                      },
                    ),
                    const SizedBox(height: 12),

                    // Ledger / Category Dropdown
                    DropdownButtonFormField<int?>(
                      initialValue: selectedLedgerId,
                      dropdownColor: colors.cardSurface,
                      isExpanded: true,
                      style: TextStyle(color: colors.textPrimary, fontSize: 14),
                      decoration: InputDecoration(
                        labelText: 'Category / Ledger Account',
                        labelStyle: TextStyle(color: colors.textSecondary),
                        prefixIcon: Icon(Icons.category_rounded,
                            color: colors.accentBlue, size: 20),
                        filled: true,
                        fillColor: colors.subtleSurface,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: colors.cardBorder),
                        ),
                      ),
                      items: [
                        const DropdownMenuItem<int?>(
                          value: null,
                          child: Text('General Fund / Tithe & Offering'),
                        ),
                        ..._ledgerAccounts.map<DropdownMenuItem<int?>>((l) {
                          final name =
                              l['name']?.toString() ?? 'Account #${l['id']}';
                          return DropdownMenuItem<int?>(
                            value: l['id'] as int?,
                            child: Text(name, overflow: TextOverflow.ellipsis),
                          );
                        }),
                      ],
                      onChanged: (val) {
                        setModalState(() => selectedLedgerId = val);
                      },
                    ),
                    const SizedBox(height: 12),

                    // Amount Field
                    TextField(
                      controller: amountController,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      style: TextStyle(
                        color: colors.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                      decoration: InputDecoration(
                        labelText: 'Amount (ZMW)',
                        labelStyle: TextStyle(color: colors.textSecondary),
                        prefixText: 'K ',
                        prefixStyle: TextStyle(
                          color: colors.textPrimary,
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                        ),
                        prefixIcon: Icon(Icons.payments_rounded,
                            color: colors.successGreen, size: 20),
                        filled: true,
                        fillColor: colors.subtleSurface,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: colors.cardBorder),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Service Type
                    DropdownButtonFormField<String>(
                      initialValue: selectedService,
                      dropdownColor: colors.cardSurface,
                      style: TextStyle(color: colors.textPrimary, fontSize: 14),
                      decoration: InputDecoration(
                        labelText: 'Service Type',
                        labelStyle: TextStyle(color: colors.textSecondary),
                        prefixIcon: Icon(Icons.event_note_rounded,
                            color: colors.accentBlue, size: 20),
                        filled: true,
                        fillColor: colors.subtleSurface,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: colors.cardBorder),
                        ),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'Regular Sunday Service',
                          child: Text('Regular Sunday Service'),
                        ),
                        DropdownMenuItem(
                          value: 'Midweek Fellowship',
                          child: Text('Midweek Fellowship'),
                        ),
                        DropdownMenuItem(
                          value: 'Section Fellowship',
                          child: Text('Section Fellowship'),
                        ),
                        DropdownMenuItem(
                          value: 'Camp / Conference Meeting',
                          child: Text('Camp / Conference Meeting'),
                        ),
                        DropdownMenuItem(
                          value: 'Special Thanksgiving',
                          child: Text('Special Thanksgiving'),
                        ),
                      ],
                      onChanged: (val) {
                        if (val != null) {
                          setModalState(() => selectedService = val);
                        }
                      },
                    ),
                    const SizedBox(height: 12),

                    // Date Picker Tile
                    InkWell(
                      borderRadius: BorderRadius.circular(10),
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: selectedDate,
                          firstDate: DateTime(2020),
                          lastDate: DateTime.now().add(const Duration(days: 30)),
                        );
                        if (picked != null) {
                          setModalState(() => selectedDate = picked);
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: colors.subtleSurface,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: colors.cardBorder),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.calendar_month_rounded,
                                color: colors.accentBlue, size: 20),
                            const SizedBox(width: 12),
                            Text(
                              'Date: $dateStr',
                              style: TextStyle(
                                color: colors.textPrimary,
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const Spacer(),
                            Text(
                              'Change',
                              style: TextStyle(
                                color: colors.accentBlue,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Submit Button
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: colors.primaryNavy,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: isSubmitting
                            ? null
                            : () async {
                                final amount = double.tryParse(
                                  amountController.text.trim(),
                                );
                                if (amount == null || amount <= 0) {
                                  messenger.showSnackBar(
                                    const SnackBar(
                                      content: Text('Please enter a valid amount'),
                                      backgroundColor: Color(0xFFEF4444),
                                    ),
                                  );
                                  return;
                                }

                                setModalState(() => isSubmitting = true);
                                final payload = {
                                  'amount': amount,
                                  'member': selectedMemberId,
                                  'ledger_account': selectedLedgerId,
                                  'service_type': selectedService,
                                  'date': dateStr,
                                  'status': 'Completed',
                                };
                                final ok =
                                    await ApiService.createDonation(payload);
                                setModalState(() => isSubmitting = false);
                                if (ok) {
                                  nav.pop();
                                  messenger.showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                          'Contribution recorded successfully!'),
                                      backgroundColor: Color(0xFF10B981),
                                    ),
                                  );
                                  _fetchDonations();
                                } else {
                                  messenger.showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                          'Failed to record contribution. Check permissions.'),
                                      backgroundColor: Color(0xFFEF4444),
                                    ),
                                  );
                                }
                              },
                        child: isSubmitting
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                'Record Contribution',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = MamsColors.of(context);
    double total = _donations.fold(
      0,
      (sum, item) =>
          sum + (double.tryParse(item['amount']?.toString() ?? '0') ?? 0),
    );

    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        title: Text(
          _canRecord ? 'Treasury & Contributions' : 'My Contributions',
          style: TextStyle(
            color: colors.textPrimary,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),
        backgroundColor: colors.cardSurface,
        foregroundColor: colors.textPrimary,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: colors.cardBorder),
        ),
      ),
      floatingActionButton: _canRecord
          ? FloatingActionButton.extended(
              backgroundColor: colors.primaryNavy,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add_rounded),
              label: const Text(
                'Record Contribution',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
              onPressed: _openRecordContributionSheet,
            )
          : null,
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: colors.primaryNavy))
          : RefreshIndicator(
              color: colors.primaryNavy,
              onRefresh: _fetchDonations,
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.all(16),
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      color: colors.cardSurface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: colors.cardBorder),
                    ),
                    child: Column(
                      children: [
                        Text(
                          _canRecord
                              ? 'TOTAL RECORDED CONTRIBUTIONS'
                              : 'TOTAL CONTRIBUTIONS RECORDED',
                          style: TextStyle(
                            color: colors.textSecondary,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'K ${total.toStringAsFixed(2)}',
                          style: TextStyle(
                            fontSize: 30,
                            fontWeight: FontWeight.w800,
                            color: colors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: _donations.isEmpty
                        ? Center(
                            child: Text(
                              'No contribution records yet',
                              style: TextStyle(
                                color: colors.textSecondary,
                                fontSize: 14.5,
                              ),
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: _donations.length,
                            separatorBuilder: (_, _) =>
                                const SizedBox(height: 10),
                            itemBuilder: (context, index) {
                              final item = _donations[index];
                              final amountVal =
                                  double.tryParse(
                                    item['amount']?.toString() ?? '0',
                                  ) ??
                                  0;
                              final memberName = item['member_name'] != null
                                  ? ' • ${item['member_name']}'
                                  : '';
                              final service = item['service_type'] ?? '';

                              return Container(
                                decoration: BoxDecoration(
                                  color: colors.cardSurface,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: colors.cardBorder),
                                ),
                                child: ListTile(
                                  leading: CircleAvatar(
                                    backgroundColor: colors.successBg,
                                    child: Icon(
                                      Icons.check_rounded,
                                      color: colors.successGreen,
                                    ),
                                  ),
                                  title: Text(
                                    'K ${amountVal.toStringAsFixed(2)}',
                                    style: TextStyle(
                                      color: colors.textPrimary,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  subtitle: Text(
                                    '${item['date'] ?? ''}$memberName${service.toString().isNotEmpty ? ' • $service' : ''}',
                                    style: TextStyle(
                                      color: colors.textSecondary,
                                    ),
                                  ),
                                  trailing: Text(
                                    (item['status'] ?? 'Completed').toString(),
                                    style: TextStyle(
                                      color: colors.successGreen,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12.5,
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
    );
  }
}
