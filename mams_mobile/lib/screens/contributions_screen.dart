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
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchDonations();
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
          'My Contributions',
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
                          'TOTAL CONTRIBUTIONS RECORDED',
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
                                    (item['date'] ?? '').toString(),
                                    style: TextStyle(
                                      color: colors.textSecondary,
                                    ),
                                  ),
                                  trailing: Text(
                                    (item['status'] ?? 'Recorded').toString(),
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
