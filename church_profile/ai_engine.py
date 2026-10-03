import os
import re
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from members.models import Member
from attendance.models import AttendanceSession, AttendanceRecord
from finances.models import Donation


def _linear_forecast(values):
    """
    Compute next-step prediction and percentage trend using weighted linear regression
    combined with exponential smoothing over a sequence of numeric values.
    """
    clean = [float(v) for v in values if v is not None]
    n = len(clean)
    if n == 0:
        return 0.0, 0.0
    if n == 1:
        return round(clean[0], 1), 0.0

    # Ordinary least squares slope & intercept over x = 0..n-1
    x_mean = (n - 1) / 2.0
    y_mean = sum(clean) / n
    num = sum((i - x_mean) * (clean[i] - y_mean) for i in range(n))
    den = sum((i - x_mean) ** 2 for i in range(n))
    slope = num / den if den != 0 else 0.0
    intercept = y_mean - slope * x_mean

    ols_next = intercept + slope * n

    # Exponential smoothing (alpha = 0.6) to weight recent observations higher
    alpha = 0.6
    smoothed = clean[0]
    for val in clean[1:]:
        smoothed = alpha * val + (1 - alpha) * smoothed

    predicted = max(0.0, 0.55 * ols_next + 0.45 * (smoothed + slope))
    baseline = y_mean if y_mean > 0 else (clean[-1] if clean[-1] > 0 else 1.0)
    growth_pct = ((predicted - baseline) / baseline) * 100.0
    growth_pct = max(-95.0, min(250.0, growth_pct))
    return round(predicted, 2), round(growth_pct, 1)


