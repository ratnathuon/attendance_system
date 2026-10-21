import 'package:flutter/material.dart';
import 'app_theme.dart';

/// Frosted-glass card decoration. Translucent in light mode; unchanged
/// (solid white / original border) in dark mode.
BoxDecoration glassDecoration(
  BuildContext context, {
  double radius = 18,
  Color? borderColor,
}) {
  final light = Theme.of(context).brightness == Brightness.light;
  if (!light) {
    return BoxDecoration(
      color: AppTheme.surface,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: borderColor ?? AppTheme.surfaceCard, width: 1.2),
    );
  }
  return BoxDecoration(
    gradient: LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [
        Colors.white.withValues(alpha: 0.75),
        Colors.white.withValues(alpha: 0.35),
      ],
    ),
    borderRadius: BorderRadius.circular(radius),
    border: Border.all(
      color: borderColor?.withValues(alpha: 0.6) ?? Colors.white.withValues(alpha: 0.9),
      width: 1.2,
    ),
    boxShadow: [
      BoxShadow(
        color: AppTheme.primary.withValues(alpha: 0.10),
        blurRadius: 24,
        offset: const Offset(0, 8),
      ),
    ],
  );
}

/// Soft pastel gradient with blurred color blobs, shown behind every screen
/// in light mode so the glass cards have something to refract.
class GlassBackground extends StatelessWidget {
  final Widget child;
  const GlassBackground({super.key, required this.child});

  Widget _blob(Color c, double size) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(colors: [
            c.withValues(alpha: 0.55),
            c.withValues(alpha: 0.0),
          ]),
        ),
      );

  @override
  Widget build(BuildContext context) {
    if (Theme.of(context).brightness != Brightness.light) return child;
    return Stack(
      fit: StackFit.expand,
      children: [
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFFEEF2FF), Color(0xFFF5F3FF), Color(0xFFE0F2FE)],
            ),
          ),
        ),
        Positioned(top: -80, left: -60, child: _blob(const Color(0xFF818CF8), 300)),
        Positioned(top: 220, right: -120, child: _blob(const Color(0xFFC4B5FD), 320)),
        Positioned(bottom: -100, left: -40, child: _blob(const Color(0xFF7DD3FC), 300)),
        child,
      ],
    );
  }
}