def compute_ai_insights(org, request=None):
    """
    Compute AI Member Engagement & Absence Risk Scoring + AI Attendance & Financial Forecasting
    for the given Organization.
    """
    if not org:
        return {}

    is_pta = getattr(org, 'org_type', 'CHURCH') == 'PTA'
    session_word = 'meetings' if is_pta else 'services'
    leader_word = 'Class/PTA Leader' if is_pta else 'Section/Zone Leader'

    active_members = list(
        Member.objects.filter(organization=org, status='active')
        .select_related('section', 'zone', 'user')
        .order_by('first_name', 'last_name')
    )
    total_active = len(active_members)

    # Recent attendance sessions (up to last 6 sessions)
    recent_sessions = list(
        AttendanceSession.objects.filter(organization=org)
        .annotate(attendee_count=Count('records'))
        .order_by('-date', '-id')[:6]
    )
    total_recent_sessions = len(recent_sessions)
    session_ids = [s.id for s in recent_sessions]

    # Map member_id -> set of attended session_ids
    attended_map = {m.id: set() for m in active_members}
    if session_ids:
        records = AttendanceRecord.objects.filter(
            session_id__in=session_ids,
            member__organization=org,
        ).values_list('member_id', 'session_id')
        for m_id, s_id in records:
            if m_id in attended_map:
                attended_map[m_id].add(s_id)

    engaged_count = 0
    at_risk_count = 0
    inactive_count = 0
    member_scores = []

    for m in active_members:
        attended_set = attended_map.get(m.id, set())
        attended_recent = len(attended_set)

        # Count consecutive missed sessions starting from most recent session
        consecutive_missed = 0
        for s in recent_sessions:
            if s.id not in attended_set:
                consecutive_missed += 1
            else:
                break

        if total_recent_sessions == 0:
            score = 85
            risk_status = 'active'
            risk_label = 'Active'
            engaged_count += 1
            recommendation = f'Active member — no {session_word} recorded yet.'
        else:
            attendance_ratio = attended_recent / float(total_recent_sessions)
            penalty = min(45, consecutive_missed * 15)
            score = int(round(max(5, min(100, attendance_ratio * 100 - penalty + 15))))

            if consecutive_missed >= 3 or (total_recent_sessions >= 2 and attended_recent == 0):
                risk_status = 'inactive'
                risk_label = 'High Risk (Follow-Up)'
                inactive_count += 1
                missed_count_display = max(consecutive_missed, total_recent_sessions)
                recommendation = (
                    f"Missed last {missed_count_display} consecutive {session_word}. "
                    f"Recommend {leader_word} follow-up call."
                )
            elif consecutive_missed == 2 or attendance_ratio < 0.5:
                risk_status = 'at_risk'
                risk_label = 'At Risk'
                at_risk_count += 1
                recommendation = (
                    f"Missed {consecutive_missed} recent {session_word} ({attended_recent}/{total_recent_sessions} attended). "
                    f"Send warm check-in message."
                )
            else:
                risk_status = 'active'
                risk_label = 'Engaged'
                engaged_count += 1
                recommendation = (
                    f"Consistent attendance ({attended_recent}/{total_recent_sessions} recent {session_word})."
                )

        pic_url = None
        pic_rel = None
        if m.profile_picture:
            pic_rel = m.profile_picture.url
            pic_url = request.build_absolute_uri(pic_rel) if request else pic_rel

        full_name = f"{m.first_name or ''} {m.last_name or ''}".strip()
        if not full_name:
            full_name = m.user.username if m.user else f"Member #{m.id}"

        member_scores.append({
            'id': m.id,
            'full_name': full_name,
            'role': m.role or 'member',
            'section_name': m.section.name if m.section else 'Unassigned Section',
            'zone_name': m.zone.name if m.zone else 'Unassigned Zone',
            'phone_number': m.phone_number or '',
            'email': m.email or '',
            'profile_picture': pic_url,
            'profile_picture_relative': pic_rel,
            'engagement_score': score,
            'risk_status': risk_status,
            'risk_label': risk_label,
            'consecutive_missed': consecutive_missed,
            'attended_recent': attended_recent,
            'total_recent_sessions': total_recent_sessions,
            'recommendation': recommendation,
        })

    # Sort: highest risk (lowest engagement score / highest consecutive missed) first
    risk_priority = {'inactive': 0, 'at_risk': 1, 'active': 2}
    member_scores.sort(
        key=lambda x: (
            risk_priority.get(x['risk_status'], 3),
            -x['consecutive_missed'],
            x['engagement_score'],
        )
    )

    # AI Attendance Forecasting (over last 8 sessions in chronological order)
    chronological_sessions = list(reversed(recent_sessions))
    session_counts = [s.attendee_count for s in chronological_sessions]
    if session_counts:
        pred_att, att_growth = _linear_forecast(session_counts)
        predicted_next_attendance = max(1, int(round(pred_att)))
        if total_active > 0:
            predicted_next_attendance = min(total_active, predicted_next_attendance)
    else:
        predicted_next_attendance = max(1, int(round(total_active * 0.75))) if total_active > 0 else 0
        att_growth = 0.0

    # AI Financial Forecasting (over last 6 months of completed donations)
    one_year_ago = timezone.now() - timedelta(days=365)
    from django.db.models.functions import TruncMonth
    monthly_donations = list(
        Donation.objects.filter(
            organization=org,
            status='COMPLETED',
            date__gte=one_year_ago,
        )
        .annotate(month=TruncMonth('date'))
        .values('month')
        .annotate(total=Sum('amount'))
        .order_by('month')
    )
    monthly_totals = [float(d['total'] or 0) for d in monthly_donations if d['month']]
    if not monthly_totals:
        all_completed = Donation.objects.filter(
            organization=org,
            status='COMPLETED',
        ).aggregate(total=Sum('amount'))['total']
        if all_completed:
            monthly_totals = [float(all_completed)]

    pred_fin, fin_growth = _linear_forecast(monthly_totals)

    overall_engagement_rate = (
        round((engaged_count / float(total_active)) * 100.0, 1)
        if total_active > 0
        else 100.0
    )

    if inactive_count > 0 or at_risk_count > 0:
        engagement_summary = (
            f"AI detected {inactive_count} High-Risk and {at_risk_count} At-Risk member(s) "
            f"across {total_recent_sessions} recent {session_word}. "
            f"Prioritize pastoral/leader outreach to boost retention."
        )
    else:
        engagement_summary = (
            f"Strong member retention! {engaged_count} of {total_active} active members "
            f"maintain consistent attendance across recent {session_word}."
        )

    return {
        'total_active_members': total_active,
        'total_recent_sessions': total_recent_sessions,
        'engaged_count': engaged_count,
        'at_risk_count': at_risk_count,
        'inactive_count': inactive_count,
        'overall_engagement_rate': overall_engagement_rate,
        'engagement_summary': engagement_summary,
        'predicted_next_attendance': predicted_next_attendance,
        'attendance_growth_pct': att_growth,
        'predicted_next_month_contributions': round(pred_fin, 2),
        'financial_growth_pct': fin_growth,
        'member_risk_list': member_scores[:15],
    }


class AIDraftMessageAPIView(APIView):
    """
    POST /api/ai/draft-message/
    Turns brief notes or a topic into a complete, professional Church or School PTA
    announcement or email (Title + Content).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = getattr(request.user, 'member_profile', None)
        org = profile.organization if profile else None
        org_name = org.name if org else 'Our Organization'
        is_pta = getattr(org, 'org_type', 'CHURCH') == 'PTA'

        prompt = (request.data.get('prompt') or request.data.get('topic') or '').strip()
        tone = (request.data.get('tone') or 'warm').strip().lower()
        audience = (request.data.get('audience') or 'all').strip().lower()
        msg_type = (request.data.get('message_type') or 'announcement').strip().lower()

        if not prompt:
            prompt = (
                'Upcoming PTA General Meeting and School Updates'
                if is_pta
                else 'Upcoming Sunday Service and Fellowship Updates'
            )

        # Clean capitalised subject extraction
        first_line = prompt.split('\n')[0].strip().rstrip('.')
        if len(first_line) > 58:
            short_topic = first_line[:55].rsplit(' ', 1)[0] + '...'
        else:
            short_topic = first_line.title() if first_line.islower() else first_line

        audience_greeting = {
            'all': f"Dear {org_name} Parents, Guardians & Staff," if is_pta else f"Dear {org_name} Family & Brethren,",
            'members': f"Dear Parents & Guardians of {org_name}," if is_pta else f"Dear Beloved Members of {org_name},",
            'leaders': f"Dear {org_name} Teachers & Committee Leaders," if is_pta else f"Dear {org_name} Church Leaders & Elders,",
            'section_admins': f"Dear Grade & Class Representatives," if is_pta else f"Dear Section Leaders,",
            'zone_admins': f"Dear Department Heads," if is_pta else f"Dear Zone Leaders,",
            'pta': f"Dear {org_name} PTA Executive & Officials,",
        }.get(audience, f"Dear {org_name} Community,")

        # Detect key themes from the prompt for tailored structure
        lower_p = prompt.lower()
        is_urgent = tone == 'urgent' or any(w in lower_p for w in ['urgent', 'emergency', 'funeral', 'bereavement', 'moved', 'cancelled', 'postponed', 'important'])
        is_financial = any(w in lower_p for w in ['tithe', 'offering', 'pledge', 'fee', 'contribution', 'fundraiser', 'donation', 'kwacha', 'zmw', 'project'])
        is_meeting = any(w in lower_p for w in ['meeting', 'service', 'rehearsal', 'practice', 'choir', 'youth', 'fellowship', 'conference', 'prayer', 'agm'])

        if is_urgent:
            title = f"Important Notice: {short_topic}"
        elif is_financial:
            title = f"{org_name} Contribution & Stewardship Update: {short_topic}"
        elif is_meeting:
            title = f"Upcoming Schedule: {short_topic}"
        else:
            title = f"{org_name} Announcement: {short_topic}"

        if tone == 'formal':
            opening = (
                f"On behalf of the leadership of {org_name}, please take note of the following official communication regarding:"
            )
            closing = (
                f"We kindly request all concerned members to take note and plan accordingly. "
                f"For any inquiries, please contact your {'Class Representative' if is_pta else 'Section or Zone Leader'}.\n\n"
                f"Yours faithfully,\n{org_name} Administration"
            )
        elif is_urgent:
            opening = (
                f"Please take urgent note of this important update for the {org_name} community:"
            )
            closing = (
                f"Kindly share this notice with fellow {'parents' if is_pta else 'section and zone members'} who may be affected. "
                f"Thank you for your prompt cooperation.\n\n"
                f"Warm regards,\n{org_name} Leadership"
            )
        else:
            opening = (
                f"We hope this message finds you well! Please take note of the following update for our {org_name} community:"
            )
            closing = (
                f"Your active participation and support continue to strengthen {org_name}. "
                f"{'Thank you for partnering with us in your child’s education!' if is_pta else 'May God richly bless you and your family!'}\n\n"
                f"Warm regards,\n{org_name} Leadership Team"
            )

        bullet_lines = [line.strip(' •-*') for line in re.split(r'[\n;]+', prompt) if line.strip()]
        if len(bullet_lines) > 1:
            formatted_details = "\n".join(f"• {b[0].upper() + b[1:] if b else b}" for b in bullet_lines)
        else:
            cleaned = prompt[0].upper() + prompt[1:] if prompt else prompt
            if not cleaned.endswith(('.', '!', '?')):
                cleaned += '.'
            formatted_details = f"• {cleaned}"
            if is_meeting:
                formatted_details += (
                    f"\n• Please remember to check in using your MAMS Attendance QR Pass upon arrival."
                )
            elif is_financial:
                formatted_details += (
                    f"\n• Contributions can be recorded and tracked directly under the Contributions section in the MAMS portal."
                )

        content = (
            f"{audience_greeting}\n\n"
            f"{opening}\n\n"
            f"{formatted_details}\n\n"
            f"{closing}"
        )

        return Response({
            'title': title,
            'subject': title,
            'content': content,
            'body': content,
            'message_type': msg_type,
        })
